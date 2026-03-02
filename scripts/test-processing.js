#!/usr/bin/env node

/**
 * Test Processing Pipeline - Quick validation with small data segment
 * Tests the complete pipeline with a 5-second segment for rapid validation
 */

import { CSVParser } from './csv-parser.js';
import { DataSynchronizer } from './data-synchronizer.js';
import { join } from 'path';

async function testProcessing() {
  console.log('🧪 Testing data processing pipeline with small segment...\n');
  
  try {
    // Step 1: Parse just first 5 seconds of T5 data
    console.log('📊 Step 1: Parsing CSV files (first 5000 samples)...');
    
    const files = {
      kinetics: './data/Sub1/Kinetics/Sub1_Kinetics_T5.csv',
      emg: './data/Sub1/EMG/Sub1_EMG_T5.csv',
      kinematics: './data/Sub1/Kinematics/Sub1_Kinematics_T5.csv'
    };
    
    // Parse files with limited samples for testing
    const rawData = {
      kinetics: await parsePartialCSV(files.kinetics, 'kinetics', 5000),
      emg: await parsePartialCSV(files.emg, 'emg', 10000),
      kinematics: await parsePartialCSV(files.kinematics, 'kinematics', 500)
    };
    
    console.log('✅ Partial data parsed successfully');
    
    // Step 2: Test synchronization
    console.log('\n🔄 Step 2: Testing synchronization...');
    const syncedData = DataSynchronizer.synchronizeData(
      rawData.kinetics,
      rawData.emg,
      rawData.kinematics
    );
    
    const validation = DataSynchronizer.validateSynchronization(syncedData);
    console.log('✅ Synchronization test:', validation.isValid ? 'PASSED' : 'FAILED');
    
    // Step 3: Test data quality
    console.log('\n📊 Step 3: Data quality assessment...');
    
    const stats = {
      duration: syncedData.metadata.duration_seconds,
      samples: syncedData.metadata.total_samples,
      force_data: {
        left_avg: syncedData.force_plates.left_force_plate.fz.reduce((sum, f) => sum + Math.abs(f), 0) / syncedData.force_plates.left_force_plate.fz.length,
        right_avg: syncedData.force_plates.right_force_plate.fz.reduce((sum, f) => sum + Math.abs(f), 0) / syncedData.force_plates.right_force_plate.fz.length
      },
      emg_channels: Object.keys(syncedData.emg.channels).length,
      markers: Object.keys(syncedData.kinematics.markers).length
    };
    
    console.log('📋 Test Results:');
    console.log(`  Duration: ${stats.duration.toFixed(1)}s`);
    console.log(`  Samples: ${stats.samples}`);
    console.log(`  Force asymmetry: ${(stats.force_data.right_avg / (stats.force_data.left_avg || 0.1)).toFixed(1)}:1`);
    console.log(`  EMG channels: ${stats.emg_channels}`);
    console.log(`  Kinematics markers: ${stats.markers}`);
    
    // Constraint pattern check
    const constraintQuality = stats.force_data.left_avg < 10 && stats.force_data.right_avg > 100 ? 'EXCELLENT' :
                             stats.force_data.right_avg > stats.force_data.left_avg * 2 ? 'GOOD' : 'FAIR';
    
    console.log(`  Constraint pattern: ${constraintQuality}`);
    
    console.log('\n🎉 Pipeline test completed successfully!');
    console.log('✅ Ready for full T5 data processing');
    
  } catch (error) {
    console.error('❌ Pipeline test failed:', error.message);
    throw error;
  }
}

async function parsePartialCSV(filePath, dataType, maxSamples) {
  console.log(`  Testing ${dataType}: ${filePath} (${maxSamples} samples)`);
  
  // For testing, we'll just parse normally but truncate the results
  let fullData;
  if (dataType === 'kinetics') {
    fullData = CSVParser.parseKinetics(filePath);
  } else if (dataType === 'emg') {
    fullData = CSVParser.parseEMG(filePath);
  } else if (dataType === 'kinematics') {
    fullData = CSVParser.parseKinematics(filePath);
  } else {
    throw new Error(`Unknown data type: ${dataType}`);
  }
  
  // Truncate to test size
  const truncatedData = {
    ...fullData,
    metadata: {
      ...fullData.metadata,
      total_samples: Math.min(maxSamples, fullData.metadata.total_samples),
      duration_seconds: Math.min(maxSamples, fullData.metadata.total_samples) / fullData.metadata.sampling_rate
    }
  };
  
  if (dataType === 'kinetics') {
    truncatedData.timestamps = fullData.timestamps.slice(0, maxSamples);
    ['left_force_plate', 'right_force_plate'].forEach(plate => {
      Object.keys(fullData[plate]).forEach(component => {
        truncatedData[plate][component] = fullData[plate][component].slice(0, maxSamples);
      });
    });
  } else if (dataType === 'emg') {
    truncatedData.timestamps = fullData.timestamps.slice(0, maxSamples);
    Object.keys(fullData.channels).forEach(channel => {
      truncatedData.channels[channel] = fullData.channels[channel].slice(0, maxSamples);
    });
  } else if (dataType === 'kinematics') {
    truncatedData.timestamps = fullData.timestamps.slice(0, maxSamples);
    Object.keys(fullData.markers).forEach(marker => {
      ['x', 'y', 'z'].forEach(axis => {
        truncatedData.markers[marker][axis] = fullData.markers[marker][axis].slice(0, maxSamples);
      });
    });
  }
  
  return truncatedData;
}

// Run test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testProcessing().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}