/**
 * Force Analysis Module
 * Comprehensive biomechanical force analysis for constrained gait patterns
 * Calculates force metrics that reveal compensatory patterns and asymmetries
 */

import type { DemoData } from '../../../../utils/types';
import type { DetectedEvent } from './utils';

export interface ForceMetrics {
  // Peak force analysis
  peakForces: {
    left: number;      // Maximum force during stance (N)
    right: number;     // Maximum force during stance (N)
    asymmetry: number; // Percentage difference
  };
  
  // Average loading
  avgStanceForce: {
    left: number;      // Average force during stance phase (N)
    right: number;     // Average force during stance phase (N)
    asymmetry: number; // Percentage difference
  };
  
  // Loading characteristics
  loadingRates: {
    left: number;      // Average loading rate (N/s)
    right: number;     // Average loading rate (N/s)
    asymmetry: number; // Percentage difference
  };
  
  // Unloading characteristics
  unloadingRates: {
    left: number;      // Average unloading rate (N/s)
    right: number;     // Average unloading rate (N/s)
    asymmetry: number; // Percentage difference
  };
  
  // Force-time integration
  impulse: {
    left: number;      // Force impulse during stance (N⋅s)
    right: number;     // Force impulse during stance (N⋅s)
    asymmetry: number; // Percentage difference
  };
  
  // Work approximation
  workDone: {
    left: number;      // Approximate work done (N⋅s, proportional to energy)
    right: number;     // Approximate work done (N⋅s, proportional to energy)
    asymmetry: number; // Percentage difference
    leftPercentage: number;  // Left leg contribution (%)
    rightPercentage: number; // Right leg contribution (%)
  };
  
  // Weight distribution
  weightDistribution: {
    leftPercentage: number;  // Percentage of total weight on left leg
    rightPercentage: number; // Percentage of total weight on right leg
    asymmetryIndex: number;  // Clinical asymmetry index
  };
  
  // Force variability
  forceVariability: {
    left: number;      // Coefficient of variation for peak forces (%)
    right: number;     // Coefficient of variation for peak forces (%)
  };
  
  // Clinical indicators
  clinicalIndicators: {
    forceAsymmetryIndex: number;     // Overall force asymmetry (0-100)
    compensatoryPattern: 'mild' | 'moderate' | 'severe';
    constraintImpact: 'low' | 'medium' | 'high';
  };
}

export interface StancePhase {
  leg: 'left' | 'right';
  startTime: number;
  endTime: number;
  duration: number;
  startIndex: number;
  endIndex: number;
  forces: number[];
  peakForce: number;
  avgForce: number;
  loadingRate: number;
  unloadingRate: number;
  impulse: number;
}

export class ForceAnalyzer {
  /**
   * Analyzes force data from detected gait events
   */
  static analyzeForces(data: DemoData, events: DetectedEvent[]): ForceMetrics {
    console.log('🔬 ForceAnalyzer.analyzeForces - Input:', {
      eventsCount: events.length,
      dataKeys: Object.keys(data),
      hasForceData: !!(data.force_plates),
      forcePlateKeys: data.force_plates ? Object.keys(data.force_plates) : []
    });
    
    // Extract stance phases from events
    const stancePhases = this.extractStancePhases(data, events);
    
    console.log('🔬 ForceAnalyzer.analyzeForces - Stance phases:', {
      stancePhasesCount: stancePhases.length,
      leftStances: stancePhases.filter(s => s.leg === 'left').length,
      rightStances: stancePhases.filter(s => s.leg === 'right').length
    });
    
    // Separate left and right stance phases
    const leftStances = stancePhases.filter(phase => phase.leg === 'left');
    const rightStances = stancePhases.filter(phase => phase.leg === 'right');
    
    // Calculate force metrics
    const peakForces = this.calculatePeakForces(leftStances, rightStances);
    const avgStanceForce = this.calculateAvgStanceForces(leftStances, rightStances);
    const loadingRates = this.calculateLoadingRates(leftStances, rightStances);
    const unloadingRates = this.calculateUnloadingRates(leftStances, rightStances);
    const impulse = this.calculateImpulse(leftStances, rightStances);
    const workDone = this.calculateWorkDone(leftStances, rightStances);
    const weightDistribution = this.calculateWeightDistribution(leftStances, rightStances);
    const forceVariability = this.calculateForceVariability(leftStances, rightStances);
    const clinicalIndicators = this.calculateClinicalIndicators(peakForces, avgStanceForce, impulse);
    
    return {
      peakForces,
      avgStanceForce,
      loadingRates,
      unloadingRates,
      impulse,
      workDone,
      weightDistribution,
      forceVariability,
      clinicalIndicators
    };
  }
  
  /**
   * Extract stance phases from gait events and force data
   */
  private static extractStancePhases(data: DemoData, events: DetectedEvent[]): StancePhase[] {
    const stancePhases: StancePhase[] = [];
    const sampleRate = data.metadata.sampling_rate;
    
    // Sort events by time
    const sortedEvents = [...events].sort((a, b) => a.time - b.time);
    
    // Group heel strikes and toe offs by leg
    const leftHeelStrikes = sortedEvents.filter(e => e.type === 'heel_strike' && e.leg === 'left');
    const leftToeOffs = sortedEvents.filter(e => e.type === 'toe_off' && e.leg === 'left');
    const rightHeelStrikes = sortedEvents.filter(e => e.type === 'heel_strike' && e.leg === 'right');
    const rightToeOffs = sortedEvents.filter(e => e.type === 'toe_off' && e.leg === 'right');
    
    // Process left leg stance phases
    stancePhases.push(...this.extractLegStancePhases(
      leftHeelStrikes, leftToeOffs, data.force_plates.left_force_plate.fz, 
      data.timestamps, sampleRate, 'left'
    ));
    
    // Process right leg stance phases  
    stancePhases.push(...this.extractLegStancePhases(
      rightHeelStrikes, rightToeOffs, data.force_plates.right_force_plate.fz,
      data.timestamps, sampleRate, 'right'
    ));
    
    return stancePhases;
  }
  
  /**
   * Extract stance phases for a specific leg
   */
  private static extractLegStancePhases(
    heelStrikes: DetectedEvent[],
    toeOffs: DetectedEvent[],
    forceData: number[],
    timestamps: number[],
    sampleRate: number,
    leg: 'left' | 'right'
  ): StancePhase[] {
    const stancePhases: StancePhase[] = [];
    
    for (const heelStrike of heelStrikes) {
      // Find corresponding toe off
      const toeOff = toeOffs.find(to => 
        to.time > heelStrike.time && 
        to.time - heelStrike.time < 1.0 // Maximum 1 second stance
      );
      
      if (toeOff) {
        const startIndex = Math.round(heelStrike.time * sampleRate);
        const endIndex = Math.round(toeOff.time * sampleRate);
        
        // Extract force data for this stance phase
        const stanceForces = forceData.slice(startIndex, endIndex + 1);
        
        if (stanceForces.length > 0) {
          const phase: StancePhase = {
            leg,
            startTime: heelStrike.time,
            endTime: toeOff.time,
            duration: toeOff.time - heelStrike.time,
            startIndex,
            endIndex,
            forces: stanceForces,
            peakForce: Math.max(...stanceForces),
            avgForce: this.mean(stanceForces),
            loadingRate: this.calculatePhaseLoadingRate(stanceForces, sampleRate),
            unloadingRate: this.calculatePhaseUnloadingRate(stanceForces, sampleRate),
            impulse: this.calculatePhaseImpulse(stanceForces, sampleRate)
          };
          
          stancePhases.push(phase);
        }
      }
    }
    
    return stancePhases;
  }
  
  /**
   * Calculate peak forces and asymmetry
   */
  private static calculatePeakForces(leftStances: StancePhase[], rightStances: StancePhase[]) {
    const leftPeaks = leftStances.map(s => s.peakForce);
    const rightPeaks = rightStances.map(s => s.peakForce);
    
    const left = leftPeaks.length > 0 ? this.mean(leftPeaks) : 0;
    const right = rightPeaks.length > 0 ? this.mean(rightPeaks) : 0;
    const asymmetry = this.calculateAsymmetry(left, right);
    
    return { left, right, asymmetry };
  }
  
  /**
   * Calculate average stance forces and asymmetry
   */
  private static calculateAvgStanceForces(leftStances: StancePhase[], rightStances: StancePhase[]) {
    const leftAvgs = leftStances.map(s => s.avgForce);
    const rightAvgs = rightStances.map(s => s.avgForce);
    
    const left = leftAvgs.length > 0 ? this.mean(leftAvgs) : 0;
    const right = rightAvgs.length > 0 ? this.mean(rightAvgs) : 0;
    const asymmetry = this.calculateAsymmetry(left, right);
    
    return { left, right, asymmetry };
  }
  
  /**
   * Calculate loading rates and asymmetry
   */
  private static calculateLoadingRates(leftStances: StancePhase[], rightStances: StancePhase[]) {
    const leftRates = leftStances.map(s => s.loadingRate);
    const rightRates = rightStances.map(s => s.loadingRate);
    
    const left = leftRates.length > 0 ? this.mean(leftRates) : 0;
    const right = rightRates.length > 0 ? this.mean(rightRates) : 0;
    const asymmetry = this.calculateAsymmetry(left, right);
    
    return { left, right, asymmetry };
  }
  
  /**
   * Calculate unloading rates and asymmetry
   */
  private static calculateUnloadingRates(leftStances: StancePhase[], rightStances: StancePhase[]) {
    const leftRates = leftStances.map(s => s.unloadingRate);
    const rightRates = rightStances.map(s => s.unloadingRate);
    
    const left = leftRates.length > 0 ? this.mean(leftRates) : 0;
    const right = rightRates.length > 0 ? this.mean(rightRates) : 0;
    const asymmetry = this.calculateAsymmetry(left, right);
    
    return { left, right, asymmetry };
  }
  
  /**
   * Calculate impulse and asymmetry
   */
  private static calculateImpulse(leftStances: StancePhase[], rightStances: StancePhase[]) {
    const leftImpulses = leftStances.map(s => s.impulse);
    const rightImpulses = rightStances.map(s => s.impulse);
    
    const left = leftImpulses.length > 0 ? this.mean(leftImpulses) : 0;
    const right = rightImpulses.length > 0 ? this.mean(rightImpulses) : 0;
    const asymmetry = this.calculateAsymmetry(left, right);
    
    return { left, right, asymmetry };
  }
  
  /**
   * Calculate work done and weight distribution
   */
  private static calculateWorkDone(leftStances: StancePhase[], rightStances: StancePhase[]) {
    const leftWork = leftStances.reduce((sum, s) => sum + s.impulse, 0);
    const rightWork = rightStances.reduce((sum, s) => sum + s.impulse, 0);
    const totalWork = leftWork + rightWork;
    
    const leftPercentage = totalWork > 0 ? (leftWork / totalWork) * 100 : 0;
    const rightPercentage = totalWork > 0 ? (rightWork / totalWork) * 100 : 0;
    const asymmetry = this.calculateAsymmetry(leftWork, rightWork);
    
    return {
      left: leftWork,
      right: rightWork,
      asymmetry,
      leftPercentage,
      rightPercentage
    };
  }
  
  /**
   * Calculate weight distribution
   */
  private static calculateWeightDistribution(leftStances: StancePhase[], rightStances: StancePhase[]) {
    const leftAvgForce = leftStances.length > 0 ? this.mean(leftStances.map(s => s.avgForce)) : 0;
    const rightAvgForce = rightStances.length > 0 ? this.mean(rightStances.map(s => s.avgForce)) : 0;
    const totalAvgForce = leftAvgForce + rightAvgForce;
    
    const leftPercentage = totalAvgForce > 0 ? (leftAvgForce / totalAvgForce) * 100 : 0;
    const rightPercentage = totalAvgForce > 0 ? (rightAvgForce / totalAvgForce) * 100 : 0;
    const asymmetryIndex = Math.abs(leftPercentage - rightPercentage);
    
    return {
      leftPercentage,
      rightPercentage,
      asymmetryIndex
    };
  }
  
  /**
   * Calculate force variability
   */
  private static calculateForceVariability(leftStances: StancePhase[], rightStances: StancePhase[]) {
    const leftPeaks = leftStances.map(s => s.peakForce);
    const rightPeaks = rightStances.map(s => s.peakForce);
    
    const left = this.coefficientOfVariation(leftPeaks);
    const right = this.coefficientOfVariation(rightPeaks);
    
    return { left, right };
  }
  
  /**
   * Calculate clinical indicators
   */
  private static calculateClinicalIndicators(
    peakForces: any, 
    avgStanceForce: any, 
    impulse: any
  ) {
    const forceAsymmetryIndex = Math.max(peakForces.asymmetry, avgStanceForce.asymmetry);
    
    let compensatoryPattern: 'mild' | 'moderate' | 'severe';
    if (forceAsymmetryIndex < 20) compensatoryPattern = 'mild';
    else if (forceAsymmetryIndex < 40) compensatoryPattern = 'moderate';
    else compensatoryPattern = 'severe';
    
    let constraintImpact: 'low' | 'medium' | 'high';
    if (impulse.asymmetry < 25) constraintImpact = 'low';
    else if (impulse.asymmetry < 50) constraintImpact = 'medium';
    else constraintImpact = 'high';
    
    return {
      forceAsymmetryIndex,
      compensatoryPattern,
      constraintImpact
    };
  }
  
  // Utility functions for individual stance phase calculations
  private static calculatePhaseLoadingRate(forces: number[], sampleRate: number): number {
    if (forces.length < 2) return 0;
    
    const peakIndex = forces.indexOf(Math.max(...forces));
    const loadingPhase = forces.slice(0, peakIndex + 1);
    
    if (loadingPhase.length < 2) return 0;
    
    const deltaForce = Math.max(...loadingPhase) - loadingPhase[0];
    const deltaTime = (loadingPhase.length - 1) / sampleRate;
    
    return deltaTime > 0 ? deltaForce / deltaTime : 0;
  }
  
  private static calculatePhaseUnloadingRate(forces: number[], sampleRate: number): number {
    if (forces.length < 2) return 0;
    
    const peakIndex = forces.indexOf(Math.max(...forces));
    const unloadingPhase = forces.slice(peakIndex);
    
    if (unloadingPhase.length < 2) return 0;
    
    const deltaForce = unloadingPhase[0] - unloadingPhase[unloadingPhase.length - 1];
    const deltaTime = (unloadingPhase.length - 1) / sampleRate;
    
    return deltaTime > 0 ? deltaForce / deltaTime : 0;
  }
  
  private static calculatePhaseImpulse(forces: number[], sampleRate: number): number {
    if (forces.length === 0) return 0;
    
    // Trapezoidal integration: impulse = sum of forces * time_step
    const timeStep = 1 / sampleRate;
    return forces.reduce((sum, force) => sum + force * timeStep, 0);
  }
  
  // Statistical utility functions
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