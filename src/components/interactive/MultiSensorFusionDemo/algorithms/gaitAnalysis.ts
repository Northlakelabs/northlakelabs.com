/**
 * Gait Analysis Utilities
 * Calculates clinically relevant gait parameters from detected events
 */

import type { DetectedEvent } from './utils';
import type { DemoData } from '../../../../utils/types';
import { ForceAnalyzer, type ForceMetrics } from './forceAnalysis';

export interface GaitCycle {
  leg: 'left' | 'right';
  heelStrike: number;
  toeOff: number;
  nextHeelStrike?: number;
  stanceTime?: number;
  swingTime?: number;
  strideTime?: number;
  stepLength?: number;
}

export interface GaitMetrics {
  // Temporal parameters
  avgStanceTime: { left: number; right: number };
  avgSwingTime: { left: number; right: number };
  avgStrideTime: { left: number; right: number };
  avgStepTime: { left: number; right: number };
  
  // Frequency parameters
  cadence: number; // steps per minute
  strideFrequency: { left: number; right: number }; // strides per minute
  
  // Asymmetry measures
  stanceTimeAsymmetry: number; // percentage difference
  swingTimeAsymmetry: number;
  strideTimeAsymmetry: number;
  
  // Clinical indicators
  doubleSupportTime: number;
  singleSupportTime: { left: number; right: number };
  gaitCycleTime: number;
  
  // Variability measures
  strideTimeCV: { left: number; right: number }; // coefficient of variation
  stanceTimeCV: { left: number; right: number };
  
  // Summary statistics
  totalStrides: { left: number; right: number };
  totalSteps: number;
  walkingSpeed?: number; // if distance is known
  
  // Force analysis metrics
  forceMetrics?: ForceMetrics;
}

export class GaitAnalyzer {
  /**
   * Analyzes gait events to extract clinical metrics
   */
  static analyzeGait(events: DetectedEvent[], duration: number, demoData?: DemoData): GaitMetrics {
    // Sort events by time
    const sortedEvents = [...events].sort((a, b) => a.time - b.time);
    
    // Separate by leg and type
    const leftHeelStrikes = sortedEvents.filter(e => e.type === 'heel_strike' && e.leg === 'left');
    const rightHeelStrikes = sortedEvents.filter(e => e.type === 'heel_strike' && e.leg === 'right');
    const leftToeOffs = sortedEvents.filter(e => e.type === 'toe_off' && e.leg === 'left');
    const rightToeOffs = sortedEvents.filter(e => e.type === 'toe_off' && e.leg === 'right');
    
    // Calculate gait cycles
    const leftCycles = this.extractGaitCycles(leftHeelStrikes, leftToeOffs, rightHeelStrikes, 'left');
    const rightCycles = this.extractGaitCycles(rightHeelStrikes, rightToeOffs, leftHeelStrikes, 'right');
    
    // Calculate temporal parameters
    const leftStanceTimes = leftCycles.map(c => c.stanceTime).filter(t => t !== undefined) as number[];
    const rightStanceTimes = rightCycles.map(c => c.stanceTime).filter(t => t !== undefined) as number[];
    const leftSwingTimes = leftCycles.map(c => c.swingTime).filter(t => t !== undefined) as number[];
    const rightSwingTimes = rightCycles.map(c => c.swingTime).filter(t => t !== undefined) as number[];
    const leftStrideTimes = leftCycles.map(c => c.strideTime).filter(t => t !== undefined) as number[];
    const rightStrideTimes = rightCycles.map(c => c.strideTime).filter(t => t !== undefined) as number[];
    
    // Calculate step times (left heel strike to right heel strike and vice versa)
    const leftStepTimes = this.calculateStepTimes(leftHeelStrikes, rightHeelStrikes);
    const rightStepTimes = this.calculateStepTimes(rightHeelStrikes, leftHeelStrikes);
    
    // Calculate averages
    const avgStanceTime = {
      left: this.mean(leftStanceTimes),
      right: this.mean(rightStanceTimes)
    };
    
    const avgSwingTime = {
      left: this.mean(leftSwingTimes),
      right: this.mean(rightSwingTimes)
    };
    
    const avgStrideTime = {
      left: this.mean(leftStrideTimes),
      right: this.mean(rightStrideTimes)
    };
    
    const avgStepTime = {
      left: this.mean(leftStepTimes),
      right: this.mean(rightStepTimes)
    };
    
    // Calculate frequency parameters
    const totalSteps = leftHeelStrikes.length + rightHeelStrikes.length;
    const cadence = totalSteps > 0 ? (totalSteps / duration) * 60 : 0; // steps per minute
    
    const strideFrequency = {
      left: leftStrideTimes.length > 0 ? (leftStrideTimes.length / duration) * 60 : 0,
      right: rightStrideTimes.length > 0 ? (rightStrideTimes.length / duration) * 60 : 0
    };
    
    // Calculate asymmetry measures (percentage difference)
    const stanceTimeAsymmetry = this.calculateAsymmetry(avgStanceTime.left, avgStanceTime.right);
    const swingTimeAsymmetry = this.calculateAsymmetry(avgSwingTime.left, avgSwingTime.right);
    const strideTimeAsymmetry = this.calculateAsymmetry(avgStrideTime.left, avgStrideTime.right);
    
    // Calculate variability (coefficient of variation)
    const strideTimeCV = {
      left: this.coefficientOfVariation(leftStrideTimes),
      right: this.coefficientOfVariation(rightStrideTimes)
    };
    
    const stanceTimeCV = {
      left: this.coefficientOfVariation(leftStanceTimes),
      right: this.coefficientOfVariation(rightStanceTimes)
    };
    
    // Calculate support times
    const gaitCycleTime = this.mean([...leftStrideTimes, ...rightStrideTimes]);
    const doubleSupportTime = this.calculateDoubleSupportTime(leftCycles, rightCycles);
    const singleSupportTime = {
      left: this.mean(leftSwingTimes),
      right: this.mean(rightSwingTimes)
    };
    
    // Calculate force metrics if demo data is available
    let forceMetrics: ForceMetrics | undefined;
    if (demoData) {
      try {
        forceMetrics = ForceAnalyzer.analyzeForces(demoData, events);
      } catch (error) {
        console.warn('Failed to calculate force metrics:', error);
        forceMetrics = undefined;
      }
    }
    
    return {
      avgStanceTime,
      avgSwingTime,
      avgStrideTime,
      avgStepTime,
      cadence,
      strideFrequency,
      stanceTimeAsymmetry,
      swingTimeAsymmetry,
      strideTimeAsymmetry,
      doubleSupportTime,
      singleSupportTime,
      gaitCycleTime,
      strideTimeCV,
      stanceTimeCV,
      totalStrides: {
        left: leftStrideTimes.length,
        right: rightStrideTimes.length
      },
      totalSteps,
      forceMetrics
    };
  }
  
  private static extractGaitCycles(
    heelStrikes: DetectedEvent[], 
    toeOffs: DetectedEvent[], 
    oppositeHeelStrikes: DetectedEvent[],
    leg: 'left' | 'right'
  ): GaitCycle[] {
    const cycles: GaitCycle[] = [];
    
    for (let i = 0; i < heelStrikes.length; i++) {
      const heelStrike = heelStrikes[i];
      const nextHeelStrike = heelStrikes[i + 1];
      
      // Find corresponding toe off
      const toeOff = toeOffs.find(to => 
        to.time > heelStrike.time && 
        (!nextHeelStrike || to.time < nextHeelStrike.time)
      );
      
      if (toeOff) {
        const cycle: GaitCycle = {
          leg,
          heelStrike: heelStrike.time,
          toeOff: toeOff.time,
          nextHeelStrike: nextHeelStrike?.time,
          stanceTime: toeOff.time - heelStrike.time
        };
        
        if (nextHeelStrike) {
          cycle.strideTime = nextHeelStrike.time - heelStrike.time;
          cycle.swingTime = nextHeelStrike.time - toeOff.time;
        }
        
        cycles.push(cycle);
      }
    }
    
    return cycles;
  }
  
  private static calculateStepTimes(
    heelStrikes1: DetectedEvent[], 
    heelStrikes2: DetectedEvent[]
  ): number[] {
    const stepTimes: number[] = [];
    
    for (const hs1 of heelStrikes1) {
      // Find next heel strike from opposite leg
      const nextOpposite = heelStrikes2.find(hs2 => hs2.time > hs1.time);
      if (nextOpposite) {
        stepTimes.push(nextOpposite.time - hs1.time);
      }
    }
    
    return stepTimes;
  }
  
  private static calculateDoubleSupportTime(
    leftCycles: GaitCycle[], 
    rightCycles: GaitCycle[]
  ): number {
    // Simplified calculation - could be more sophisticated
    // Double support occurs when both feet are on ground
    return 0; // Placeholder - would need more complex temporal analysis
  }
  
  private static mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }
  
  private static calculateAsymmetry(left: number, right: number): number {
    if (left === 0 && right === 0) return 0;
    return Math.abs(left - right) / ((left + right) / 2) * 100;
  }
  
  private static coefficientOfVariation(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = this.mean(values);
    if (mean === 0) return 0;
    
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (values.length - 1);
    const stdDev = Math.sqrt(variance);
    
    return (stdDev / mean) * 100;
  }
}