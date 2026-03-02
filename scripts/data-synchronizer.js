#!/usr/bin/env node

/**
 * Data Synchronization System
 * Aligns multi-rate data streams to unified 1000Hz timeline
 * - Kinetics: 1000Hz (master timeline)
 * - EMG: 2000Hz → 1000Hz (downsample)
 * - Kinematics: 100Hz → 1000Hz (upsample)
 */

export class DataSynchronizer {
  
  /**
   * Synchronize all modalities to 1000Hz master timeline
   * @param {Object} kinetics - Parsed kinetics data (1000Hz)
   * @param {Object} emg - Parsed EMG data (2000Hz)
   * @param {Object} kinematics - Parsed kinematics data (100Hz)
   * @returns {Object} Synchronized data structure
   */
  static synchronizeData(kinetics, emg, kinematics) {
    console.log('🔄 Synchronizing multi-modal data to 1000Hz timeline...');
    
    // Use kinetics as master timeline (already 1000Hz)
    const masterTimestamps = kinetics.timestamps;
    const masterSampleCount = masterTimestamps.length;
    
    console.log(`📊 Master timeline: ${masterSampleCount} samples, ${masterTimestamps[masterTimestamps.length-1].toFixed(1)}s`);
    
    // Downsample EMG from 2000Hz to 1000Hz
    const syncedEMG = this.downsampleEMG(emg, masterSampleCount);
    
    // Upsample kinematics from 100Hz to 1000Hz
    const syncedKinematics = this.upsampleKinematics(kinematics, masterTimestamps);
    
    const synchronizedData = {
      metadata: {
        sampling_rate: 1000,
        duration_seconds: masterTimestamps[masterTimestamps.length - 1],
        total_samples: masterSampleCount,
        synchronization_method: 'kinetics_master_timeline'
      },
      timestamps: masterTimestamps,
      force_plates: kinetics,
      emg: syncedEMG,
      kinematics: syncedKinematics
    };
    
    console.log('✅ Data synchronization complete');
    return synchronizedData;
  }
  
  /**
   * Downsample EMG data from 2000Hz to 1000Hz
   * Takes every 2nd sample to match master timeline
   * @param {Object} emgData - Original EMG data at 2000Hz
   * @param {number} targetSampleCount - Target number of samples
   * @returns {Object} Downsampled EMG data
   */
  static downsampleEMG(emgData, targetSampleCount) {
    console.log('📉 Downsampling EMG: 2000Hz → 1000Hz');
    
    const downsampledEMG = {
      metadata: {
        original_sampling_rate: 2000,
        target_sampling_rate: 1000,
        method: 'every_second_sample'
      },
      channels: {}
    };
    
    // Downsample each EMG channel
    Object.keys(emgData.channels).forEach(channelName => {
      const originalData = emgData.channels[channelName];
      const downsampledData = [];
      
      // Take every 2nd sample to convert 2000Hz to 1000Hz
      for (let i = 0; i < Math.min(originalData.length, targetSampleCount * 2); i += 2) {
        downsampledData.push(originalData[i]);
      }
      
      // Ensure exact length match
      while (downsampledData.length < targetSampleCount) {
        downsampledData.push(downsampledData[downsampledData.length - 1] || 0);
      }
      downsampledData.length = targetSampleCount;
      
      downsampledEMG.channels[channelName] = downsampledData;
    });
    
    console.log(`✅ EMG downsampled: ${Object.keys(downsampledEMG.channels).length} channels`);
    return downsampledEMG;
  }
  
  /**
   * Upsample kinematics data from 100Hz to 1000Hz using linear interpolation
   * @param {Object} kinematicsData - Original kinematics data at 100Hz
   * @param {Array} targetTimestamps - Target timestamps at 1000Hz
   * @returns {Object} Upsampled kinematics data
   */
  static upsampleKinematics(kinematicsData, targetTimestamps) {
    console.log('📈 Upsampling kinematics: 100Hz → 1000Hz');
    
    const upsampledKinematics = {
      metadata: {
        original_sampling_rate: 100,
        target_sampling_rate: 1000,
        method: 'linear_interpolation'
      },
      markers: {}
    };
    
    const originalTimestamps = kinematicsData.timestamps;
    
    // Upsample each marker's X, Y, Z coordinates
    Object.keys(kinematicsData.markers).forEach(markerName => {
      const marker = kinematicsData.markers[markerName];
      
      upsampledKinematics.markers[markerName] = {
        x: this.linearInterpolate(originalTimestamps, marker.x, targetTimestamps),
        y: this.linearInterpolate(originalTimestamps, marker.y, targetTimestamps),
        z: this.linearInterpolate(originalTimestamps, marker.z, targetTimestamps)
      };
    });
    
    console.log(`✅ Kinematics upsampled: ${Object.keys(upsampledKinematics.markers).length} markers`);
    return upsampledKinematics;
  }
  
  /**
   * Linear interpolation between data points
   * @param {Array} originalTimes - Original timestamps
   * @param {Array} originalValues - Original data values
   * @param {Array} targetTimes - Target timestamps for interpolation
   * @returns {Array} Interpolated values
   */
  static linearInterpolate(originalTimes, originalValues, targetTimes) {
    const interpolatedValues = [];
    
    for (const targetTime of targetTimes) {
      // Find surrounding points
      let lowerIndex = 0;
      let upperIndex = originalTimes.length - 1;
      
      for (let i = 0; i < originalTimes.length - 1; i++) {
        if (originalTimes[i] <= targetTime && originalTimes[i + 1] >= targetTime) {
          lowerIndex = i;
          upperIndex = i + 1;
          break;
        }
      }
      
      // Handle edge cases
      if (targetTime <= originalTimes[0]) {
        interpolatedValues.push(originalValues[0] || 0);
        continue;
      }
      if (targetTime >= originalTimes[originalTimes.length - 1]) {
        interpolatedValues.push(originalValues[originalValues.length - 1] || 0);
        continue;
      }
      
      // Linear interpolation
      const t1 = originalTimes[lowerIndex];
      const t2 = originalTimes[upperIndex];
      const v1 = originalValues[lowerIndex] || 0;
      const v2 = originalValues[upperIndex] || 0;
      
      if (t2 === t1) {
        interpolatedValues.push(v1);
      } else {
        const ratio = (targetTime - t1) / (t2 - t1);
        const interpolatedValue = v1 + ratio * (v2 - v1);
        interpolatedValues.push(interpolatedValue);
      }
    }
    
    return interpolatedValues;
  }
  
  /**
   * Validate synchronization quality
   * @param {Object} synchronizedData - Synchronized data structure
   * @returns {Object} Validation results
   */
  static validateSynchronization(synchronizedData) {
    const validation = {
      isValid: true,
      issues: [],
      quality_metrics: {}
    };
    
    const { force_plates, emg, kinematics } = synchronizedData;
    const sampleCount = synchronizedData.total_samples;
    
    // Check force plates data length
    const forceSampleCount = force_plates.left_force_plate.fz.length;
    if (forceSampleCount !== sampleCount) {
      validation.issues.push(`Force plates sample mismatch: ${forceSampleCount} vs ${sampleCount}`);
      validation.isValid = false;
    }
    
    // Check EMG data length
    const emgChannels = Object.keys(emg.channels);
    if (emgChannels.length > 0) {
      const emgSampleCount = emg.channels[emgChannels[0]].length;
      if (emgSampleCount !== sampleCount) {
        validation.issues.push(`EMG sample mismatch: ${emgSampleCount} vs ${sampleCount}`);
        validation.isValid = false;
      }
    }
    
    // Check kinematics data length
    const markers = Object.keys(kinematics.markers);
    if (markers.length > 0) {
      const kinematicsSampleCount = kinematics.markers[markers[0]].x.length;
      if (kinematicsSampleCount !== sampleCount) {
        validation.issues.push(`Kinematics sample mismatch: ${kinematicsSampleCount} vs ${sampleCount}`);
        validation.isValid = false;
      }
    }
    
    // Calculate quality metrics
    validation.quality_metrics = {
      temporal_alignment: validation.isValid ? 'Perfect' : 'Failed',
      data_completeness: (emgChannels.length > 0 && markers.length > 0) ? 'Complete' : 'Partial',
      sampling_consistency: validation.issues.length === 0 ? 'Consistent' : 'Inconsistent'
    };
    
    return validation;
  }
}

export default DataSynchronizer;