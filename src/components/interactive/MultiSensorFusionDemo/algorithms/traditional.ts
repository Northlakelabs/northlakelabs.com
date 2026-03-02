/**
 * Stage 1: Traditional Force Plate Detection
 * Single-sensor approach using vertical ground reaction force thresholding
 * Focused on pure detection without ground truth comparison
 */

import type { DemoData } from '../../../utils/types';
import type { 
  DetectedEvent, 
  AlgorithmConfig
} from './utils';
import { 
  movingAverage, 
  calculateThresholdDeviation,
  validateEvents,
  sortAndCleanEvents
} from './utils';

export interface TraditionalAlgorithmConfig extends AlgorithmConfig {
  parameters: {
    heel_strike_threshold: number;    // Force threshold for heel strike (N)
    toe_off_threshold: number;        // Force threshold for toe off (N)
    min_stance_time: number;          // Minimum stance phase duration (s)
    min_swing_time: number;           // Minimum swing phase duration (s)
    smoothing_window: number;         // Moving average window size (samples)
    peak_min_distance: number;        // Minimum distance between peaks (samples)
  };
}

/**
 * Traditional force plate detection algorithm
 * Uses simple thresholding on vertical ground reaction forces
 * Fails with constrained gait due to asymmetric loading patterns
 */
export class TraditionalDetection {
  private config: TraditionalAlgorithmConfig;

  constructor(config?: Partial<TraditionalAlgorithmConfig>) {
    this.config = {
      name: 'Traditional Force Plate',
      version: '1.0.0',
      parameters: {
        heel_strike_threshold: 50,      // Newtons - too high for constrained gait
        toe_off_threshold: 20,          // Newtons - may miss reduced loading
        min_stance_time: 0.3,           // 300ms minimum stance
        min_swing_time: 0.2,            // 200ms minimum swing
        smoothing_window: 10,           // 10ms smoothing at 1000Hz
        peak_min_distance: 100,         // 100ms between peaks
        ...config?.parameters
      },
      ...config
    };
  }

  /**
   * Detect gait events using traditional force plate thresholding
   * Processes both left and right force plates independently
   */
  public detectEvents(data: DemoData): DetectedEvent[] {
    const events: DetectedEvent[] = [];
    
    // Process left force plate
    const leftEvents = this.processForceData(
      data.force_plates.left_force_plate.fz,
      data.timestamps,
      'left'
    );
    events.push(...leftEvents);
    
    // Process right force plate  
    const rightEvents = this.processForceData(
      data.force_plates.right_force_plate.fz,
      data.timestamps,
      'right'
    );
    events.push(...rightEvents);
    
    // Validate and clean events
    const validEvents = validateEvents(events);
    const cleanedEvents = sortAndCleanEvents(validEvents);
    
    return cleanedEvents;
  }

  /**
   * Process force data for a single foot
   * Implements traditional threshold-based detection
   */
  private processForceData(
    forceData: number[], 
    timestamps: number[], 
    leg: 'left' | 'right'
  ): DetectedEvent[] {
    const events: DetectedEvent[] = [];
    const { parameters } = this.config;
    
    // Apply smoothing to reduce noise (but may miss rapid transitions)
    const smoothedForce = movingAverage(forceData, parameters.smoothing_window);
    
    // State tracking for stance/swing phases
    let inStance = false;
    let stanceStartTime = 0;
    
    for (let i = 1; i < smoothedForce.length; i++) {
      const currentForce = smoothedForce[i];
      const previousForce = smoothedForce[i - 1];
      const currentTime = timestamps[i];
      
      // Heel strike detection: force rises above threshold
      if (!inStance && 
          currentForce > parameters.heel_strike_threshold && 
          previousForce <= parameters.heel_strike_threshold) {
        
        // Calculate threshold deviation based on force magnitude
        const thresholdDeviation = calculateThresholdDeviation(
          currentForce, 
          parameters.heel_strike_threshold,
          1000 // Max expected force
        );
        
        events.push({
          time: currentTime,
          type: 'heel_strike',
          leg,
          threshold_deviation: thresholdDeviation,
          detection_method: 'traditional_threshold',
          force_magnitude: currentForce,
          algorithm_parameters: {
            threshold: parameters.heel_strike_threshold
          }
        });
        
        inStance = true;
        stanceStartTime = currentTime;
      }
      
      // Toe off detection: force drops below threshold
      else if (inStance && 
               currentForce < parameters.toe_off_threshold && 
               previousForce >= parameters.toe_off_threshold) {
        
        // Check minimum stance time (basic validation)
        const stanceDuration = currentTime - stanceStartTime;
        if (stanceDuration >= parameters.min_stance_time) {
          
          const thresholdDeviation = calculateThresholdDeviation(
            Math.abs(currentForce - parameters.toe_off_threshold),
            0,
            parameters.toe_off_threshold
          );
          
          events.push({
            time: currentTime,
            type: 'toe_off',
            leg,
            threshold_deviation: thresholdDeviation,
            detection_method: 'traditional_threshold',
            force_magnitude: currentForce,
            algorithm_parameters: {
              threshold: parameters.toe_off_threshold,
              stance_duration: stanceDuration
            }
          });
          
          inStance = false;
        }
      }
    }
    
    return events;
  }

  /**
   * Get algorithm configuration
   */
  public getConfig(): TraditionalAlgorithmConfig {
    return { ...this.config };
  }

  /**
   * Update algorithm parameters
   */
  public updateConfig(newConfig: Partial<TraditionalAlgorithmConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
      parameters: {
        ...this.config.parameters,
        ...newConfig.parameters
      }
    };
  }

  /**
   * Get detection statistics with force magnitude analysis for biomechanical insights
   */
  public getDetectionStats(detectedEvents: DetectedEvent[]): {
    total_events: number;
    heel_strikes_left: number;
    heel_strikes_right: number;
    toe_offs_left: number;
    toe_offs_right: number;
    average_threshold_deviation: number;
    force_magnitude_stats?: {
      heel_strike_forces: { left: { min: number; max: number; avg: number }; right: { min: number; max: number; avg: number } };
      toe_off_forces: { left: { min: number; max: number; avg: number }; right: { min: number; max: number; avg: number } };
      force_asymmetry: number; // Percentage difference in average heel strike forces
    };
  } {
    const heelStrikesLeft = detectedEvents.filter(e => e.type === 'heel_strike' && e.leg === 'left');
    const heelStrikesRight = detectedEvents.filter(e => e.type === 'heel_strike' && e.leg === 'right');
    const toeOffsLeft = detectedEvents.filter(e => e.type === 'toe_off' && e.leg === 'left');
    const toeOffsRight = detectedEvents.filter(e => e.type === 'toe_off' && e.leg === 'right');
    
    const averageThresholdDeviation = detectedEvents.length > 0 
      ? detectedEvents.reduce((sum, event) => sum + event.threshold_deviation, 0) / detectedEvents.length 
      : 0;
    
    // Calculate force magnitude statistics if available
    let forceMagnitudeStats = undefined;
    const eventsWithForce = detectedEvents.filter(e => e.force_magnitude !== undefined);
    
    if (eventsWithForce.length > 0) {
      const getForceStats = (events: DetectedEvent[]) => {
        const forces = events.map(e => e.force_magnitude!).filter(f => f !== undefined);
        if (forces.length === 0) return { min: 0, max: 0, avg: 0 };
        return {
          min: Math.min(...forces),
          max: Math.max(...forces),
          avg: forces.reduce((sum, f) => sum + f, 0) / forces.length
        };
      };
      
      const leftHeelForces = heelStrikesLeft.filter(e => e.force_magnitude !== undefined);
      const rightHeelForces = heelStrikesRight.filter(e => e.force_magnitude !== undefined);
      const leftToeForces = toeOffsLeft.filter(e => e.force_magnitude !== undefined);
      const rightToeForces = toeOffsRight.filter(e => e.force_magnitude !== undefined);
      
      const leftHeelStats = getForceStats(leftHeelForces);
      const rightHeelStats = getForceStats(rightHeelForces);
      
      // Calculate force asymmetry (biomechanical insight)
      const forceAsymmetry = leftHeelStats.avg > 0 && rightHeelStats.avg > 0 
        ? Math.abs(leftHeelStats.avg - rightHeelStats.avg) / ((leftHeelStats.avg + rightHeelStats.avg) / 2) * 100
        : 0;
      
      forceMagnitudeStats = {
        heel_strike_forces: {
          left: leftHeelStats,
          right: rightHeelStats
        },
        toe_off_forces: {
          left: getForceStats(leftToeForces),
          right: getForceStats(rightToeForces)
        },
        force_asymmetry: forceAsymmetry
      };
    }
    
    return {
      total_events: detectedEvents.length,
      heel_strikes_left: heelStrikesLeft.length,
      heel_strikes_right: heelStrikesRight.length,
      toe_offs_left: toeOffsLeft.length,
      toe_offs_right: toeOffsRight.length,
      average_threshold_deviation: averageThresholdDeviation,
      force_magnitude_stats: forceMagnitudeStats
    };
  }
}

/**
 * Create traditional detection algorithm with default configuration
 */
export function createTraditionalDetection(
  config?: Partial<TraditionalAlgorithmConfig>
): TraditionalDetection {
  return new TraditionalDetection(config);
}