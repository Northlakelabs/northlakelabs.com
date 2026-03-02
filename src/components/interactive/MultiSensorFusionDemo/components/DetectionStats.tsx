/**
 * Real-time detection statistics display
 * Shows algorithm performance metrics and event counts
 */

import React from 'react';
import type { DetectedEvent } from '../algorithms/utils';

interface DetectionStatsProps {
  events: DetectedEvent[];
  processingTime: number;
  isProcessing: boolean;
  className?: string;
  standalone?: boolean; // New prop to control panel styling
}

interface StatItem {
  label: string;
  value: string | number;
  color?: string;
  description?: string;
}

export function DetectionStats({ 
  events, 
  processingTime, 
  isProcessing, 
  className = '',
  standalone = true
}: DetectionStatsProps) {
  // Calculate basic statistics
  const heelStrikesLeft = events.filter(e => e.type === 'heel_strike' && e.leg === 'left');
  const heelStrikesRight = events.filter(e => e.type === 'heel_strike' && e.leg === 'right');
  const toeOffsLeft = events.filter(e => e.type === 'toe_off' && e.leg === 'left');
  const toeOffsRight = events.filter(e => e.type === 'toe_off' && e.leg === 'right');
  
  const totalEvents = events.length;
  const averageThresholdDeviation = totalEvents > 0 
    ? events.reduce((sum, event) => sum + event.threshold_deviation, 0) / totalEvents 
    : 0;

  // Asymmetry analysis
  const leftEvents = heelStrikesLeft.length + toeOffsLeft.length;
  const rightEvents = heelStrikesRight.length + toeOffsRight.length;
  const asymmetryRatio = leftEvents + rightEvents > 0 
    ? Math.abs(leftEvents - rightEvents) / (leftEvents + rightEvents)
    : 0;

  // Force magnitude analysis for biomechanical insights
  const eventsWithForce = events.filter(e => e.force_magnitude !== undefined);
  const leftHeelForces = heelStrikesLeft.filter(e => e.force_magnitude !== undefined).map(e => e.force_magnitude!);
  const rightHeelForces = heelStrikesRight.filter(e => e.force_magnitude !== undefined).map(e => e.force_magnitude!);
  
  const leftAvgForce = leftHeelForces.length > 0 ? leftHeelForces.reduce((sum, f) => sum + f, 0) / leftHeelForces.length : 0;
  const rightAvgForce = rightHeelForces.length > 0 ? rightHeelForces.reduce((sum, f) => sum + f, 0) / rightHeelForces.length : 0;
  const forceAsymmetry = leftAvgForce > 0 && rightAvgForce > 0 
    ? Math.abs(leftAvgForce - rightAvgForce) / ((leftAvgForce + rightAvgForce) / 2) * 100
    : 0;

  const baseStats: StatItem[] = [
    {
      label: 'Total Events',
      value: totalEvents,
      color: 'text-white',
      description: 'All detected gait events'
    },
    {
      label: 'Left Heel Strikes',
      value: heelStrikesLeft.length,
      color: 'text-blue-400',
      description: 'Left foot contact events'
    },
    {
      label: 'Right Heel Strikes', 
      value: heelStrikesRight.length,
      color: 'text-red-400',
      description: 'Right foot contact events'
    },
    {
      label: 'Left Toe Offs',
      value: toeOffsLeft.length,
      color: 'text-blue-300',
      description: 'Left foot lift events'
    },
    {
      label: 'Right Toe Offs',
      value: toeOffsRight.length,
      color: 'text-red-300', 
      description: 'Right foot lift events'
    },
    {
      label: 'Avg Threshold Deviation',
      value: `${(averageThresholdDeviation * 100).toFixed(1)}%`,
      color: averageThresholdDeviation > 0.7 ? 'text-green-400' : averageThresholdDeviation > 0.4 ? 'text-yellow-400' : 'text-red-400',
      description: 'Average deviation from detection thresholds'
    },
    {
      label: 'Processing Time',
      value: `${processingTime.toFixed(1)}ms`,
      color: 'text-gray-400',
      description: 'Algorithm execution time'
    }
  ];

  // Add force magnitude stats if available
  const forceStats: StatItem[] = eventsWithForce.length > 0 ? [
    {
      label: 'Left Avg Force',
      value: `${leftAvgForce.toFixed(0)}N`,
      color: 'text-blue-400',
      description: 'Average heel strike force magnitude (left leg)'
    },
    {
      label: 'Right Avg Force',
      value: `${rightAvgForce.toFixed(0)}N`,
      color: 'text-red-400',
      description: 'Average heel strike force magnitude (right leg)'
    },
    {
      label: 'Force Asymmetry',
      value: `${forceAsymmetry.toFixed(1)}%`,
      color: forceAsymmetry > 30 ? 'text-orange-400' : forceAsymmetry > 15 ? 'text-yellow-400' : 'text-green-400',
      description: 'Biomechanical force asymmetry between legs'
    }
  ] : [];

  const stats = [...baseStats, ...forceStats];

  const containerClass = standalone 
    ? `bg-white/5 rounded-xl border border-white/10 p-6 ${className}`
    : className;

  return (
    <div className={containerClass}>
      {standalone && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            Detection Statistics
          </h3>
          {isProcessing && (
            <div className="flex items-center gap-2 text-sm text-burnt-sienna">
              <div className="w-2 h-2 bg-burnt-sienna rounded-full animate-pulse"></div>
              Processing...
            </div>
          )}
        </div>
      )}
      
      {!standalone && isProcessing && (
        <div className="flex justify-end mb-4">
          <div className="flex items-center gap-2 text-sm text-burnt-sienna">
            <div className="w-2 h-2 bg-burnt-sienna rounded-full animate-pulse"></div>
            Processing...
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stats.map((stat, index) => (
          <div 
            key={index}
            className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors group"
            title={stat.description}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400 group-hover:text-gray-300">
                {stat.label}
              </span>
              <span className={`text-xl font-bold ${stat.color || 'text-white'}`}>
                {stat.value}
              </span>
            </div>
            {stat.description && (
              <div className="text-xs text-gray-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {stat.description}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Algorithm Performance Indicators */}
      <div className="mt-6 space-y-3">
        <h4 className="text-sm font-semibold text-gray-300">
          Algorithm Performance Indicators
        </h4>
        
        <div className="space-y-2">
          {/* Constraint Detection */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Constraint Pattern Detected</span>
            <div className="flex items-center gap-2">
              {(asymmetryRatio > 0.2 || forceAsymmetry > 20) ? (
                <>
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-sm text-green-400">Yes</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  <span className="text-sm text-yellow-400">Unclear</span>
                </>
              )}
            </div>
          </div>

          {/* Detection Quality */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Detection Quality</span>
            <div className="flex items-center gap-2">
              {averageThresholdDeviation > 0.7 ? (
                <>
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-sm text-green-400">Good</span>
                </>
              ) : averageThresholdDeviation > 0.4 ? (
                <>
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  <span className="text-sm text-yellow-400">Fair</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <span className="text-sm text-red-400">Poor</span>
                </>
              )}
            </div>
          </div>

          {/* Asymmetry Severity */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Gait Asymmetry</span>
            <div className="flex items-center gap-2">
              {asymmetryRatio > 0.5 ? (
                <>
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <span className="text-sm text-red-400">Severe</span>
                </>
              ) : asymmetryRatio > 0.2 ? (
                <>
                  <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                  <span className="text-sm text-orange-400">Moderate</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-sm text-green-400">Mild</span>
                </>
              )}
            </div>
          </div>

          {/* Force Asymmetry Indicator (if force data available) */}
          {eventsWithForce.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Force Asymmetry</span>
              <div className="flex items-center gap-2">
                {forceAsymmetry > 40 ? (
                  <>
                    <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                    <span className="text-sm text-red-400">High</span>
                  </>
                ) : forceAsymmetry > 20 ? (
                  <>
                    <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                    <span className="text-sm text-orange-400">Moderate</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-sm text-green-400">Normal</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Biomechanical Insights (if force data available) */}
      {eventsWithForce.length > 0 && (
        <div className="mt-6 space-y-3">
          <h4 className="text-sm font-semibold text-gray-300">
            Biomechanical Data Quality
          </h4>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Force Data Coverage</span>
              <span className="text-sm text-white">
                {Math.round((eventsWithForce.length / totalEvents) * 100)}% of events
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Left Leg Force Range</span>
              <span className="text-sm text-blue-400">
                {leftHeelForces.length > 0 ? `${Math.min(...leftHeelForces).toFixed(0)}-${Math.max(...leftHeelForces).toFixed(0)}N` : 'No data'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Right Leg Force Range</span>
              <span className="text-sm text-red-400">
                {rightHeelForces.length > 0 ? `${Math.min(...rightHeelForces).toFixed(0)}-${Math.max(...rightHeelForces).toFixed(0)}N` : 'No data'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}