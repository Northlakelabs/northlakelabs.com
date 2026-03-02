/**
 * Shared utilities for gait event detection algorithms
 * Used across traditional, basic fusion, and AI fusion implementations
 */

import type { GaitEvent, AccuracyMetrics } from '../../../utils/types';

export interface AlgorithmConfig {
  name: string;
  version: string;
  parameters: Record<string, any>;
}

export interface DetectedEvent {
  time: number;
  type: 'heel_strike' | 'toe_off';
  leg: 'left' | 'right';
  threshold_deviation: number;
  detection_method: string;
  algorithm_parameters?: Record<string, any>;
  force_magnitude?: number; // Force value at detection point (N)
}

/**
 * Calculate accuracy metrics by comparing detected events to ground truth
 * Uses time-window based matching with configurable tolerance
 */
export function calculateAccuracy(
  detectedEvents: DetectedEvent[],
  groundTruthEvents: GaitEvent[],
  timeToleranceMs: number = 100
): AccuracyMetrics {
  const tolerance = timeToleranceMs / 1000; // Convert to seconds
  
  let truePositives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;
  
  // Match detected events to ground truth
  const matchedGroundTruth = new Set<number>();
  
  for (const detected of detectedEvents) {
    let matched = false;
    
    for (let i = 0; i < groundTruthEvents.length; i++) {
      const groundTruth = groundTruthEvents[i];
      
      // Skip if already matched
      if (matchedGroundTruth.has(i)) continue;
      
      // Check if events match within tolerance
      if (
        Math.abs(detected.time - groundTruth.time) <= tolerance &&
        detected.type === groundTruth.type &&
        detected.leg === groundTruth.leg
      ) {
        truePositives++;
        matchedGroundTruth.add(i);
        matched = true;
        break;
      }
    }
    
    if (!matched) {
      falsePositives++;
    }
  }
  
  // Count unmatched ground truth events as false negatives
  falseNegatives = groundTruthEvents.length - matchedGroundTruth.size;
  
  // Calculate metrics
  const precision = truePositives > 0 ? truePositives / (truePositives + falsePositives) : 0;
  const recall = truePositives > 0 ? truePositives / (truePositives + falseNegatives) : 0;
  const f1Score = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;
  
  return {
    precision,
    recall,
    f1_score: f1Score,
    true_positives: truePositives,
    false_positives: falsePositives,
    false_negatives: falseNegatives
  };
}

/**
 * Apply moving average filter to reduce noise
 */
export function movingAverage(data: number[], windowSize: number): number[] {
  const result: number[] = [];
  const halfWindow = Math.floor(windowSize / 2);
  
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - halfWindow);
    const end = Math.min(data.length, i + halfWindow + 1);
    
    let sum = 0;
    let count = 0;
    
    for (let j = start; j < end; j++) {
      sum += data[j];
      count++;
    }
    
    result.push(sum / count);
  }
  
  return result;
}

/**
 * Find peaks in signal above threshold
 */
export function findPeaks(
  data: number[], 
  threshold: number, 
  minDistance: number = 10
): number[] {
  const peaks: number[] = [];
  
  for (let i = 1; i < data.length - 1; i++) {
    if (data[i] > threshold && 
        data[i] > data[i - 1] && 
        data[i] > data[i + 1]) {
      
      // Check minimum distance from last peak
      if (peaks.length === 0 || i - peaks[peaks.length - 1] >= minDistance) {
        peaks.push(i);
      }
    }
  }
  
  return peaks;
}

/**
 * Find valleys (negative peaks) in signal below threshold
 */
export function findValleys(
  data: number[], 
  threshold: number, 
  minDistance: number = 10
): number[] {
  const valleys: number[] = [];
  
  for (let i = 1; i < data.length - 1; i++) {
    if (data[i] < threshold && 
        data[i] < data[i - 1] && 
        data[i] < data[i + 1]) {
      
      // Check minimum distance from last valley
      if (valleys.length === 0 || i - valleys[valleys.length - 1] >= minDistance) {
        valleys.push(i);
      }
    }
  }
  
  return valleys;
}

/**
 * Calculate derivative (rate of change) of signal
 */
export function calculateDerivative(data: number[]): number[] {
  const derivative: number[] = [];
  
  for (let i = 0; i < data.length - 1; i++) {
    derivative.push(data[i + 1] - data[i]);
  }
  
  // Add last point to maintain array length
  derivative.push(derivative[derivative.length - 1]);
  
  return derivative;
}

/**
 * Calculate RMS (Root Mean Square) of signal segment
 */
export function calculateRMS(data: number[], startIdx: number, endIdx: number): number {
  let sumSquares = 0;
  let count = 0;
  
  for (let i = startIdx; i < endIdx && i < data.length; i++) {
    sumSquares += data[i] * data[i];
    count++;
  }
  
  return count > 0 ? Math.sqrt(sumSquares / count) : 0;
}

/**
 * Calculate asymmetry ratio between left and right signals
 */
export function calculateAsymmetry(leftData: number[], rightData: number[]): number[] {
  const asymmetry: number[] = [];
  
  for (let i = 0; i < Math.min(leftData.length, rightData.length); i++) {
    const left = Math.abs(leftData[i]);
    const right = Math.abs(rightData[i]);
    const total = left + right;
    
    if (total > 0) {
      // Asymmetry ratio: -1 (all left) to +1 (all right)
      asymmetry.push((right - left) / total);
    } else {
      asymmetry.push(0);
    }
  }
  
  return asymmetry;
}

/**
 * Validate detected events for basic quality checks
 */
export function validateEvents(events: DetectedEvent[]): DetectedEvent[] {
  return events.filter(event => {
    // Basic validation rules
    return (
      event.time >= 0 &&
      event.threshold_deviation >= 0 && event.threshold_deviation <= 1 &&
      ['heel_strike', 'toe_off'].includes(event.type) &&
      ['left', 'right'].includes(event.leg)
    );
  });
}

/**
 * Sort events by time and remove duplicates
 */
export function sortAndCleanEvents(events: DetectedEvent[]): DetectedEvent[] {
  // Sort by time
  const sorted = events.sort((a, b) => a.time - b.time);
  
  // Remove near-duplicate events (within 50ms)
  const cleaned: DetectedEvent[] = [];
  const minTimeDiff = 0.05; // 50ms
  
  for (const event of sorted) {
    const isDuplicate = cleaned.some(existing => 
      Math.abs(existing.time - event.time) < minTimeDiff &&
      existing.type === event.type &&
      existing.leg === event.leg
    );
    
    if (!isDuplicate) {
      cleaned.push(event);
    }
  }
  
  return cleaned;
}

/**
 * Calculate threshold deviation score based on signal strength
 */
export function calculateThresholdDeviation(
  signalValue: number, 
  threshold: number, 
  maxValue: number = 1000
): number {
  if (signalValue < threshold) return 0;
  
  // Normalize threshold deviation between threshold and max value
  const normalized = (signalValue - threshold) / (maxValue - threshold);
  return Math.min(1, Math.max(0, normalized));
}