#!/usr/bin/env node

/**
 * Main Demo Data Processing Pipeline
 * Processes selected trial data into optimized JSON for runtime demo loading
 */

import { existsSync, mkdirSync, writeFileSync, statSync } from 'fs';
import { join } from 'path';
import { CSVParser } from './csv-parser.js';
import { DataSynchronizer } from './data-synchronizer.js';

class DemoDataProcessor {
  constructor(options = {}) {
    this.selectedTrial = options.selectedTrial || 'T5';
    this.dataDir = './data/Sub1';
    this.outputDir = './public/demo-data';
    this.segmentDuration = options.segmentDuration || 20; // seconds
    this.forceReprocess = options.forceReprocess || false;
    
    // Ensure output directory exists
    if (!existsSync(this.outputDir)) {
      mkdirSync(this.outputDir, { recursive: true });
    }
  }
  
  /**
   * Check if demo data cache is valid
   * Returns true if cached data exists and is newer than source files (if available)
   */
  isCacheValid() {
    const demoFile = join(this.outputDir, `${this.selectedTrial}-demo.json`);
    const metadataFile = join(this.outputDir, `${this.selectedTrial}-metadata.json`);
    
    // Check if output files exist
    if (!existsSync(demoFile) || !existsSync(metadataFile)) {
      return false;
    }
    
    // Check if source data directory exists (CI environment may not have it)
    if (!existsSync(this.dataDir)) {
      console.log(`📦 Source data directory not available: ${this.dataDir}`);
      console.log(`✅ Using pre-processed demo data files (CI/production mode)`);
      return true; // In CI/production, assume pre-processed data is valid
    }
    
    // Get cache timestamp
    const cacheTime = Math.min(
      statSync(demoFile).mtime.getTime(),
      statSync(metadataFile).mtime.getTime()
    );
    
    // Check source file timestamps
    const sourceFiles = [
      join(this.dataDir, 'Kinetics', `Sub1_Kinetics_${this.selectedTrial}.csv`),
      join(this.dataDir, 'EMG', `Sub1_EMG_${this.selectedTrial}.csv`),
      join(this.dataDir, 'Kinematics', `Sub1_Kinematics_${this.selectedTrial}.csv`)
    ];
    
    for (const sourceFile of sourceFiles) {
      if (!existsSync(sourceFile)) {
        console.log(`⚠️  Source file missing: ${sourceFile}`);
        console.log(`✅ Using pre-processed demo data (source not available)`);
        return true; // If processed data exists but source doesn't, assume it's valid
      }
      
      const sourceTime = statSync(sourceFile).mtime.getTime();
      if (sourceTime > cacheTime) {
        console.log(`📅 Source file newer than cache: ${sourceFile}`);
        return false;
      }
    }
    
    return true;
  }
  
  async processTrialData() {
    console.log(`🚀 Processing demo data for trial ${this.selectedTrial}...`);
    console.log(`📁 Input: ${this.dataDir}`);
    console.log(`📁 Output: ${this.outputDir}`);
    console.log(`⏱️  Target segment: ${this.segmentDuration} seconds\n`);
    
    // Check cache validity unless forced to reprocess
    if (!this.forceReprocess && this.isCacheValid()) {
      console.log('✅ Demo data cache is valid and up-to-date!');
      console.log('📦 Using existing processed data files:');
      console.log(`   - ${this.selectedTrial}-demo.json`);
      console.log(`   - ${this.selectedTrial}-metadata.json`);
      console.log('💡 Use --force flag to reprocess from source data\n');
      console.log('🎉 Demo data ready! (cached)');
      return;
    }
    
    if (this.forceReprocess) {
      console.log('🔄 Force reprocessing enabled, ignoring cache...\n');
    } else {
      console.log('🔄 Cache invalid or missing, processing from source...\n');
    }
    
    try {
      // Step 1: Parse CSV files
      const rawData = await this.parseCSVFiles();
      
      // Step 2: Synchronize data streams
      const synchronizedData = this.synchronizeStreams(rawData);
      
      // Step 3: Extract optimal segment
      const segmentData = this.extractOptimalSegment(synchronizedData);
      
      // Step 4: Apply preprocessing
      const processedData = this.applyPreprocessing(segmentData);
      
      // Step 5: Generate ground truth events
      const demoData = this.generateGroundTruth(processedData);
      
      // Step 6: Export optimized JSON
      await this.exportDemoData(demoData);
      
      console.log('🎉 Demo data processing complete!');
      
    } catch (error) {
      console.error('❌ Processing failed:', error.message);
      throw error;
    }
  }
  
  async parseCSVFiles() {
    console.log('📊 Step 1: Parsing CSV files...');
    
    const files = {
      kinetics: join(this.dataDir, 'Kinetics', `Sub1_Kinetics_${this.selectedTrial}.csv`),
      emg: join(this.dataDir, 'EMG', `Sub1_EMG_${this.selectedTrial}.csv`),
      kinematics: join(this.dataDir, 'Kinematics', `Sub1_Kinematics_${this.selectedTrial}.csv`)
    };
    
    // Verify all files exist
    Object.entries(files).forEach(([type, path]) => {
      if (!existsSync(path)) {
        throw new Error(`Missing ${type} file: ${path}`);
      }
    });
    
    // Parse each file
    const rawData = {
      kinetics: CSVParser.parseKinetics(files.kinetics),
      emg: CSVParser.parseEMG(files.emg),
      kinematics: CSVParser.parseKinematics(files.kinematics)
    };
    
    // Validate parsed data
    const validations = {
      kinetics: CSVParser.validateData(rawData.kinetics, 'kinetics'),
      emg: CSVParser.validateData(rawData.emg, 'emg'),
      kinematics: CSVParser.validateData(rawData.kinematics, 'kinematics')
    };
    
    console.log('📋 Data validation results:');
    Object.entries(validations).forEach(([type, validation]) => {
      const status = validation.isValid ? '✅' : '⚠️';
      console.log(`  ${status} ${type}: Score ${validation.quality_score}/5`);
      validation.recommendations.forEach(rec => console.log(`    💡 ${rec}`));
      validation.issues.forEach(issue => console.log(`    ⚠️  ${issue}`));
    });
    
    return rawData;
  }
  
  synchronizeStreams(rawData) {
    console.log('\n🔄 Step 2: Synchronizing data streams...');
    
    const synchronizedData = DataSynchronizer.synchronizeData(
      rawData.kinetics,
      rawData.emg,
      rawData.kinematics
    );
    
    const validation = DataSynchronizer.validateSynchronization(synchronizedData);
    
    if (!validation.isValid) {
      console.log('⚠️  Synchronization issues detected:');
      validation.issues.forEach(issue => console.log(`    - ${issue}`));
    } else {
      console.log('✅ Synchronization successful');
    }
    
    return synchronizedData;
  }
  
  extractOptimalSegment(synchronizedData) {
    console.log(`\n✂️  Step 3: Extracting optimal ${this.segmentDuration}s segment...`);
    
    const totalDuration = synchronizedData.metadata.duration_seconds;
    const samplingRate = synchronizedData.metadata.sampling_rate;
    const segmentSamples = this.segmentDuration * samplingRate;
    
    console.log(`📊 Total duration: ${totalDuration.toFixed(1)}s`);
    console.log(`🎯 Target segment: ${this.segmentDuration}s (${segmentSamples} samples)`);
    
    // Use sliding window to find best segment
    const bestSegment = this.findBestSegment(synchronizedData, segmentSamples);
    
    console.log(`✅ Selected segment: ${bestSegment.startTime.toFixed(1)}s - ${bestSegment.endTime.toFixed(1)}s`);
    console.log(`📈 Quality score: ${bestSegment.qualityScore.toFixed(2)}/10`);
    
    return bestSegment.data;
  }
  
  findBestSegment(data, segmentSamples) {
    console.log('🔍 Analyzing segment quality with sliding window...');
    
    const stepSize = Math.floor(data.metadata.sampling_rate * 2); // 2-second steps
    const totalSamples = data.timestamps.length;
    let bestSegment = null;
    let bestScore = -1;
    
    for (let start = 0; start <= totalSamples - segmentSamples; start += stepSize) {
      const end = start + segmentSamples;
      const startTime = data.timestamps[start];
      const endTime = data.timestamps[end - 1];
      
      // Extract segment data
      const segmentData = this.extractSegmentData(data, start, end);
      
      // Score this segment
      const qualityScore = this.scoreSegmentQuality(segmentData);
      
      if (qualityScore > bestScore) {
        bestScore = qualityScore;
        bestSegment = {
          data: segmentData,
          startTime,
          endTime,
          qualityScore,
          startIndex: start,
          endIndex: end
        };
      }
    }
    
    if (!bestSegment) {
      throw new Error('No suitable segment found');
    }
    
    return bestSegment;
  }
  
  extractSegmentData(data, startIndex, endIndex) {
    const segmentData = {
      metadata: {
        ...data.metadata,
        segment_start_time: data.timestamps[startIndex],
        segment_end_time: data.timestamps[endIndex - 1],
        total_samples: endIndex - startIndex
      },
      timestamps: data.timestamps.slice(startIndex, endIndex),
      force_plates: {
        left_force_plate: {},
        right_force_plate: {}
      },
      emg: {
        channels: {}
      },
      kinematics: {
        markers: {}
      }
    };
    
    // Extract force plate data
    Object.keys(data.force_plates.left_force_plate).forEach(key => {
      segmentData.force_plates.left_force_plate[key] = 
        data.force_plates.left_force_plate[key].slice(startIndex, endIndex);
    });
    
    Object.keys(data.force_plates.right_force_plate).forEach(key => {
      segmentData.force_plates.right_force_plate[key] = 
        data.force_plates.right_force_plate[key].slice(startIndex, endIndex);
    });
    
    // Extract EMG data
    Object.keys(data.emg.channels).forEach(channel => {
      segmentData.emg.channels[channel] = 
        data.emg.channels[channel].slice(startIndex, endIndex);
    });
    
    // Extract kinematics data
    Object.keys(data.kinematics.markers).forEach(marker => {
      segmentData.kinematics.markers[marker] = {
        x: data.kinematics.markers[marker].x.slice(startIndex, endIndex),
        y: data.kinematics.markers[marker].y.slice(startIndex, endIndex),
        z: data.kinematics.markers[marker].z.slice(startIndex, endIndex)
      };
    });
    
    return segmentData;
  }
  
  scoreSegmentQuality(segmentData) {
    let score = 0;
    
    // Score 1: Force pattern consistency (0-3 points)
    const rightForces = segmentData.force_plates.right_force_plate.fz;
    const forceVariability = this.calculateVariability(rightForces);
    if (forceVariability < 0.5) score += 3;
    else if (forceVariability < 1.0) score += 2;
    else score += 1;
    
    // Score 2: Clear gait events (0-3 points)
    const gaitEvents = this.detectGaitEvents(rightForces);
    if (gaitEvents.length >= 3) score += 3;
    else if (gaitEvents.length >= 2) score += 2;
    else score += 1;
    
    // Score 3: Constraint visibility (0-2 points)
    const leftForces = segmentData.force_plates.left_force_plate.fz;
    const rightLoadingAvg = rightForces.filter(f => Math.abs(f) > 100).reduce((sum, f) => sum + Math.abs(f), 0) / rightForces.filter(f => Math.abs(f) > 100).length || 0;
    const leftLoadingAvg = leftForces.filter(f => Math.abs(f) > 100).reduce((sum, f) => sum + Math.abs(f), 0) / leftForces.filter(f => Math.abs(f) > 100).length || 0.1;
    
    const asymmetryRatio = rightLoadingAvg / leftLoadingAvg;
    if (asymmetryRatio > 3.0 || leftLoadingAvg < 10) score += 2;
    else if (asymmetryRatio > 1.5) score += 1;
    
    // Score 4: Data quality (0-2 points)
    const hasValidData = rightForces.every(f => !isNaN(f)) && 
                        leftForces.every(f => !isNaN(f));
    if (hasValidData) score += 2;
    else score += 1;
    
    return score;
  }
  
  calculateVariability(data) {
    const mean = data.reduce((sum, val) => sum + Math.abs(val), 0) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(Math.abs(val) - mean, 2), 0) / data.length;
    return Math.sqrt(variance) / (mean || 1);
  }
  
  detectGaitEvents(forces) {
    const events = [];
    const threshold = 100; // Newton threshold for heel strike/toe off
    let inStance = false;
    
    for (let i = 1; i < forces.length; i++) {
      const prevForce = Math.abs(forces[i - 1]);
      const currForce = Math.abs(forces[i]);
      
      if (!inStance && currForce > threshold && prevForce <= threshold) {
        events.push({ type: 'heel_strike', index: i });
        inStance = true;
      } else if (inStance && currForce <= threshold && prevForce > threshold) {
        events.push({ type: 'toe_off', index: i });
        inStance = false;
      }
    }
    
    return events;
  }
  
  applyPreprocessing(segmentData) {
    console.log('\n🔧 Step 4: Applying preprocessing...');
    
    // Apply basic filtering and normalization
    const processedData = JSON.parse(JSON.stringify(segmentData)); // Deep copy
    
    // Force plate preprocessing: correct sign convention (positive = loading)
    this.correctForceSignConvention(processedData);
    
    // EMG preprocessing: envelope detection
    this.processEMGSignals(processedData);
    
    console.log('✅ Preprocessing complete');
    return processedData;
  }
  
  correctForceSignConvention(data) {
    // Flip sign convention: multiply by -1 so positive = loading
    ['left_force_plate', 'right_force_plate'].forEach(plate => {
      ['fx', 'fy', 'fz'].forEach(component => {
        const forces = data.force_plates[plate][component];
        
        for (let i = 0; i < forces.length; i++) {
          forces[i] = -forces[i]; // Flip sign: positive = loading
        }
      });
    });
  }
  
  processEMGSignals(data) {
    Object.keys(data.emg.channels).forEach(channel => {
      const signal = data.emg.channels[channel];
      
      // Simple envelope detection (absolute value + smoothing)
      for (let i = 0; i < signal.length; i++) {
        signal[i] = Math.abs(signal[i]);
      }
      
      // Moving average smoothing (window size: 50 samples = 50ms)
      const windowSize = 50;
      for (let i = windowSize; i < signal.length - windowSize; i++) {
        let sum = 0;
        for (let j = i - windowSize; j <= i + windowSize; j++) {
          sum += signal[j];
        }
        signal[i] = sum / (2 * windowSize + 1);
      }
    });
  }
  
  generateGroundTruth(processedData) {
    console.log('\n🎯 Step 5: Generating ground truth events...');
    
    const rightForces = processedData.force_plates.right_force_plate.fz;
    const events = this.detectGaitEvents(rightForces);
    
    const groundTruthEvents = events.map(event => ({
      time: processedData.timestamps[event.index],
      type: event.type,
      leg: 'right',
      confidence: 0.95,
      detection_method: 'force_threshold'
    }));
    
    console.log(`✅ Generated ${groundTruthEvents.length} ground truth events`);
    
    const demoData = {
      ...processedData,
      ground_truth_events: groundTruthEvents,
      trial_info: {
        subject: 'Sub1',
        trial: this.selectedTrial,
        condition: 'left_leg_locked_extension',
        constraint: 'Left knee locked in full extension',
        clinical_significance: 'Demonstrates AI adaptation to pathological gait patterns'
      }
    };
    
    return demoData;
  }
  
  async exportDemoData(demoData) {
    console.log('\n💾 Step 6: Exporting optimized JSON...');
    
    // Optimize data for file size
    const optimizedData = this.optimizeForFileSize(demoData);
    
    // Generate main demo file
    const demoFile = join(this.outputDir, `${this.selectedTrial}-demo.json`);
    const jsonString = JSON.stringify(optimizedData, null, 0); // No formatting to save space
    
    writeFileSync(demoFile, jsonString);
    
    const fileSize = Buffer.byteLength(jsonString, 'utf8');
    const fileSizeKB = Math.round(fileSize / 1024);
    
    console.log(`✅ Demo data exported: ${demoFile}`);
    console.log(`📦 File size: ${fileSizeKB} KB`);
    
    if (fileSizeKB > 500) {
      console.log('⚠️  Warning: File size exceeds 500KB target');
    }
    
    // Generate metadata file
    const metadataFile = join(this.outputDir, `${this.selectedTrial}-metadata.json`);
    const metadata = {
      trial_id: this.selectedTrial,
      processing_date: new Date().toISOString(),
      data_summary: {
        duration_seconds: demoData.metadata.total_samples / 1000,
        sampling_rate: demoData.metadata.sampling_rate,
        gait_events: demoData.ground_truth_events.length,
        constraint_type: 'left_leg_locked_extension'
      },
      file_size_kb: fileSizeKB,
      quality_metrics: {
        constraint_visibility: 'excellent',
        data_completeness: 'complete',
        processing_status: 'success'
      }
    };
    
    writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));
    console.log(`✅ Metadata exported: ${metadataFile}`);
    
    return {
      demo_file: demoFile,
      metadata_file: metadataFile,
      file_size_kb: fileSizeKB
    };
  }
  
  optimizeForFileSize(demoData) {
    console.log('🗜️  Optimizing data for file size...');
    
    const optimized = JSON.parse(JSON.stringify(demoData)); // Deep copy
    
    // Round numerical values to reduce precision
    const roundToDecimals = (value, decimals) => {
      if (typeof value !== 'number' || isNaN(value)) return value;
      return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
    };
    
    // Round force data to 1 decimal place
    ['left_force_plate', 'right_force_plate'].forEach(plate => {
      Object.keys(optimized.force_plates[plate]).forEach(component => {
        optimized.force_plates[plate][component] = 
          optimized.force_plates[plate][component].map(v => roundToDecimals(v, 1));
      });
    });
    
    // Round EMG data to 6 decimal places (scientific notation range)
    Object.keys(optimized.emg.channels).forEach(channel => {
      optimized.emg.channels[channel] = 
        optimized.emg.channels[channel].map(v => roundToDecimals(v, 6));
    });
    
    // Round kinematics to 1 decimal place (mm precision)
    Object.keys(optimized.kinematics.markers).forEach(marker => {
      ['x', 'y', 'z'].forEach(axis => {
        optimized.kinematics.markers[marker][axis] = 
          optimized.kinematics.markers[marker][axis].map(v => roundToDecimals(v, 1));
      });
    });
    
    // Round timestamps to 3 decimal places (ms precision)
    optimized.timestamps = optimized.timestamps.map(t => roundToDecimals(t, 3));
    
    // Reduce EMG channels to key muscles only (reduce from 16 to 8 channels)
    const keyChannels = ['emg1', 'emg2', 'emg3', 'emg4', 'emg9', 'emg10', 'emg11', 'emg12'];
    const reducedEMG = {};
    keyChannels.forEach(channel => {
      if (optimized.emg.channels[channel]) {
        reducedEMG[channel] = optimized.emg.channels[channel];
      }
    });
    optimized.emg.channels = reducedEMG;
    
    console.log(`✅ Data optimization complete - reduced EMG channels to ${Object.keys(reducedEMG).length}`);
    
    return optimized;
  }
}

// Run processing if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const forceReprocess = args.includes('--force');
  const selectedTrial = args.find(arg => !arg.startsWith('--')) || 'T5';
  
  const processor = new DemoDataProcessor({
    selectedTrial,
    forceReprocess
  });
  
  processor.processTrialData().catch(error => {
    console.error('❌ Processing failed:', error);
    process.exit(1);
  });
}

export default DemoDataProcessor;