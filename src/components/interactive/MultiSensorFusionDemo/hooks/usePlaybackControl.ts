/**
 * Playback control hook for timeline management
 * Handles play/pause, timeline scrubbing, and auto-advance
 */

import { useEffect, useRef } from 'react';
import { useDemoStore } from '../store';

export function usePlaybackControl() {
  const {
    isPlaying,
    currentTime,
    playbackSpeed,
    maxTime,
    setPlaybackState,
    setCurrentTime
  } = useDemoStore();

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-advance time when playing
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        const timeIncrement = 0.016 * playbackSpeed; // ~60fps * speed
        // Get current time from store and increment
        const store = useDemoStore.getState();
        setCurrentTime(store.currentTime + timeIncrement);
      }, 16); // ~60fps
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, setCurrentTime]);

  const togglePlayback = () => {
    // If at end, restart from beginning
    if (currentTime >= maxTime) {
      setCurrentTime(0);
    }
    setPlaybackState(!isPlaying);
  };

  const seekToTime = (time: number) => {
    setCurrentTime(time);
  };

  const seekToPercentage = (percentage: number) => {
    const time = (percentage / 100) * maxTime;
    setCurrentTime(time);
  };

  const restart = () => {
    setCurrentTime(0);
    setPlaybackState(false);
  };

  const getCurrentPercentage = () => {
    return maxTime > 0 ? (currentTime / maxTime) * 100 : 0;
  };

  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    const milliseconds = Math.floor((timeInSeconds % 1) * 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  };

  return {
    // State
    isPlaying,
    currentTime,
    playbackSpeed,
    maxTime,
    
    // Actions
    togglePlayback,
    seekToTime,
    seekToPercentage,
    restart,
    
    // Utilities
    getCurrentPercentage,
    formatTime,
    
    // Computed
    isAtEnd: currentTime >= maxTime,
    canPlay: maxTime > 0
  };
}