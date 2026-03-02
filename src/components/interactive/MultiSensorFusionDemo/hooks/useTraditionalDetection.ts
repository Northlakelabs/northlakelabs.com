/**
 * Traditional detection hook
 * Executes threshold-based detection on force data
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { TraditionalDetection } from '../algorithms/traditional';
import type { ForceData } from './useDataLoader';
import type { DetectedEvent } from '../algorithms/utils';
import type { DemoData } from '../../../utils/types';

interface DetectionResult {
  events: DetectedEvent[];
  stats: {
    total_events: number;
    heel_strikes_left: number;
    heel_strikes_right: number;
    toe_offs_left: number;
    toe_offs_right: number;
    average_threshold_deviation: number;
  };
  processingTime: number;
}

interface DetectionConfig {
  heel_strike_threshold: number;
  toe_off_threshold: number;
  min_stance_time: number;
  min_swing_time: number;
}

export function useTraditionalDetection() {
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const defaultConfig: DetectionConfig = {
    heel_strike_threshold: 50,    // Newtons
    toe_off_threshold: 20,        // Newtons
    min_stance_time: 0.3,         // seconds
    min_swing_time: 0.2           // seconds
  };

  const [config, setConfig] = useState<DetectionConfig>(defaultConfig);

  const runDetection = useCallback(async (forceData: ForceData) => {
    if (!forceData) return;

    setIsProcessing(true);
    setError(null);

    try {
      const startTime = performance.now();

      // Create algorithm instance
      const algorithm = new TraditionalDetection({
        name: 'Traditional Force Plate Detection',
        version: '1.0.0',
        parameters: {
          heel_strike_threshold: config.heel_strike_threshold,
          toe_off_threshold: config.toe_off_threshold,
          min_stance_time: config.min_stance_time,
          min_swing_time: config.min_swing_time,
          smoothing_window: 10,
          peak_min_distance: 100
        }
      });

      // Convert ForceData to DemoData format for algorithm
      const demoData: DemoData = {
        metadata: {
          sampling_rate: forceData.sampleRate,
          duration_seconds: forceData.duration,
          total_samples: forceData.timestamps.length,
          synchronization_method: 'kinetics_master_timeline',
          segment_start_time: 0,
          segment_end_time: forceData.duration
        },
        timestamps: forceData.timestamps,
        force_plates: {
          left_force_plate: {
            fx: new Array(forceData.timestamps.length).fill(0),
            fy: new Array(forceData.timestamps.length).fill(0),
            fz: forceData.leftForce,
            mx: new Array(forceData.timestamps.length).fill(0),
            my: new Array(forceData.timestamps.length).fill(0),
            mz: new Array(forceData.timestamps.length).fill(0),
            cop_x: new Array(forceData.timestamps.length).fill(0),
            cop_y: new Array(forceData.timestamps.length).fill(0),
            cop_z: new Array(forceData.timestamps.length).fill(0)
          },
          right_force_plate: {
            fx: new Array(forceData.timestamps.length).fill(0),
            fy: new Array(forceData.timestamps.length).fill(0),
            fz: forceData.rightForce,
            mx: new Array(forceData.timestamps.length).fill(0),
            my: new Array(forceData.timestamps.length).fill(0),
            mz: new Array(forceData.timestamps.length).fill(0),
            cop_x: new Array(forceData.timestamps.length).fill(0),
            cop_y: new Array(forceData.timestamps.length).fill(0),
            cop_z: new Array(forceData.timestamps.length).fill(0)
          }
        },
        emg: {
          channels: {
            emg1: new Array(forceData.timestamps.length).fill(0),
            emg2: new Array(forceData.timestamps.length).fill(0),
            emg3: new Array(forceData.timestamps.length).fill(0),
            emg4: new Array(forceData.timestamps.length).fill(0),
            emg5: new Array(forceData.timestamps.length).fill(0),
            emg6: new Array(forceData.timestamps.length).fill(0),
            emg7: new Array(forceData.timestamps.length).fill(0),
            emg8: new Array(forceData.timestamps.length).fill(0),
            emg9: new Array(forceData.timestamps.length).fill(0),
            emg10: new Array(forceData.timestamps.length).fill(0),
            emg11: new Array(forceData.timestamps.length).fill(0),
            emg12: new Array(forceData.timestamps.length).fill(0),
            emg13: new Array(forceData.timestamps.length).fill(0),
            emg14: new Array(forceData.timestamps.length).fill(0),
            emg15: new Array(forceData.timestamps.length).fill(0),
            emg16: new Array(forceData.timestamps.length).fill(0)
          }
        },
        kinematics: {
          markers: {}
        },
        ground_truth_events: [],
        trial_info: {
          subject: 'Sub1',
          trial: 'T5',
          condition: 'constrained_gait',
          constraint: 'Left leg locked in extension',
          clinical_significance: 'Demonstrates pathological gait patterns'
        }
      };

      // Run detection
      const events = algorithm.detectEvents(demoData);
      const stats = algorithm.getDetectionStats(events);
      
      const endTime = performance.now();
      const processingTime = endTime - startTime;

      const detectionResult: DetectionResult = {
        events,
        stats,
        processingTime
      };

      setResult(detectionResult);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error during detection';
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [config]);

  const updateConfig = useCallback((newConfig: Partial<DetectionConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  const updateConfigDebounced = useCallback((newConfig: Partial<DetectionConfig>) => {
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // Update config immediately for UI responsiveness
    setConfig(prev => ({ ...prev, ...newConfig }));
    
    // Debounce the actual detection re-run
    debounceTimeoutRef.current = setTimeout(() => {
      // The useEffect with config dependency will trigger re-detection
    }, 300);
  }, []);

  const resetConfig = useCallback(() => {
    setConfig(defaultConfig);
  }, []);

  // Debug: Log hook state changes
  useEffect(() => {
    console.log('🎪 Hook state - result:', result ? 'exists' : 'null', 'events:', result?.events?.length || 0, 'processing:', isProcessing);
  }, [result, isProcessing]);

  return {
    // State
    result,
    isProcessing,
    error,
    config,
    
    // Actions
    runDetection,
    updateConfig,
    updateConfigDebounced,
    resetConfig,
    
    // Utilities
    hasResults: result !== null,
    events: result?.events || [],
    stats: result?.stats || null,
    processingTime: result?.processingTime || 0
  };
}