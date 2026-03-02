/**
 * Data loader hook for T5 demo data
 * Loads and parses force plate data for traditional detection
 */

import { useState, useEffect } from 'react';
import type { DemoData } from '../../../utils/types';

export interface ForceData {
  timestamps: number[];
  leftForce: number[];
  rightForce: number[];
  duration: number;
  sampleRate: number;
}

interface DataLoaderState {
  data: ForceData | null;
  fullData: DemoData | null;
  isLoading: boolean;
  error: string | null;
  loadingProgress: number;
}

export function useDataLoader(trialId: string = 'T5') {
  const [state, setState] = useState<DataLoaderState>({
    data: null,
    fullData: null,
    isLoading: false,
    error: null,
    loadingProgress: 0
  });

  const loadData = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null, loadingProgress: 0 }));

    try {
      // Update progress
      setState(prev => ({ ...prev, loadingProgress: 25 }));

      // Load demo data from public directory (with cache busting)
      const response = await fetch(`/demo-data/${trialId}-demo.json?v=${Date.now()}`);
      if (!response.ok) {
        throw new Error(`Failed to load trial ${trialId}: ${response.statusText}`);
      }

      setState(prev => ({ ...prev, loadingProgress: 50 }));

      const demoData: DemoData = await response.json();

      setState(prev => ({ ...prev, loadingProgress: 75 }));

      // Extract force plate data for visualization
      const forceData: ForceData = {
        timestamps: demoData.timestamps,
        leftForce: demoData.force_plates.left_force_plate.fz,
        rightForce: demoData.force_plates.right_force_plate.fz,
        duration: demoData.metadata.total_samples / demoData.metadata.sampling_rate,
        sampleRate: demoData.metadata.sampling_rate
      };

      // Validate data integrity
      if (forceData.timestamps.length !== forceData.leftForce.length || 
          forceData.timestamps.length !== forceData.rightForce.length) {
        throw new Error('Data integrity error: mismatched array lengths');
      }

      setState(prev => ({ 
        ...prev, 
        data: forceData,
        fullData: demoData,
        isLoading: false, 
        loadingProgress: 100 
      }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error loading data';
      setState(prev => ({ 
        ...prev, 
        error: errorMessage, 
        isLoading: false, 
        loadingProgress: 0 
      }));
    }
  };

  // Auto-load data on mount
  useEffect(() => {
    loadData();
  }, [trialId]);

  return {
    ...state,
    reload: loadData
  };
}