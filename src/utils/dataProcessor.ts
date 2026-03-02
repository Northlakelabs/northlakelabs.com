/**
 * Runtime Data Processor
 * Handles loading and processing of demo data in the browser
 */

import type { DemoData, DemoMetadata } from './types';

export class DataProcessor {
  private static cache = new Map<string, DemoData>();
  
  /**
   * Load demo trial data from static JSON files
   */
  static async loadTrialData(trialId: string): Promise<DemoData> {
    // Check cache first
    if (this.cache.has(trialId)) {
      console.log(`📦 Loading ${trialId} from cache`);
      return this.cache.get(trialId)!;
    }
    
    console.log(`📡 Loading demo data for trial ${trialId}...`);
    
    try {
      const response = await fetch(`/demo-data/${trialId}-demo.json`);
      
      if (!response.ok) {
        throw new Error(`Failed to load trial ${trialId}: ${response.status} ${response.statusText}`);
      }
      
      const demoData: DemoData = await response.json();
      
      // Validate loaded data
      this.validateDemoData(demoData);
      
      // Cache for future use
      this.cache.set(trialId, demoData);
      
      console.log(`✅ Trial ${trialId} loaded successfully`);
      console.log(`📊 Duration: ${demoData.metadata.duration_seconds.toFixed(1)}s`);
      console.log(`🎯 Events: ${demoData.ground_truth_events.length}`);
      
      return demoData;
      
    } catch (error) {
      console.error(`❌ Failed to load trial ${trialId}:`, error);
      throw error;
    }
  }
  
  /**
   * Load trial metadata without full data
   */
  static async loadTrialMetadata(trialId: string) {
    try {
      const response = await fetch(`/demo-data/${trialId}-metadata.json`);
      
      if (!response.ok) {
        throw new Error(`Failed to load metadata for ${trialId}`);
      }
      
      return await response.json();
      
    } catch (error) {
      console.error(`❌ Failed to load metadata for ${trialId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get available trial IDs
   */
  static getAvailableTrials(): string[] {
    // For now, return known trials. In production, this could be dynamic
    return ['T5', 'T10', 'T12'];
  }
  
  /**
   * Validate demo data structure
   */
  private static validateDemoData(data: DemoData): void {
    const requiredFields = [
      'metadata',
      'timestamps',
      'force_plates',
      'emg',
      'kinematics',
      'ground_truth_events',
      'trial_info'
    ];
    
    for (const field of requiredFields) {
      if (!(field in data)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    // Validate data consistency
    const sampleCount = data.timestamps.length;
    const metadata = data.metadata;
    
    if (metadata.total_samples !== sampleCount) {
      console.warn(`Sample count mismatch: metadata=${metadata.total_samples}, actual=${sampleCount}`);
    }
    
    // Validate force plates
    const leftFzLength = data.force_plates.left_force_plate.fz.length;
    const rightFzLength = data.force_plates.right_force_plate.fz.length;
    
    if (leftFzLength !== sampleCount || rightFzLength !== sampleCount) {
      throw new Error(`Force plate data length mismatch`);
    }
    
    // Validate EMG channels
    const emgChannels = Object.keys(data.emg.channels);
    for (const channel of emgChannels) {
      if (data.emg.channels[channel].length !== sampleCount) {
        throw new Error(`EMG ${channel} data length mismatch`);
      }
    }
    
    // Validate kinematics markers
    const markers = Object.keys(data.kinematics.markers);
    for (const marker of markers) {
      const markerData = data.kinematics.markers[marker];
      if (markerData.x.length !== sampleCount ||
          markerData.y.length !== sampleCount ||
          markerData.z.length !== sampleCount) {
        throw new Error(`Kinematics ${marker} data length mismatch`);
      }
    }
  }
  
  /**
   * Extract data window for visualization
   */
  static extractDataWindow(
    data: DemoData, 
    startTime: number, 
    endTime: number
  ): Partial<DemoData> {
    const startIndex = this.findTimeIndex(data.timestamps, startTime);
    const endIndex = this.findTimeIndex(data.timestamps, endTime);
    
    return {
      timestamps: data.timestamps.slice(startIndex, endIndex + 1),
      force_plates: {
        left_force_plate: {
          fx: data.force_plates.left_force_plate.fx.slice(startIndex, endIndex + 1),
          fy: data.force_plates.left_force_plate.fy.slice(startIndex, endIndex + 1),
          fz: data.force_plates.left_force_plate.fz.slice(startIndex, endIndex + 1),
          mx: data.force_plates.left_force_plate.mx.slice(startIndex, endIndex + 1),
          my: data.force_plates.left_force_plate.my.slice(startIndex, endIndex + 1),
          mz: data.force_plates.left_force_plate.mz.slice(startIndex, endIndex + 1),
          cop_x: data.force_plates.left_force_plate.cop_x.slice(startIndex, endIndex + 1),
          cop_y: data.force_plates.left_force_plate.cop_y.slice(startIndex, endIndex + 1),
          cop_z: data.force_plates.left_force_plate.cop_z.slice(startIndex, endIndex + 1)
        },
        right_force_plate: {
          fx: data.force_plates.right_force_plate.fx.slice(startIndex, endIndex + 1),
          fy: data.force_plates.right_force_plate.fy.slice(startIndex, endIndex + 1),
          fz: data.force_plates.right_force_plate.fz.slice(startIndex, endIndex + 1),
          mx: data.force_plates.right_force_plate.mx.slice(startIndex, endIndex + 1),
          my: data.force_plates.right_force_plate.my.slice(startIndex, endIndex + 1),
          mz: data.force_plates.right_force_plate.mz.slice(startIndex, endIndex + 1),
          cop_x: data.force_plates.right_force_plate.cop_x.slice(startIndex, endIndex + 1),
          cop_y: data.force_plates.right_force_plate.cop_y.slice(startIndex, endIndex + 1),
          cop_z: data.force_plates.right_force_plate.cop_z.slice(startIndex, endIndex + 1)
        }
      },
      ground_truth_events: data.ground_truth_events.filter(
        event => event.time >= startTime && event.time <= endTime
      )
    };
  }
  
  /**
   * Find array index for given timestamp
   */
  private static findTimeIndex(timestamps: number[], targetTime: number): number {
    // Binary search for efficiency
    let left = 0;
    let right = timestamps.length - 1;
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const midTime = timestamps[mid];
      
      if (Math.abs(midTime - targetTime) < 0.001) { // 1ms tolerance
        return mid;
      }
      
      if (midTime < targetTime) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    
    // Return closest index
    return left < timestamps.length ? left : timestamps.length - 1;
  }
  
  /**
   * Calculate basic statistics for data quality assessment
   */
  static calculateDataStats(data: DemoData) {
    const rightForces = data.force_plates.right_force_plate.fz;
    const leftForces = data.force_plates.left_force_plate.fz;
    
    // Calculate loading asymmetry
    const rightLoadingForces = rightForces.filter(f => Math.abs(f) > 100);
    const leftLoadingForces = leftForces.filter(f => Math.abs(f) > 100);
    
    const rightAvg = rightLoadingForces.length > 0 
      ? rightLoadingForces.reduce((sum, f) => sum + Math.abs(f), 0) / rightLoadingForces.length 
      : 0;
    const leftAvg = leftLoadingForces.length > 0
      ? leftLoadingForces.reduce((sum, f) => sum + Math.abs(f), 0) / leftLoadingForces.length 
      : 0.1; // Avoid division by zero
    
    const asymmetryRatio = rightAvg / leftAvg;
    
    // Calculate EMG activity levels
    const emgChannels = Object.keys(data.emg.channels);
    const emgStats = emgChannels.map(channel => {
      const values = data.emg.channels[channel];
      const mean = values.reduce((sum, v) => sum + Math.abs(v), 0) / values.length;
      const max = Math.max(...values.map(v => Math.abs(v)));
      return { channel, mean, max };
    });
    
    return {
      duration_seconds: data.metadata.duration_seconds,
      total_samples: data.metadata.total_samples,
      constraint_analysis: {
        right_loading_avg: rightAvg,
        left_loading_avg: leftAvg,
        asymmetry_ratio: asymmetryRatio,
        constraint_quality: asymmetryRatio > 3 ? 'excellent' : 
                           asymmetryRatio > 2 ? 'good' : 
                           asymmetryRatio > 1.5 ? 'fair' : 'poor'
      },
      gait_events: {
        total_events: data.ground_truth_events.length,
        heel_strikes: data.ground_truth_events.filter(e => e.type === 'heel_strike').length,
        toe_offs: data.ground_truth_events.filter(e => e.type === 'toe_off').length
      },
      emg_analysis: {
        active_channels: emgStats.filter(s => s.mean > 1e-5).length,
        total_channels: emgChannels.length,
        max_activation: Math.max(...emgStats.map(s => s.max))
      }
    };
  }
  
  /**
   * Clear data cache
   */
  static clearCache(): void {
    this.cache.clear();
    console.log('🧹 Data cache cleared');
  }
  
  /**
   * Get cache status
   */
  static getCacheInfo() {
    return {
      cached_trials: Array.from(this.cache.keys()),
      cache_size: this.cache.size
    };
  }
}

export default DataProcessor;