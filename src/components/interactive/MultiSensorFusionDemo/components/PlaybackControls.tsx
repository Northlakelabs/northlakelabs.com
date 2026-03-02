/**
 * Playback controls for timeline management
 * Play/pause, scrubbing, speed control
 */

import React, { useState, useEffect } from 'react';
import { usePlaybackControl } from '../hooks/usePlaybackControl';
import { useDemoStore } from '../store';

interface PlaybackControlsProps {
  className?: string;
  integrated?: boolean; // New prop to control panel styling
}

export function PlaybackControls({ className = '', integrated = false }: PlaybackControlsProps) {
  const { setPlaybackSpeed } = useDemoStore();
  const {
    isPlaying,
    currentTime,
    playbackSpeed,
    maxTime,
    togglePlayback,
    seekToPercentage,
    restart,
    getCurrentPercentage,
    formatTime,
    isAtEnd,
    canPlay
  } = usePlaybackControl();

  // Local state for slider to prevent feedback loops
  const [sliderValue, setSliderValue] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Update slider value when currentTime changes (but not when dragging)
  useEffect(() => {
    if (!isDragging) {
      setSliderValue(getCurrentPercentage());
    }
  }, [getCurrentPercentage, isDragging]);

  const handleTimelineChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const percentage = parseFloat(event.target.value);
    setSliderValue(percentage);
    seekToPercentage(percentage);
  };

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const speedOptions = [0.5, 1, 2, 4];

  return (
    <div className={`${integrated ? '' : 'bg-white/5 rounded-xl border border-white/10 p-4'} ${className}`}>
      <div className="space-y-4">
        {/* Timeline Scrubber */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-400">
            <span>Timeline</span>
            <span>{formatTime(currentTime)} / {formatTime(maxTime)}</span>
          </div>
          
          <div className="relative">
            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={sliderValue}
              onChange={handleTimelineChange}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onTouchStart={handleMouseDown}
              onTouchEnd={handleMouseUp}
              disabled={!canPlay}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer
                         slider:bg-burnt-sienna slider:rounded-lg
                         disabled:opacity-50 disabled:cursor-not-allowed
                         focus:outline-none focus:ring-2 focus:ring-burnt-sienna/50"
              style={{
                background: `linear-gradient(to right, #eb5b48 0%, #eb5b48 ${sliderValue}%, #374151 ${sliderValue}%, #374151 100%)`
              }}
            />
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-center gap-4">
          {/* Restart Button */}
          <button
            onClick={restart}
            disabled={!canPlay}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors duration-200
                       focus:outline-none focus:ring-2 focus:ring-burnt-sienna/50"
            title="Restart"
          >
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
          </button>

          {/* Play/Pause Button */}
          <button
            onClick={togglePlayback}
            disabled={!canPlay}
            className="p-3 rounded-lg bg-burnt-sienna hover:bg-burnt-sienna/80 
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors duration-200
                       focus:outline-none focus:ring-2 focus:ring-burnt-sienna/50"
            title={isPlaying ? 'Pause' : (isAtEnd ? 'Replay' : 'Play')}
          >
            {isPlaying ? (
              // Pause icon
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            ) : (
              // Play icon
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>

        {/* Speed Control */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-400">
            <span>Playback Speed</span>
            <span>{playbackSpeed}x</span>
          </div>
          
          <div className="flex gap-1">
            {speedOptions.map(speed => (
              <button
                key={speed}
                onClick={() => setPlaybackSpeed(speed)}
                disabled={!canPlay}
                className={`flex-1 py-2 px-3 text-sm rounded-lg transition-colors duration-200
                           focus:outline-none focus:ring-2 focus:ring-burnt-sienna/50
                           disabled:opacity-50 disabled:cursor-not-allowed
                           ${playbackSpeed === speed 
                             ? 'bg-burnt-sienna text-white' 
                             : 'bg-white/10 text-gray-300 hover:bg-white/20'
                           }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>

        {/* Status */}
        {!canPlay && (
          <div className="text-center text-sm text-gray-500">
            Loading data...
          </div>
        )}
        
        {isAtEnd && (
          <div className="text-center text-sm text-burnt-sienna">
            Playback complete - Click play to restart
          </div>
        )}
      </div>
    </div>
  );
}