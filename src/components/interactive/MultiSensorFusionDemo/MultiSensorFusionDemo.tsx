/**
 * Multi-Sensor Fusion Demo - Phase B1
 * Traditional force plate detection with real-time visualization
 */

import React, { useEffect } from 'react';
import { useDataLoader } from './hooks/useDataLoader';
import { useTraditionalDetection } from './hooks/useTraditionalDetection';
import { useDemoStore } from './store';
import { ForceChart } from './components/ForceChart';
import { ThresholdControls } from './components/ThresholdControls';
import { DetectionStats } from './components/DetectionStats';
import { GaitAnalysisPanel } from './components/GaitAnalysisPanel';
import { 
  GaitAnalysisCollapsiblePanel, 
  AlgorithmInsightsCollapsiblePanel,
  CollapsiblePanel 
} from './components/CollapsiblePanel';

interface MultiSensorFusionDemoProps {
  trialId?: string;
  autoStart?: boolean;
  className?: string;
}

export default function MultiSensorFusionDemo({ 
  trialId = 'T5', 
  autoStart = false,
  className = '' 
}: MultiSensorFusionDemoProps) {
  // Load data
  const { data: forceData, fullData: fullDemoData, isLoading, error, loadingProgress } = useDataLoader(trialId);
  
  // Traditional detection hook
  const {
    result: detectionResult,
    isProcessing,
    config,
    runDetection,
    updateConfig,
    updateConfigDebounced,
    resetConfig,
    events: detectedEvents
  } = useTraditionalDetection();
  
  // Store integration
  const { 
    setData, 
    setDetectedEvents,
    currentTime,
    isDataLoaded 
  } = useDemoStore();

  // Load data into store when available
  useEffect(() => {
    if (forceData) {
      setData(forceData);
    }
  }, [forceData, setData]);

  // Auto-run detection when data loads or config changes
  useEffect(() => {
    if (forceData && !isProcessing) {
      runDetection(forceData);
    }
  }, [forceData, config, runDetection, isProcessing]);

  // Debug: Log events from detection hook
  useEffect(() => {
    console.log('🎲 Main component - detectedEvents from hook:', detectedEvents.length);
    console.log('🎲 Main component - detectionResult:', detectionResult ? 'exists' : 'null');
    console.log('🎲 Main component - isProcessing:', isProcessing);
  }, [detectedEvents, detectionResult, isProcessing]);

  // Loading state
  if (isLoading) {
    return (
      <div className={`bg-white/5 rounded-xl border border-white/10 p-8 ${className}`}>
        <div className="text-center space-y-4">
          <div className="text-xl font-semibold text-white">
            Loading Constrained Gait Data...
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-burnt-sienna h-2 rounded-full transition-all duration-300"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          <div className="text-sm text-gray-400">
            {loadingProgress}% complete
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`bg-red-500/10 border border-red-500/20 rounded-xl p-8 ${className}`}>
        <div className="text-center space-y-2">
          <div className="text-xl font-semibold text-red-400">
            Error Loading Demo
          </div>
          <div className="text-red-300">
            {error}
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-white transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // No data state (only show after loading attempt)
  if (!forceData && !isLoading) {
    return (
      <div className={`bg-white/5 rounded-xl border border-white/10 p-8 ${className}`}>
        <div className="text-center text-gray-400">
          No data available
        </div>
      </div>
    );
  }
  
  // Initial state - show loading even before useDataLoader starts
  if (!forceData) {
    return (
      <div className={`bg-white/5 rounded-xl border border-white/10 p-8 ${className}`}>
        <div className="text-center space-y-4">
          <div className="text-xl font-semibold text-white">
            Loading Constrained Gait Data...
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-burnt-sienna h-2 rounded-full transition-all duration-300"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          <div className="text-sm text-gray-400">
            {loadingProgress}% complete
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 md:space-y-6 ${className}`}>
      {/* Demo Header */}
      <div className="bg-gradient-to-br from-white/10 via-white/5 to-white/5 rounded-xl border border-white/20 p-6 relative overflow-hidden">
        {/* Background accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-burnt-sienna/20 to-transparent rounded-full blur-2xl"></div>
        
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                <span className="bg-gradient-to-r from-burnt-sienna via-royal-purple to-indigo bg-clip-text text-transparent">
                  Multi-Sensor Fusion Demo
                </span>
              </h2>
              <p className="text-lg text-gray-300 mb-4 max-w-2xl">
                Interactive demonstration comparing traditional force plate detection with multi-sensor fusion approaches 
                for constrained gait analysis using real biomechanics data.
              </p>
            </div>
            
            {/* Status Badge */}
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-green-400/20 border border-green-400/30 rounded-full">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400 text-sm font-medium">Live Demo</span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="space-y-2">
              <h3 className="font-semibold text-burnt-sienna flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Dataset Context
              </h3>
              <p className="text-gray-300 leading-relaxed">
                Real constrained gait data (left leg locked in extension) representing conditions like knee contracture 
                or post-surgical bracing where traditional single-sensor methods show limitations.
              </p>
              <div className="text-xs text-gray-500 mt-3 pt-2 border-t border-gray-700/50">
                <strong>Data Source:</strong> Bacek, Tomislav (2024). Biomechanics and energetics of neurotypical (un)constrained walking [Bacek2023] - CSV format (raw). 
                The University of Melbourne. Dataset. 
                <a 
                  href="https://doi.org/10.26188/24296032.v1" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-burnt-sienna hover:text-burnt-sienna/80 underline ml-1"
                >
                  https://doi.org/10.26188/24296032.v1
                </a>
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold text-royal-purple flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Fusion Approach
              </h3>
              <p className="text-gray-300 leading-relaxed">
                Demonstrates multi-sensor fusion techniques combining force plates, EMG, and kinematics 
                for improved gait event detection in challenging biomechanics scenarios.
              </p>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold text-indigo-400 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Live Metrics
              </h3>
              <div className="space-y-1 text-gray-300">
                <div>Events Detected: <span className="font-semibold text-green-400">{detectedEvents.length}</span></div>
                <div>Duration: <span className="font-semibold text-blue-400">{forceData ? `${forceData.duration.toFixed(1)}s` : '-'}</span></div>
                <div className="flex items-center gap-2">
                  <span>Status:</span>
                  {isProcessing ? (
                    <span className="text-burnt-sienna font-semibold">Processing...</span>
                  ) : detectedEvents.length > 0 ? (
                    <span className="text-green-400 font-semibold">✓ Complete</span>
                  ) : (
                    <span className="text-gray-400">Ready</span>
                  )}
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>

      {/* Force Chart */}
      {forceData && (
        <ForceChart 
          key={`chart-${detectedEvents.length}-${detectedEvents[0]?.time || 0}`}
          forceData={forceData}
          detectedEvents={detectedEvents}
          currentTime={currentTime}
        />
      )}

      {/* Controls and Stats Layout */}
      <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
        {/* Threshold Controls */}
        <CollapsiblePanel
          title="Detection Thresholds"
          mobileDefault="open"
          titleIcon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
            </svg>
          }
        >
          <ThresholdControls
            heelStrikeThreshold={config.heel_strike_threshold}
            toeOffThreshold={config.toe_off_threshold}
            onHeelStrikeChange={(value) => updateConfigDebounced({ heel_strike_threshold: value })}
            onToeOffChange={(value) => updateConfigDebounced({ toe_off_threshold: value })}
            onReset={resetConfig}
            standalone={false}
          />
        </CollapsiblePanel>

        {/* Detection Statistics */}
        <CollapsiblePanel
          title="Detection Statistics"
          mobileDefault="open"
          titleIcon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        >
          <DetectionStats
            events={detectedEvents}
            processingTime={detectionResult?.processingTime || 0}
            isProcessing={isProcessing}
            standalone={false}
          />
        </CollapsiblePanel>
      </div>

      {/* Gait Analysis Panel */}
      {forceData && detectedEvents.length > 0 && (
        <GaitAnalysisCollapsiblePanel>
          <GaitAnalysisPanel 
            events={detectedEvents}
            duration={forceData.duration}
            demoData={fullDemoData}
          />
        </GaitAnalysisCollapsiblePanel>
      )}


      {/* Algorithm Insights */}
      <AlgorithmInsightsCollapsiblePanel>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="space-y-2">
            <h4 className="font-semibold text-burnt-sienna">Fixed Thresholds</h4>
            <p className="text-gray-300">
              Uses rigid force thresholds that don't adapt to individual constraints or 
              compensatory movement patterns.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-burnt-sienna">Asymmetry Issues</h4>
            <p className="text-gray-300">
              Constrained left leg creates reduced loading that may fall below detection 
              thresholds, leading to missed events.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-burnt-sienna">Single Sensor Limitation</h4>
            <p className="text-gray-300">
              Relies only on force data without incorporating EMG muscle activation or 
              kinematic compensation patterns.
            </p>
          </div>
        </div>
      </AlgorithmInsightsCollapsiblePanel>
    </div>
  );
}