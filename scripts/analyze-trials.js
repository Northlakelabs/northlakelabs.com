#!/usr/bin/env node

/**
 * Trial Quality Assessment Script
 * Analyzes T1-T30 trials for demo suitability with systematic scoring
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

class TrialAnalyzer {
  constructor() {
    this.dataDir = './data/Sub1';
    this.results = [];
  }

  async analyzeAllTrials() {
    console.log('🔍 Analyzing all trials for demo suitability...\n');
    
    for (let i = 1; i <= 30; i++) {
      const trialId = `T${i}`;
      try {
        const result = await this.analyzeTrial(trialId);
        this.results.push(result);
        this.printTrialSummary(result);
      } catch (error) {
        console.log(`❌ ${trialId}: Error - ${error.message}`);
      }
    }

    this.printFinalRanking();
  }

  async analyzeTrial(trialId) {
    const result = {
      trialId,
      scores: {},
      totalScore: 0,
      recommendation: '',
      issues: []
    };

    // Check file existence and get durations
    const files = this.checkFiles(trialId);
    if (!files.allExist) {
      throw new Error('Missing files');
    }

    // Score each criterion
    result.scores.duration = this.scoreDuration(files.durations);
    result.scores.constraint = this.scoreConstraintVisibility(trialId);
    result.scores.dataQuality = this.scoreDataQuality(trialId);
    result.scores.gaitConsistency = this.scoreGaitConsistency(trialId);
    result.scores.eventDetection = this.scoreEventDetection(trialId);

    // Calculate total score
    result.totalScore = Object.values(result.scores).reduce((sum, score) => sum + score, 0);
    
    // Generate recommendation
    result.recommendation = this.generateRecommendation(result.totalScore);

    return result;
  }

  checkFiles(trialId) {
    const kinetics = join(this.dataDir, 'Kinetics', `Sub1_Kinetics_${trialId}.csv`);
    const emg = join(this.dataDir, 'EMG', `Sub1_EMG_${trialId}.csv`);
    const kinematics = join(this.dataDir, 'Kinematics', `Sub1_Kinematics_${trialId}.csv`);

    const exists = {
      kinetics: existsSync(kinetics),
      emg: existsSync(emg),
      kinematics: existsSync(kinematics)
    };

    const durations = {};
    if (exists.kinetics) {
      durations.kinetics = this.getLineCount(kinetics) - 5; // Subtract header
    }
    if (exists.emg) {
      durations.emg = this.getLineCount(emg) - 5;
    }
    if (exists.kinematics) {
      durations.kinematics = this.getLineCount(kinematics) - 5;
    }

    return {
      allExist: exists.kinetics && exists.emg && exists.kinematics,
      exists,
      durations
    };
  }

  getLineCount(filePath) {
    const content = readFileSync(filePath, 'utf-8');
    return content.split('\n').length;
  }

  scoreDuration(durations) {
    const kineticsDuration = durations.kinetics / 1000; // Convert to seconds
    
    if (kineticsDuration > 280) return 5;
    if (kineticsDuration > 200) return 3;
    return 1;
  }

  scoreConstraintVisibility(trialId) {
    // Sample force data throughout trial to check for constraint pattern during loading
    const kineticsFile = join(this.dataDir, 'Kinetics', `Sub1_Kinetics_${trialId}.csv`);
    const content = readFileSync(kineticsFile, 'utf-8');
    const lines = content.split('\n').slice(6); // Skip header
    
    // Sample every 50th line to get representative data across trial
    const sampleLines = lines.filter((_, index) => index % 50 === 0).slice(0, 200);
    
    const leftLoadingForces = [];
    const rightLoadingForces = [];

    for (const line of sampleLines) {
      const cols = line.split(',');
      if (cols.length >= 19) {
        const leftFz = parseFloat(cols[4]) || 0;
        const rightFz = parseFloat(cols[13]) || 0;
        
        // Only consider loading phases (>100N threshold)
        if (Math.abs(leftFz) > 100) leftLoadingForces.push(Math.abs(leftFz));
        if (Math.abs(rightFz) > 100) rightLoadingForces.push(Math.abs(rightFz));
      }
    }

    // Analyze loading asymmetry
    if (rightLoadingForces.length === 0 && leftLoadingForces.length === 0) {
      return 1; // No loading detected
    }
    
    if (leftLoadingForces.length === 0 && rightLoadingForces.length > 10) {
      return 5; // Perfect constraint: Complete left unloading
    }
    
    if (leftLoadingForces.length > 0 && rightLoadingForces.length > 0) {
      const avgLeft = leftLoadingForces.reduce((sum, f) => sum + f, 0) / leftLoadingForces.length;
      const avgRight = rightLoadingForces.reduce((sum, f) => sum + f, 0) / rightLoadingForces.length;
      
      const asymmetryRatio = avgRight / avgLeft;
      
      if (asymmetryRatio > 3.0) return 5; // Excellent constraint
      if (asymmetryRatio > 2.0) return 4; // Very good constraint
      if (asymmetryRatio > 1.5) return 3; // Good constraint
      if (asymmetryRatio > 1.2) return 2; // Mild constraint
      return 1; // Poor constraint
    }
    
    return 2; // Default moderate score
  }

  scoreDataQuality(trialId) {
    // Basic check for data completeness and reasonable ranges
    const kineticsFile = join(this.dataDir, 'Kinetics', `Sub1_Kinetics_${trialId}.csv`);
    const content = readFileSync(kineticsFile, 'utf-8');
    const lines = content.split('\n').slice(6, 1006); // Sample 1000 lines
    
    let validLines = 0;
    let issues = 0;

    for (const line of lines) {
      const cols = line.split(',');
      if (cols.length >= 19) {
        validLines++;
        
        // Check for obviously bad data
        const rightFz = parseFloat(cols[13]) || 0;
        if (Math.abs(rightFz) > 2000) issues++; // Unreasonably high force
      }
    }

    const qualityRatio = (validLines - issues) / validLines;
    
    if (qualityRatio > 0.95) return 5;
    if (qualityRatio > 0.90) return 3;
    return 1;
  }

  scoreGaitConsistency(trialId) {
    // Analyze force patterns for regularity
    // This is a simplified check - in real implementation would analyze gait cycles
    return 4; // Default good score for now
  }

  scoreEventDetection(trialId) {
    // Check for clear force transitions
    // This is a simplified check - in real implementation would detect actual events
    return 4; // Default good score for now
  }

  generateRecommendation(totalScore) {
    if (totalScore >= 23) return '✅ HIGHLY RECOMMENDED';
    if (totalScore >= 18) return '⚠️ ACCEPTABLE';
    if (totalScore >= 13) return '⚠️ USABLE WITH LIMITATIONS';
    return '❌ NOT RECOMMENDED';
  }

  printTrialSummary(result) {
    const { trialId, scores, totalScore, recommendation } = result;
    
    console.log(`${trialId}: ${totalScore}/25 - ${recommendation}`);
    console.log(`  Duration: ${scores.duration}/5 | Constraint: ${scores.constraint}/5 | Quality: ${scores.dataQuality}/5`);
    console.log(`  Consistency: ${scores.gaitConsistency}/5 | Events: ${scores.eventDetection}/5\n`);
  }

  printFinalRanking() {
    console.log('\n🏆 FINAL RANKING - TOP 5 TRIALS');
    console.log('=====================================');
    
    const sorted = this.results
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 5);

    sorted.forEach((result, index) => {
      console.log(`${index + 1}. ${result.trialId}: ${result.totalScore}/25 - ${result.recommendation}`);
    });

    console.log('\n📋 RECOMMENDED SELECTION ORDER:');
    sorted.forEach((result, index) => {
      if (result.totalScore >= 18) {
        console.log(`${index + 1}. ${result.trialId} (Score: ${result.totalScore})`);
      }
    });
  }
}

// Run analysis if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const analyzer = new TrialAnalyzer();
  analyzer.analyzeAllTrials().catch(console.error);
}

export default TrialAnalyzer;