#!/usr/bin/env node

/**
 * CSV Parser Utilities for Multi-Modal Biomechanics Data
 * Handles kinetics (1000Hz), EMG (2000Hz), and kinematics (100Hz) data parsing
 */

import { readFileSync } from 'fs';

export class CSVParser {
  
  /**
   * Parse kinetics CSV file (dual force plates at 1000Hz)
   * @param {string} filePath - Path to kinetics CSV file
   * @returns {Object} Parsed kinetics data
   */
  static parseKinetics(filePath) {
    console.log(`📊 Parsing kinetics: ${filePath}`);
    
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    // Validate header structure
    if (!lines[1] || lines[1].trim() !== '1000') {
      throw new Error('Invalid kinetics file: expected 1000Hz sampling rate');
    }
    
    // Skip header rows (lines 0-4) and parse data
    const dataLines = lines.slice(5).filter(line => line.trim());
    const data = {
      metadata: {
        sampling_rate: 1000,
        duration_seconds: dataLines.length / 1000,
        total_samples: dataLines.length
      },
      timestamps: [],
      left_force_plate: {
        fx: [], fy: [], fz: [],           // Forces in N
        mx: [], my: [], mz: [],           // Moments in N.mm
        cop_x: [], cop_y: [], cop_z: []   // Center of pressure in mm
      },
      right_force_plate: {
        fx: [], fy: [], fz: [],
        mx: [], my: [], mz: [],
        cop_x: [], cop_y: [], cop_z: []
      }
    };
    
    dataLines.forEach((line, index) => {
      const cols = line.split(',');
      
      if (cols.length >= 19) {
        // Generate timestamp (assuming 1000Hz)
        data.timestamps.push(index / 1000);
        
        // Left force plate (FP1) - columns 2-10
        data.left_force_plate.fx.push(parseFloat(cols[2]) || 0);
        data.left_force_plate.fy.push(parseFloat(cols[3]) || 0);
        data.left_force_plate.fz.push(parseFloat(cols[4]) || 0);
        data.left_force_plate.mx.push(parseFloat(cols[5]) || 0);
        data.left_force_plate.my.push(parseFloat(cols[6]) || 0);
        data.left_force_plate.mz.push(parseFloat(cols[7]) || 0);
        data.left_force_plate.cop_x.push(parseFloat(cols[8]) || 0);
        data.left_force_plate.cop_y.push(parseFloat(cols[9]) || 0);
        data.left_force_plate.cop_z.push(parseFloat(cols[10]) || 0);
        
        // Right force plate (FP2) - columns 11-19
        data.right_force_plate.fx.push(parseFloat(cols[11]) || 0);
        data.right_force_plate.fy.push(parseFloat(cols[12]) || 0);
        data.right_force_plate.fz.push(parseFloat(cols[13]) || 0);
        data.right_force_plate.mx.push(parseFloat(cols[14]) || 0);
        data.right_force_plate.my.push(parseFloat(cols[15]) || 0);
        data.right_force_plate.mz.push(parseFloat(cols[16]) || 0);
        data.right_force_plate.cop_x.push(parseFloat(cols[17]) || 0);
        data.right_force_plate.cop_y.push(parseFloat(cols[18]) || 0);
        data.right_force_plate.cop_z.push(parseFloat(cols[19]) || 0);
      }
    });
    
    console.log(`✅ Kinetics parsed: ${data.metadata.total_samples} samples, ${data.metadata.duration_seconds.toFixed(1)}s`);
    return data;
  }
  
  /**
   * Parse EMG CSV file (16-channel surface EMG at 2000Hz)
   * @param {string} filePath - Path to EMG CSV file
   * @returns {Object} Parsed EMG data
   */
  static parseEMG(filePath) {
    console.log(`💪 Parsing EMG: ${filePath}`);
    
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    // Validate header structure
    if (!lines[1] || lines[1].trim() !== '2000') {
      throw new Error('Invalid EMG file: expected 2000Hz sampling rate');
    }
    
    const dataLines = lines.slice(5).filter(line => line.trim());
    const data = {
      metadata: {
        sampling_rate: 2000,
        duration_seconds: dataLines.length / 2000,
        total_samples: dataLines.length,
        channels: 16
      },
      timestamps: [],
      channels: {
        emg1: [], emg2: [], emg3: [], emg4: [],
        emg5: [], emg6: [], emg7: [], emg8: [],
        emg9: [], emg10: [], emg11: [], emg12: [],
        emg13: [], emg14: [], emg15: [], emg16: []
      }
    };
    
    dataLines.forEach((line, index) => {
      const cols = line.split(',');
      
      if (cols.length >= 17) {
        // Generate timestamp (assuming 2000Hz)
        data.timestamps.push(index / 2000);
        
        // EMG channels (IM EMG1-16) - columns 2-17
        for (let i = 0; i < 16; i++) {
          const channelName = `emg${i + 1}`;
          const value = parseFloat(cols[i + 2]) || 0;
          data.channels[channelName].push(value);
        }
      }
    });
    
    console.log(`✅ EMG parsed: ${data.metadata.total_samples} samples, ${data.metadata.duration_seconds.toFixed(1)}s, ${data.metadata.channels} channels`);
    return data;
  }
  
  /**
   * Parse kinematics CSV file (3D motion capture at 100Hz)
   * @param {string} filePath - Path to kinematics CSV file
   * @returns {Object} Parsed kinematics data
   */
  static parseKinematics(filePath) {
    console.log(`🎯 Parsing kinematics: ${filePath}`);
    
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    // Validate header structure
    if (!lines[1] || lines[1].trim() !== '100') {
      throw new Error('Invalid kinematics file: expected 100Hz sampling rate');
    }
    
    // Parse header to identify marker columns
    const headerLine = lines[2]; // Marker names are in line 3 (0-indexed line 2)
    const markerNames = this.parseKinematicsHeader(headerLine);
    
    const dataLines = lines.slice(5).filter(line => line.trim());
    const data = {
      metadata: {
        sampling_rate: 100,
        duration_seconds: dataLines.length / 100,
        total_samples: dataLines.length,
        markers: markerNames
      },
      timestamps: [],
      markers: {}
    };
    
    // Initialize marker data arrays
    markerNames.forEach(marker => {
      data.markers[marker] = {
        x: [], y: [], z: []
      };
    });
    
    dataLines.forEach((line, index) => {
      const cols = line.split(',');
      
      if (cols.length >= 3) {
        // Generate timestamp (assuming 100Hz)
        data.timestamps.push(index / 100);
        
        // Parse marker coordinates (X, Y, Z for each marker)
        let colIndex = 2; // Start after Frame and Sub Frame columns
        markerNames.forEach(marker => {
          if (colIndex + 2 < cols.length) {
            data.markers[marker].x.push(parseFloat(cols[colIndex]) || 0);
            data.markers[marker].y.push(parseFloat(cols[colIndex + 1]) || 0);
            data.markers[marker].z.push(parseFloat(cols[colIndex + 2]) || 0);
            colIndex += 3;
          }
        });
      }
    });
    
    console.log(`✅ Kinematics parsed: ${data.metadata.total_samples} samples, ${data.metadata.duration_seconds.toFixed(1)}s, ${markerNames.length} markers`);
    return data;
  }
  
  /**
   * Parse kinematics header to extract marker names
   * @param {string} headerLine - Header line with marker names
   * @returns {Array} Array of marker names
   */
  static parseKinematicsHeader(headerLine) {
    const cols = headerLine.split(',');
    const markers = [];
    
    for (let i = 2; i < cols.length; i += 3) {
      const markerName = cols[i];
      if (markerName && markerName.trim() && markerName !== 'X' && markerName !== '') {
        const cleanName = markerName.trim().replace(/^S12:/, ''); // Remove S12: prefix
        if (cleanName) {
          markers.push(cleanName);
        }
      }
    }
    
    return markers;
  }
  
  /**
   * Validate parsed data for completeness and quality
   * @param {Object} data - Parsed data object
   * @param {string} dataType - Type of data ('kinetics', 'emg', 'kinematics')
   * @returns {Object} Validation results
   */
  static validateData(data, dataType) {
    const validation = {
      isValid: true,
      issues: [],
      quality_score: 5,
      recommendations: []
    };
    
    // Check for reasonable duration
    if (data.metadata.duration_seconds < 200) {
      validation.issues.push('Duration too short for optimal demo segments');
      validation.quality_score -= 1;
    }
    
    // Check for missing samples
    const expectedSamples = Math.floor(data.metadata.duration_seconds * data.metadata.sampling_rate);
    if (data.metadata.total_samples < expectedSamples * 0.95) {
      validation.issues.push('Significant missing samples detected');
      validation.quality_score -= 2;
    }
    
    // Data type specific validation
    if (dataType === 'kinetics') {
      // Check for constraint pattern during loading phases
      const rightForces = data.right_force_plate.fz;
      const leftForces = data.left_force_plate.fz;
      
      // Find loading phases (force > 100N threshold)
      const rightLoadingForces = rightForces.filter(f => Math.abs(f) > 100);
      const leftLoadingForces = leftForces.filter(f => Math.abs(f) > 100);
      
      if (rightLoadingForces.length > 0 && leftLoadingForces.length > 0) {
        const avgRightLoading = rightLoadingForces.reduce((sum, f) => sum + Math.abs(f), 0) / rightLoadingForces.length;
        const avgLeftLoading = leftLoadingForces.reduce((sum, f) => sum + Math.abs(f), 0) / leftLoadingForces.length;
        
        const asymmetryRatio = avgRightLoading / avgLeftLoading;
        
        if (asymmetryRatio > 2.0) {
          validation.recommendations.push(`Excellent constraint pattern: ${asymmetryRatio.toFixed(1)}:1 loading asymmetry`);
        } else if (asymmetryRatio > 1.5) {
          validation.recommendations.push(`Good constraint pattern: ${asymmetryRatio.toFixed(1)}:1 loading asymmetry`);
        } else {
          validation.issues.push(`Weak constraint pattern: only ${asymmetryRatio.toFixed(1)}:1 loading asymmetry`);
          validation.quality_score -= 1;
        }
      } else if (rightLoadingForces.length === 0 && leftLoadingForces.length === 0) {
        validation.issues.push('No loading phases detected - possible data quality issue');
        validation.quality_score -= 2;
      } else if (leftLoadingForces.length === 0 && rightLoadingForces.length > 0) {
        validation.recommendations.push('Perfect constraint: Complete left unloading with right compensation');
      }
    }
    
    if (validation.quality_score < 3) {
      validation.isValid = false;
    }
    
    return validation;
  }
}

export default CSVParser;