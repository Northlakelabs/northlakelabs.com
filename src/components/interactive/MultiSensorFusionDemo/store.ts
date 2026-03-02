/**
 * Zustand store for Multi-Sensor Fusion Demo state management
 * Simplified for Phase B1 - traditional detection only
 */

import { create } from 'zustand';
import type { ForceData } from './hooks/useDataLoader';
import type { DetectedEvent } from './algorithms/utils';

export interface DemoState {
  // Data state
  data: ForceData | null;
  isDataLoaded: boolean;
  
  // Playback state
  isPlaying: boolean;
  currentTime: number;
  playbackSpeed: number;
  maxTime: number;
  
  // Algorithm state
  detectedEvents: DetectedEvent[];
  isDetectionComplete: boolean;
  
  // Actions
  setData: (data: ForceData) => void;
  setPlaybackState: (isPlaying: boolean) => void;
  setCurrentTime: (time: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  setDetectedEvents: (events: DetectedEvent[]) => void;
  reset: () => void;
}

export const useDemoStore = create<DemoState>((set, get) => ({
  // Initial state
  data: null,
  isDataLoaded: false,
  isPlaying: false,
  currentTime: 0,
  playbackSpeed: 1,
  maxTime: 20,
  detectedEvents: [],
  isDetectionComplete: false,

  // Actions
  setData: (data: ForceData) => set({
    data,
    isDataLoaded: true,
    maxTime: data.duration,
    currentTime: 0,
    isPlaying: false
  }),

  setPlaybackState: (isPlaying: boolean) => set({ isPlaying }),

  setCurrentTime: (time: number) => {
    const { maxTime } = get();
    const clampedTime = Math.max(0, Math.min(time, maxTime));
    set({ currentTime: clampedTime });
    
    // Auto-pause at end
    if (clampedTime >= maxTime) {
      set({ isPlaying: false });
    }
  },

  setPlaybackSpeed: (speed: number) => set({ playbackSpeed: speed }),

  setDetectedEvents: (events: DetectedEvent[]) => set({ 
    detectedEvents: events, 
    isDetectionComplete: true 
  }),

  reset: () => set({
    data: null,
    isDataLoaded: false,
    isPlaying: false,
    currentTime: 0,
    playbackSpeed: 1,
    maxTime: 20,
    detectedEvents: [],
    isDetectionComplete: false
  })
}));