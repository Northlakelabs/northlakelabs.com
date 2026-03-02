/**
 * TypeScript interfaces for Multi-Sensor Fusion Demo Data
 * Defines the complete data structure for constrained gait analysis
 */

export interface DemoMetadata {
  sampling_rate: number;
  duration_seconds: number;
  total_samples: number;
  segment_start_time: number;
  segment_end_time: number;
  synchronization_method: string;
}

export interface ForcePlateData {
  fx: number[];          // Medial-lateral forces (N)
  fy: number[];          // Anterior-posterior forces (N)
  fz: number[];          // Vertical forces (N)
  mx: number[];          // Moments about X axis (N.mm)
  my: number[];          // Moments about Y axis (N.mm)
  mz: number[];          // Moments about Z axis (N.mm)
  cop_x: number[];       // Center of pressure X (mm)
  cop_y: number[];       // Center of pressure Y (mm)
  cop_z: number[];       // Center of pressure Z (mm)
}

export interface ForcePlatesData {
  left_force_plate: ForcePlateData;
  right_force_plate: ForcePlateData;
}

export interface EMGChannels {
  emg1: number[];        // Channel 1 envelope (V)
  emg2: number[];        // Channel 2 envelope (V)
  emg3: number[];        // Channel 3 envelope (V)
  emg4: number[];        // Channel 4 envelope (V)
  emg5: number[];        // Channel 5 envelope (V)
  emg6: number[];        // Channel 6 envelope (V)
  emg7: number[];        // Channel 7 envelope (V)
  emg8: number[];        // Channel 8 envelope (V)
  emg9: number[];        // Channel 9 envelope (V)
  emg10: number[];       // Channel 10 envelope (V)
  emg11: number[];       // Channel 11 envelope (V)
  emg12: number[];       // Channel 12 envelope (V)
  emg13: number[];       // Channel 13 envelope (V)
  emg14: number[];       // Channel 14 envelope (V)
  emg15: number[];       // Channel 15 envelope (V)
  emg16: number[];       // Channel 16 envelope (V)
}

export interface EMGData {
  channels: EMGChannels;
}

export interface MarkerPosition {
  x: number[];           // X coordinates (mm)
  y: number[];           // Y coordinates (mm)
  z: number[];           // Z coordinates (mm)
}

export interface KinematicsMarkers {
  [markerName: string]: MarkerPosition;
}

export interface KinematicsData {
  markers: KinematicsMarkers;
}

export interface GaitEvent {
  time: number;          // Event time (seconds)
  type: 'heel_strike' | 'toe_off';
  leg: 'left' | 'right';
  threshold_deviation: number;    // Threshold deviation score (0-1)
  detection_method: string;
}

export interface TrialInfo {
  subject: string;
  trial: string;
  condition: string;
  constraint: string;
  clinical_significance: string;
}

export interface DemoData {
  metadata: DemoMetadata;
  timestamps: number[];
  force_plates: ForcePlatesData;
  emg: EMGData;
  kinematics: KinematicsData;
  ground_truth_events: GaitEvent[];
  trial_info: TrialInfo;
}

// Algorithm Detection Results
export interface DetectionResult {
  events: GaitEvent[];
  accuracy_metrics: AccuracyMetrics;
  processing_time_ms: number;
  algorithm_parameters: Record<string, any>;
}

export interface AccuracyMetrics {
  precision: number;
  recall: number;
  f1_score: number;
  true_positives: number;
  false_positives: number;
  false_negatives: number;
}

export interface AlgorithmResults {
  traditional: DetectionResult;
  basic_fusion: DetectionResult;
  ai_fusion: DetectionResult;
}

// Demo State Management
export interface DemoState {
  // Data state
  currentTrial: DemoData | null;
  isDataLoaded: boolean;
  loadingProgress: number;
  
  // Playback state
  isPlaying: boolean;
  currentTime: number;
  playbackSpeed: number;
  maxTime: number;
  
  // Algorithm state
  enabledStages: EnabledStages;
  algorithmResults: AlgorithmResults | null;
  accuracyComparison: AccuracyComparison | null;
  
  // UI state
  selectedChart: ChartType;
  showConfidenceScores: boolean;
  showConstraintAnalysis: boolean;
  
  // Actions
  loadTrial: (trialId: string) => Promise<void>;
  togglePlayback: () => void;
  setPlaybackSpeed: (speed: number) => void;
  setCurrentTime: (time: number) => void;
  toggleStage: (stage: keyof EnabledStages) => void;
  runAlgorithms: () => Promise<void>;
  setSelectedChart: (chart: ChartType) => void;
}

export interface EnabledStages {
  traditional: boolean;
  basic_fusion: boolean;
  ai_fusion: boolean;
}

export interface AccuracyComparison {
  traditional: number;   // Accuracy percentage
  basic_fusion: number;
  ai_fusion: number;
  improvement_basic: number;    // Improvement over traditional
  improvement_ai: number;       // Improvement over traditional
}

export type ChartType = 'force' | 'emg' | 'kinematics' | 'events';

// Algorithm Configuration
export interface TraditionalAlgorithmConfig {
  heel_strike_threshold: number;  // Force threshold (N)
  toe_off_threshold: number;      // Force threshold (N)
  min_stance_time: number;        // Minimum stance duration (s)
  min_swing_time: number;         // Minimum swing duration (s)
}

export interface BasicFusionConfig {
  force_threshold: number;        // Reduced force threshold (N)
  emg_threshold: number;          // EMG activation threshold (V)
  fusion_window: number;          // Time window for fusion (s)
  confirmation_required: boolean; // Require EMG confirmation
}

export interface AIFusionConfig {
  model_type: string;             // ML model type
  confidence_threshold: number;   // Minimum confidence for detection (AI-specific)
  feature_window_size: number;    // Feature extraction window (samples)
  constraint_adaptation: boolean; // Enable constraint learning
}

// Chart Configuration
export interface ChartConfig {
  type: string;
  data: ChartData;
  options: ChartOptions;
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  borderColor: string;
  backgroundColor: string;
  borderWidth: number;
  fill: boolean;
}

export interface ChartOptions {
  responsive: boolean;
  maintainAspectRatio: boolean;
  animation: boolean | { duration: number };
  scales: {
    x: ChartScale;
    y: ChartScale;
  };
  plugins: {
    legend: LegendOptions;
    tooltip: TooltipOptions;
  };
}

export interface ChartScale {
  type: string;
  min?: number;
  max?: number;
  ticks?: {
    stepSize?: number;
  };
}

export interface LegendOptions {
  display: boolean;
  position: string;
}

export interface TooltipOptions {
  enabled: boolean;
}

// Export utility types
export type TrialId = string;
export type Timestamp = number;
export type ForceValue = number;
export type EMGValue = number;
export type PositionValue = number;