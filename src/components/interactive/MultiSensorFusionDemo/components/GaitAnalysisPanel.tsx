/**
 * Gait Analysis Panel
 * Displays clinical gait metrics calculated from detected events
 */

import React from 'react';
import type { DetectedEvent } from '../algorithms/utils';
import type { DemoData } from '../../../../utils/types';
import { GaitAnalyzer, type GaitMetrics } from '../algorithms/gaitAnalysis';

interface GaitAnalysisPanelProps {
  events: DetectedEvent[];
  duration: number;
  demoData?: DemoData;
  className?: string;
}

interface MetricDisplayProps {
  label: string;
  leftValue?: number;
  rightValue?: number;
  unit: string;
  format?: 'decimal' | 'integer' | 'percentage';
  colorThreshold?: { good: number; fair: number };
  description?: string;
}

function MetricDisplay({ 
  label, 
  leftValue, 
  rightValue, 
  unit, 
  format = 'decimal',
  colorThreshold,
  description 
}: MetricDisplayProps) {
  const formatValue = (value: number) => {
    if (format === 'integer') return Math.round(value).toString();
    if (format === 'percentage') return `${value.toFixed(1)}%`;
    return value.toFixed(3);
  };

  const getValueColor = (value: number) => {
    if (!colorThreshold) return 'text-white';
    if (value <= colorThreshold.good) return 'text-green-400';
    if (value <= colorThreshold.fair) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-white/5 rounded-lg p-3 hover:bg-white/10 transition-colors group">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-300 group-hover:text-gray-200">
          {label}
        </span>
        <span className="text-xs text-gray-500">{unit}</span>
      </div>
      
      {leftValue !== undefined && rightValue !== undefined ? (
        <div className="grid grid-cols-2 gap-2">
          <div className="text-center">
            <div className="text-xs text-blue-400 mb-1">Left</div>
            <div className={`text-lg font-bold ${getValueColor(leftValue)}`}>
              {formatValue(leftValue)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-red-400 mb-1">Right</div>
            <div className={`text-lg font-bold ${getValueColor(rightValue)}`}>
              {formatValue(rightValue)}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center">
          <div className={`text-xl font-bold ${getValueColor(leftValue || rightValue || 0)}`}>
            {formatValue(leftValue || rightValue || 0)}
          </div>
        </div>
      )}
      
      {description && (
        <div className="text-xs text-gray-500 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {description}
        </div>
      )}
    </div>
  );
}

export function GaitAnalysisPanel({ events, duration, demoData, className = '' }: GaitAnalysisPanelProps) {
  console.log('🔍 GaitAnalysisPanel - Props:', { 
    eventsCount: events.length, 
    duration, 
    demoDataExists: !!demoData,
    demoDataKeys: demoData ? Object.keys(demoData) : []
  });
  
  const metrics: GaitMetrics = GaitAnalyzer.analyzeGait(events, duration, demoData);
  
  console.log('📊 GaitAnalysisPanel - Metrics:', {
    hasForceMetrics: !!metrics.forceMetrics,
    totalSteps: metrics.totalSteps,
    metricsKeys: Object.keys(metrics)
  });

  const temporalMetrics = [
    {
      label: 'Stance Time',
      leftValue: metrics.avgStanceTime.left,
      rightValue: metrics.avgStanceTime.right,
      unit: 'seconds',
      colorThreshold: { good: 0.7, fair: 0.9 },
      description: 'Time foot is in contact with ground during gait cycle'
    },
    {
      label: 'Swing Time',
      leftValue: metrics.avgSwingTime.left,
      rightValue: metrics.avgSwingTime.right,
      unit: 'seconds',
      colorThreshold: { good: 0.5, fair: 0.7 },
      description: 'Time foot is in air during gait cycle'
    },
    {
      label: 'Stride Time',
      leftValue: metrics.avgStrideTime.left,
      rightValue: metrics.avgStrideTime.right,
      unit: 'seconds',
      colorThreshold: { good: 1.2, fair: 1.5 },
      description: 'Time between consecutive heel strikes of same foot'
    },
    {
      label: 'Step Time',
      leftValue: metrics.avgStepTime.left,
      rightValue: metrics.avgStepTime.right,
      unit: 'seconds',
      colorThreshold: { good: 0.6, fair: 0.8 },
      description: 'Time between consecutive heel strikes of opposite feet'
    }
  ];

  const frequencyMetrics = [
    {
      label: 'Cadence',
      leftValue: metrics.cadence,
      unit: 'steps/min',
      format: 'integer' as const,
      colorThreshold: { good: 120, fair: 100 },
      description: 'Number of steps per minute'
    },
    {
      label: 'Stride Frequency',
      leftValue: metrics.strideFrequency.left,
      rightValue: metrics.strideFrequency.right,
      unit: 'strides/min',
      format: 'integer' as const,
      colorThreshold: { good: 60, fair: 50 },
      description: 'Number of strides per minute for each leg'
    }
  ];

  const asymmetryMetrics = [
    {
      label: 'Stance Asymmetry',
      leftValue: metrics.stanceTimeAsymmetry,
      unit: '%',
      format: 'percentage' as const,
      colorThreshold: { good: 5, fair: 10 },
      description: 'Percentage difference in stance time between legs'
    },
    {
      label: 'Swing Asymmetry',
      leftValue: metrics.swingTimeAsymmetry,
      unit: '%',
      format: 'percentage' as const,
      colorThreshold: { good: 5, fair: 10 },
      description: 'Percentage difference in swing time between legs'
    },
    {
      label: 'Stride Asymmetry',
      leftValue: metrics.strideTimeAsymmetry,
      unit: '%',
      format: 'percentage' as const,
      colorThreshold: { good: 5, fair: 10 },
      description: 'Percentage difference in stride time between legs'
    }
  ];

  const variabilityMetrics = [
    {
      label: 'Stride Variability',
      leftValue: metrics.strideTimeCV.left,
      rightValue: metrics.strideTimeCV.right,
      unit: 'CV%',
      format: 'percentage' as const,
      colorThreshold: { good: 3, fair: 5 },
      description: 'Coefficient of variation for stride time consistency'
    },
    {
      label: 'Stance Variability',
      leftValue: metrics.stanceTimeCV.left,
      rightValue: metrics.stanceTimeCV.right,
      unit: 'CV%',
      format: 'percentage' as const,
      colorThreshold: { good: 3, fair: 5 },
      description: 'Coefficient of variation for stance time consistency'
    }
  ];

  return (
    <div className={`bg-white/5 rounded-xl border border-white/10 p-6 space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">
          Gait Analysis
        </h3>
        <div className="text-sm text-gray-400">
          {metrics.totalSteps} steps detected
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white/5 rounded-lg">
        <div className="text-center">
          <div className="text-xs text-gray-400 mb-1">Total Strides</div>
          <div className="text-lg font-bold text-white">
            {metrics.totalStrides.left + metrics.totalStrides.right}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-400 mb-1">Avg Cycle Time</div>
          <div className="text-lg font-bold text-white">
            {metrics.gaitCycleTime.toFixed(2)}s
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-400 mb-1">Left Strides</div>
          <div className="text-lg font-bold text-blue-400">
            {metrics.totalStrides.left}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-400 mb-1">Right Strides</div>
          <div className="text-lg font-bold text-red-400">
            {metrics.totalStrides.right}
          </div>
        </div>
      </div>

      {/* Temporal Parameters */}
      <div>
        <h4 className="text-md font-semibold text-burnt-sienna mb-3">
          Temporal Parameters
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {temporalMetrics.map((metric, index) => (
            <MetricDisplay key={index} {...metric} />
          ))}
        </div>
      </div>

      {/* Frequency Parameters */}
      <div>
        <h4 className="text-md font-semibold text-royal-purple mb-3">
          Frequency & Rhythm
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {frequencyMetrics.map((metric, index) => (
            <MetricDisplay key={index} {...metric} />
          ))}
        </div>
      </div>

      {/* Asymmetry Analysis */}
      <div>
        <h4 className="text-md font-semibold text-orange-400 mb-3">
          Asymmetry Analysis
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {asymmetryMetrics.map((metric, index) => (
            <MetricDisplay key={index} {...metric} />
          ))}
        </div>
      </div>

      {/* Variability Measures */}
      <div>
        <h4 className="text-md font-semibold text-indigo-400 mb-3">
          Gait Consistency
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {variabilityMetrics.map((metric, index) => (
            <MetricDisplay key={index} {...metric} />
          ))}
        </div>
      </div>

      {/* Force & Loading Analysis */}
      {metrics.forceMetrics && (
        <div>
          <h4 className="text-md font-semibold text-green-400 mb-3">
            Force & Loading Analysis
          </h4>
          
          {/* Force Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white/5 rounded-lg mb-4">
            <div className="text-center">
              <div className="text-xs text-gray-400 mb-1">Peak Force Left</div>
              <div className="text-lg font-bold text-blue-400">
                {metrics.forceMetrics.peakForces.left.toFixed(0)}N
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400 mb-1">Peak Force Right</div>
              <div className="text-lg font-bold text-red-400">
                {metrics.forceMetrics.peakForces.right.toFixed(0)}N
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400 mb-1">Force Asymmetry</div>
              <div className="text-lg font-bold text-orange-400">
                {metrics.forceMetrics.peakForces.asymmetry.toFixed(1)}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400 mb-1">Right Leg Load</div>
              <div className="text-lg font-bold text-yellow-400">
                {metrics.forceMetrics.weightDistribution.rightPercentage.toFixed(0)}%
              </div>
            </div>
          </div>

          {/* Detailed Force Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Peak Forces */}
            <MetricDisplay
              label="Peak Ground Reaction Force"
              leftValue={metrics.forceMetrics.peakForces.left}
              rightValue={metrics.forceMetrics.peakForces.right}
              unit="N"
              format="integer"
              colorThreshold={{ good: 800, fair: 600 }}
              description="Maximum vertical force during stance phase"
            />

            {/* Average Stance Force */}
            <MetricDisplay
              label="Average Stance Force"
              leftValue={metrics.forceMetrics.avgStanceForce.left}
              rightValue={metrics.forceMetrics.avgStanceForce.right}
              unit="N"
              format="integer"
              colorThreshold={{ good: 400, fair: 300 }}
              description="Mean force throughout stance phase"
            />

            {/* Loading Rates */}
            <MetricDisplay
              label="Loading Rate"
              leftValue={metrics.forceMetrics.loadingRates.left}
              rightValue={metrics.forceMetrics.loadingRates.right}
              unit="N/s"
              format="integer"
              colorThreshold={{ good: 5000, fair: 3000 }}
              description="Rate of force increase during heel strike"
            />

            {/* Impulse */}
            <MetricDisplay
              label="Force Impulse"
              leftValue={metrics.forceMetrics.impulse.left}
              rightValue={metrics.forceMetrics.impulse.right}
              unit="N⋅s"
              format="integer"
              colorThreshold={{ good: 300, fair: 200 }}
              description="Force-time integral during stance phase"
            />

            {/* Weight Distribution */}
            <MetricDisplay
              label="Weight Distribution"
              leftValue={metrics.forceMetrics.weightDistribution.leftPercentage}
              rightValue={metrics.forceMetrics.weightDistribution.rightPercentage}
              unit="%"
              format="decimal"
              colorThreshold={{ good: 45, fair: 35 }}
              description="Percentage of total weight on each leg"
            />

            {/* Work Done Distribution */}
            <MetricDisplay
              label="Work Contribution"
              leftValue={metrics.forceMetrics.workDone.leftPercentage}
              rightValue={metrics.forceMetrics.workDone.rightPercentage}
              unit="%"
              format="decimal"
              colorThreshold={{ good: 45, fair: 35 }}
              description="Relative work done by each leg"
            />
          </div>

          {/* Force Asymmetry Summary */}
          <div className="mt-4 p-4 bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-lg border border-orange-500/20">
            <h5 className="text-sm font-semibold text-orange-400 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              Constrained Gait Impact Assessment
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <div className="text-orange-300 font-medium">Force Asymmetry Index</div>
                <div className="text-white text-lg font-bold">
                  {metrics.forceMetrics.clinicalIndicators.forceAsymmetryIndex.toFixed(1)}%
                </div>
                <div className="text-gray-400">
                  {metrics.forceMetrics.clinicalIndicators.forceAsymmetryIndex > 20 ? 'Severe asymmetry' : 
                   metrics.forceMetrics.clinicalIndicators.forceAsymmetryIndex > 10 ? 'Moderate asymmetry' : 
                   'Mild asymmetry'}
                </div>
              </div>
              <div>
                <div className="text-orange-300 font-medium">Compensatory Pattern</div>
                <div className="text-white text-lg font-bold capitalize">
                  {metrics.forceMetrics.clinicalIndicators.compensatoryPattern}
                </div>
                <div className="text-gray-400">
                  Right leg compensation level
                </div>
              </div>
              <div>
                <div className="text-orange-300 font-medium">Constraint Impact</div>
                <div className="text-white text-lg font-bold capitalize">
                  {metrics.forceMetrics.clinicalIndicators.constraintImpact}
                </div>
                <div className="text-gray-400">
                  Overall functional impact
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clinical Interpretation */}
      <div className="bg-white/5 rounded-lg p-4 border-l-4 border-orange-400">
        <h4 className="text-sm font-semibold text-orange-400 mb-2">
          Clinical Interpretation
        </h4>
        <div className="text-xs text-gray-400 space-y-1">
          <div>• <strong>Green values:</strong> Within normal range for healthy adults</div>
          <div>• <strong>Yellow values:</strong> Borderline or compensatory patterns</div>
          <div>• <strong>Red values:</strong> Significant deviation suggesting impairment</div>
          <div>• <strong>Asymmetry &gt;10%:</strong> Clinically significant gait asymmetry</div>
          <div>• <strong>High variability (&gt;5%):</strong> Possible motor control issues</div>
          {metrics.forceMetrics && (
            <>
              <div>• <strong>Force asymmetry &gt;20%:</strong> Severe biomechanical compensation</div>
              <div>• <strong>Right leg load &gt;60%:</strong> Significant constraint impact on left leg</div>
              <div>• <strong>Loading rate differences:</strong> Altered ground contact patterns</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}