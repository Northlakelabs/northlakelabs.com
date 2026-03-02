/**
 * Interactive threshold controls for traditional detection algorithm
 * Allows real-time adjustment of heel strike and toe off thresholds
 */

import React from 'react';

interface ThresholdControlsProps {
  heelStrikeThreshold: number;
  toeOffThreshold: number;
  onHeelStrikeChange: (value: number) => void;
  onToeOffChange: (value: number) => void;
  onReset: () => void;
  className?: string;
  standalone?: boolean; // New prop to control panel styling
}

export function ThresholdControls({
  heelStrikeThreshold,
  toeOffThreshold,
  onHeelStrikeChange,
  onToeOffChange,
  onReset,
  className = '',
  standalone = true
}: ThresholdControlsProps) {
  const containerClass = standalone 
    ? `bg-white/5 rounded-xl border border-white/10 p-6 ${className}`
    : className;

  return (
    <div className={containerClass}>
      {standalone && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            Detection Thresholds
          </h3>
          <button
            onClick={onReset}
            className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-500 rounded-lg text-white transition-colors"
          >
            Reset Defaults
          </button>
        </div>
      )}
      
      {!standalone && (
        <div className="flex justify-end mb-4">
          <button
            onClick={onReset}
            className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-500 rounded-lg text-white transition-colors"
          >
            Reset Defaults
          </button>
        </div>
      )}
      
      <div className="space-y-6">
        {/* Heel Strike Threshold */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-300">
              Heel Strike Threshold
            </label>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-burnt-sienna">
                {heelStrikeThreshold}N
              </span>
            </div>
          </div>
          
          <div className="relative">
            <input
              type="range"
              min="20"
              max="1000"
              step="10"
              value={heelStrikeThreshold}
              onChange={(e) => onHeelStrikeChange(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-burnt-sienna"
              style={{
                background: `linear-gradient(to right, 
                  #eb5b48 0%, 
                  #eb5b48 ${((heelStrikeThreshold - 20) / (1000 - 20)) * 100}%, 
                  #374151 ${((heelStrikeThreshold - 20) / (1000 - 20)) * 100}%, 
                  #374151 100%)`
              }}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>20N</span>
              <span>1000N</span>
            </div>
          </div>
          
          <p className="text-xs text-gray-400 leading-relaxed">
            Force level required to detect heel strike. Higher values reduce false positives 
            but may miss events in constrained gait.
          </p>
        </div>

        {/* Toe Off Threshold */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-300">
              Toe Off Threshold
            </label>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-royal-purple">
                {toeOffThreshold}N
              </span>
            </div>
          </div>
          
          <div className="relative">
            <input
              type="range"
              min="5"
              max="1000"
              step="10"
              value={toeOffThreshold}
              onChange={(e) => onToeOffChange(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-royal-purple"
              style={{
                background: `linear-gradient(to right, 
                  #5c37a9 0%, 
                  #5c37a9 ${((toeOffThreshold - 5) / (1000 - 5)) * 100}%, 
                  #374151 ${((toeOffThreshold - 5) / (1000 - 5)) * 100}%, 
                  #374151 100%)`
              }}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>5N</span>
              <span>1000N</span>
            </div>
          </div>
          
          <p className="text-xs text-gray-400 leading-relaxed">
            Force level below which toe off is detected. Lower values improve sensitivity 
            but may trigger on small fluctuations.
          </p>
        </div>

        {/* Algorithm Insights */}
        <div className="bg-white/5 rounded-lg p-4 border-l-4 border-burnt-sienna">
          <h4 className="text-sm font-semibold text-burnt-sienna mb-2">
            Traditional Algorithm Limitations
          </h4>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>• Fixed thresholds don't adapt to individual gait patterns</li>
            <li>• Constrained left leg creates asymmetric force profiles</li>
            <li>• Single-sensor approach misses compensatory strategies</li>
            <li>• Reduced loading may fall below detection thresholds</li>
          </ul>
        </div>
      </div>
    </div>
  );
}