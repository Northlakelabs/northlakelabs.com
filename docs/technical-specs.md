# Technical Specifications - Multi-Sensor Fusion Demo

## Overview
Consolidated technical implementation guide for the interactive multi-sensor fusion gait analysis demo, featuring constrained gait patterns (left leg locked in extension) and progressive AI enhancement.

---

## 1. Component Architecture

### 1.1 MultiSensorFusionDemo Structure
```
src/components/interactive/MultiSensorFusionDemo/
├── MultiSensorFusionDemo.tsx        # Main container component
├── algorithms/
│   ├── traditional.ts               # Stage 1: Force plate threshold detection (✅ completed)
│   ├── gaitAnalysis.ts             # Comprehensive gait metrics calculation (✅ completed)
│   ├── forceAnalysis.ts            # Force metrics and biomechanical calculations (✅ completed)
│   ├── basicFusion.ts              # Stage 2: EMG + Force rule-based fusion (🎯 next)
│   ├── aiFusion.ts                 # Stage 3: Multi-modal AI pattern recognition (🎯 next)
│   └── utils.ts                    # Shared algorithm utilities (✅ completed)
├── components/
│   ├── CollapsiblePanel.tsx        # Reusable collapsible panel with mobile optimization
│   ├── DetectionStats.tsx          # Live statistics display (events, asymmetry, threshold deviation)
│   ├── ForceChart.tsx             # Real-time force plate visualization with Chart.js
│   ├── GaitAnalysisPanel.tsx      # Comprehensive gait analysis metrics display
│   ├── PlaybackControls.tsx       # Timeline controls (play/pause/speed/scrub)
│   └── ThresholdControls.tsx      # Interactive threshold sliders (heel strike/toe off)
├── hooks/
│   ├── useDataLoader.ts           # Data loading and caching logic
│   ├── usePlaybackControl.ts      # Timeline and playback state management
│   └── useTraditionalDetection.ts # Algorithm execution and event detection
├── store.ts                       # Zustand state management
└── types.ts                       # TypeScript interfaces and type definitions
```

### 1.2 State Management (Zustand)
```typescript
interface MultiSensorFusionState {
  // Data state
  demoData: DemoData | null;
  isDataLoaded: boolean;
  
  // Playback state  
  isPlaying: boolean;
  currentTime: number;
  playbackSpeed: number;
  maxTime: number;
  
  // Algorithm state
  enabledStages: {
    traditional: boolean;
    basicFusion: boolean;
    aiFusion: boolean;
  };
  detectionResults: DetectionResult[];
  accuracyMetrics: AccuracyComparison;
  
  // Interactive controls
  thresholds: {
    heelStrike: number;     // 20-200N range
    toeOff: number;         // 5-100N range
  };
  
  // Actions
  togglePlayback: () => void;
  setPlaybackSpeed: (speed: number) => void;
  updateThresholds: (thresholds: Partial<Thresholds>) => void;
  runDetection: () => void;
}
```

---

## 2. Data Pipeline & Processing

### 2.1 Dataset Characteristics
**Source**: Constrained Gait Research Dataset - Subject 1, Left Leg Locked in Extension
- **Kinetics**: 1000Hz dual force plate data (301,990 samples, 302s duration)
- **EMG**: 2000Hz surface EMG (603,980 samples, 302s duration, 16 channels bilateral lower limb)  
- **Kinematics**: 100Hz 3D motion capture (30,199 samples, 302s duration, joint angles & marker positions)
- **Selected Trial**: T5 (302s total duration, 25/25 quality score, 20s demo window)

### 2.2 Processing Commands
```bash
# Smart caching - only processes if CSV sources changed
npm run process-data

# Force reprocess demo data (bypass cache completely)  
npm run process-data-force

# Trial quality analysis across T1-T30
npm run analyze-trials

# Fast development - instant startup using cached data
npm run dev-fast

# Fast build - instant build using cached data
npm run build-fast
```

### 2.3 Smart Caching System
**Performance**: 10-20x faster development with intelligent cache validation
- **Cache Check**: Compares timestamps of source CSV files vs generated JSON files
- **Smart Skip**: If JSON files are newer than CSV sources, skips processing entirely
- **Auto-Process**: Only processes when source data has actually changed
- **Force Override**: Use `--force` flag to bypass cache when needed

### 2.4 Data Synchronization Strategy
**Master Timeline**: Kinetics 1000Hz (highest resolution for force events)
- **EMG**: Downsample 2000Hz → 1000Hz (moving average)
- **Kinematics**: Upsample 100Hz → 1000Hz (linear interpolation)
- **Result**: Unified 1000Hz timeline for all modalities

### 2.5 Generated Files
```
public/demo-data/
├── T5-demo.json              # Processed demo trial (16.7MB optimized)
└── T5-metadata.json          # Clinical context and trial information
```

---

## 3. Algorithm Specifications

### 3.1 Traditional Force Plate Detection (Stage 1)
**Current Status**: ✅ COMPLETED & ENHANCED (Phase B1c)
- **Algorithm**: Threshold-based heel strike/toe off detection with debounced real-time updates
- **Performance**: 81 events detected (41L+40R) across full 20s timeline
- **Thresholds**: Interactive sliders (heel strike 20-1000N, toe off 5-1000N) with real-time chart updates
- **Force Magnitude Capture**: Enhanced with actual force values at detection points for biomechanical analysis
- **Threshold Deviation Scoring**: Based on force magnitude relative to threshold (terminology updated from "confidence")
- **Expected Accuracy**: ~60% with constrained gait patterns
- **Gait Analysis**: Comprehensive temporal, frequency, asymmetry, and force magnitude metrics
- **Force Analysis**: Peak forces, impulse, loading rates, weight distribution, and biomechanical asymmetry calculations

```typescript
interface TraditionalDetectionOptions {
  heelStrikeThreshold: number;    // Default: 50N
  toeOffThreshold: number;        // Default: 20N
  minStanceTime: number;          // Default: 0.3s
  minSwingTime: number;           // Default: 0.2s
}
```

### 3.2 Basic Fusion Detection (Stage 2)
**Status**: 🎯 NEXT IMPLEMENTATION - Phase B2 Priority
- **Algorithm**: Rule-based EMG + Force combination with temporal windows
- **Method**: Force events confirmed by EMG activation within 0.1s correlation window
- **Expected Accuracy**: ~75% (improved but rigid rules fail with compensatory patterns)
- **Fusion Strategy**: Threshold-based validation across modalities
- **Ground Truth Ready**: Annotation tool operational for accuracy validation

### 3.3 AI Fusion Detection (Stage 3)
**Status**: 🎯 NEXT IMPLEMENTATION - Phase B2 Priority  
- **Algorithm**: Multi-modal pattern recognition with constraint adaptation
- **Features**: Force magnitude, EMG activation, kinematic patterns, bilateral asymmetry
- **Expected Accuracy**: ~92% (demonstrates AI superiority with pathological gait)
- **Constraint Adaptation**: Learns and adapts to left leg lock compensation patterns
- **Validation Framework**: Scientific ground truth methodology established

---

## 4. Visualization & UI

### 4.1 Chart.js Optimization
**Performance Target**: 60fps rendering with event markers
- **Configuration**: Animation disabled, point radius 0, optimized update strategy
- **Event Markers**: Fixed implementation using full dataset + axis limits approach
- **Real-time Updates**: Batched updates for smooth performance
- **Data Streaming**: Efficient data point management with sliding window

### 4.2 Interactive Controls
**Current Implementation**: ✅ COMPLETED & ENHANCED
- **Integrated Playback Controls**: Play/pause with multi-speed playback (0.5x-4x) integrated into chart panel
- **Timeline Scrubbing**: Interactive time position control with visual progress
- **Threshold Controls**: Debounced real-time sliders (20-1000N ranges) with live chart updates
- **Statistics Display**: Live event counts, asymmetry analysis, threshold deviation metrics
- **Gait Analysis**: Comprehensive clinical metrics with color-coded interpretation
- **Collapsible Panels**: Mobile-optimized with smart defaults and smooth animations

### 4.3 Mobile Responsiveness
**Current Implementation**: ✅ ENHANCED FOR MOBILE-FIRST
- **Responsive Chart Sizing**: Desktop 6s/400px, Tablet 4s/350px, Mobile 3s/280px
- **Integrated Layout**: Playback controls within chart panel reducing mobile scrolling by 50%
- **Collapsible Panels**: Smart mobile defaults (important panels open, supplementary closed)
- **Optimized Spacing**: Mobile-first spacing with responsive grid gaps
- **Touch-Friendly Controls**: Expanded slider ranges and touch-optimized interactions

```css
/* Enhanced mobile-first responsive design */
.demo-container {
  display: flex;
  flex-direction: column;
  gap: 1rem; /* Mobile: tighter spacing */
}

@media (min-width: 768px) {
  .demo-container {
    gap: 1.5rem; /* Tablet: moderate spacing */
  }
}

@media (min-width: 1024px) {
  .demo-container {
    gap: 2rem; /* Desktop: full spacing */
  }
}
```

---

## 5. Integration & Deployment

### 5.1 Astro Component Integration
**Status**: ✅ COMPLETED & DEPLOYED
```astro
<!-- src/pages/solutions/index.astro -->
<MultiSensorFusionDemo 
  client:load
  trialId="T05"
  autoStart={false}
/>
```

**Key Solutions**:
- **SSR Compatibility**: Proper client hydration for component islands
- **Force Sign Convention**: Corrected positive = loading for intuitive visualization  
- **React Hydration**: Resolved "invalid hook call" errors with client:only directive
- **Cache Busting**: Browser caching issues resolved with timestamp parameters

### 5.2 Build Process Integration
```json
{
  "scripts": {
    "dev": "npm run process-data && astro dev",
    "dev-fast": "astro dev",
    "build": "npm run process-data && astro build", 
    "build-fast": "astro build",
    "process-data": "node scripts/process-demo-data.js",
    "process-data-force": "node scripts/process-demo-data.js --force"
  }
}
```

### 5.3 Performance Metrics
**Achieved Performance**: ✅ COMPLETED
- **Loading Time**: <1s for demo initialization with smart caching
- **Chart Rendering**: 60fps smooth playback at multiple speeds
- **Development Workflow**: 10-20x faster with intelligent data processing
- **File Size**: 16.7MB demo file with optimized real-time streaming

---

## 6. File Locations & Scripts

### 6.1 Processing Scripts
```
scripts/
├── analyze-trials.js           # Trial quality assessment (T1-T30 analysis)
├── csv-parser.js              # CSV parsing utilities for each modality
├── data-synchronizer.js       # Multi-rate data alignment (1000Hz master)
├── process-demo-data.js       # Main processing pipeline with caching
├── test-algorithms.js         # Algorithm validation and testing
├── test-processing.js         # Pipeline validation with small segments
└── ground-truth-annotation/   # Scientific validation toolkit (✅ completed)
    ├── src/                   # Python utilities for data loading and annotation
    ├── notebooks/             # Interactive Jupyter annotation interface  
    ├── web-tool/              # Web-based annotation interface (✅ operational)
    │   ├── annotation_server.py    # Flask server with REST API
    │   └── static/                  # Web interface files
    │       ├── annotation_tool.html # Main annotation interface
    │       └── annotation.js        # Chart.js annotation logic
    ├── data/                  # Symlinks to main dataset
    └── output/                # Generated ground truth and validation results
```

### 6.2 Component File Structure
```
src/components/interactive/MultiSensorFusionDemo/
├── algorithms/traditional.ts   # Force plate threshold detection
├── components/DetectionStats.tsx    # Event counts and statistics
├── components/ForceChart.tsx        # Chart.js force visualization
├── components/PlaybackControls.tsx  # Timeline controls
├── components/ThresholdControls.tsx # Interactive parameter controls
├── hooks/useDataLoader.ts          # Data loading with caching
├── hooks/usePlaybackControl.ts     # Playback state management
├── hooks/useTraditionalDetection.ts # Algorithm execution
├── store.ts                        # Zustand state management
└── types.ts                        # TypeScript definitions
```

### 6.3 Site Page Structure (Updated June 22, 2025)
```
src/pages/
├── index.astro               # Homepage with hero and features
├── about/index.astro         # Professional profile with publications
├── solutions/index.astro     # "Coming Soon" version (✅ restored for launch)
├── demos/index.astro         # Hidden interactive demo (✅ created, not linked)
├── products/index.astro      # Product pipeline and development
└── contact/index.astro       # Contact information and forms
```

### 6.4 Generated Demo Data
```
public/demo-data/
├── T5-demo.json              # Main demo data (16.7MB)
└── T5-metadata.json          # Trial metadata and clinical context
```

---

## 7. Current Development Status

### 7.1 Phase B1 - ✅ COMPLETED & DEPLOYED (Including B1a/B1b/B1c Extensions)
**Live Demo**: Available on solutions page with interactive Chart.js visualization
- ✅ Traditional algorithm detects 81 events (41L+40R) across full 20s timeline
- ✅ Interactive threshold controls with real-time sliders
- ✅ Live statistics display with event counts, asymmetry analysis, threshold deviation metrics
- ✅ Enhanced force analysis: Force magnitude capture, biomechanical asymmetry calculations, force range analysis
- ✅ Mobile-responsive design with collapsible panels and optimized layout
- ✅ Comprehensive gait analysis panel with force metrics integration
- ✅ Playback controls with multi-speed playback and controlled slider state
- ✅ Astro component integration on solutions page working
- ✅ TypeScript integration with all components properly typed
- ✅ Chart.js event visualization with full dataset + axis limits approach
- ✅ Smart caching system providing 10-20x faster development workflow

### 7.1a Bespoke Biomechanics Branding Implementation - ✅ COMPLETED & DEPLOYED
**Strategic Brand Positioning**: Complete "Bespoke Biomechanics" messaging integration
- ✅ Homepage animated headline: "Bespoke. Biomechanics. Solutions." with logo-to-text transition
- ✅ Responsive animation timing: 1.5s logo display, staggered text reveal (1.7s, 2.0s, 2.3s)
- ✅ SEO optimization: All page titles updated with "Bespoke Biomechanics" keywords
- ✅ Strategic messaging balance: Prominent homepage positioning, subtle tagline usage elsewhere
- ✅ Mobile-first responsive spacing: Optimized header and hero section padding
- ✅ About page refinement: "Meet the Founder" with custom solutions focus
- ✅ Tailwind animation system: slide-in-right and slide-out-left keyframes implemented

### 7.2 Ground Truth & Web Annotation Tool - ✅ COMPLETED & OPERATIONAL
**Scientific Validation Framework**: Complete toolkit for algorithm validation
- ✅ Ground truth annotation tool with Jupyter notebooks (fixed all import/sampling issues)
- ✅ Web-based annotation interface with reliable browser click events
- ✅ Multi-modal data visualization (Force plates + Key markers + EMG)
- ✅ JSON export format compatible with validation workflow
- ✅ Flask server providing REST API for data loading and annotation saving
- ✅ Chart.js integration with native click handling (replaces problematic matplotlib)

### 7.3 Site Structure Reorganization - ✅ COMPLETED
**Clean Main Site**: Professional marketing ready for launch
- ✅ Solutions page restored to main branch "Coming Soon" version
- ✅ Hidden demos page created at `/demos` (not linked in navigation)
- ✅ Interactive demo moved to development staging area
- ✅ Main site clean and professional for public launch

### 7.5 Products Page Enhancement - ✅ COMPLETED
**Intelligent Systems Positioning**: Professional products messaging distinct from custom services
- ✅ Hero headline: "Intelligent Biomechanics & Robotics Systems"
- ✅ Cross-sector experience messaging (research → clinical → industry)
- ✅ Academic vs Industry partnership categories
- ✅ Consistent "systems/products" vs "solutions" terminology
- ✅ Removed "LLC" references for accurate business structure

### 7.4 Website Polish & Demo Fixes - ✅ COMPLETED (June 23, 2025)
**Duration**: 1.0 hours (actual)
**Focus**: Content refinement, demo troubleshooting, and navigation optimization
- ✅ Streamlined Interactive Demonstrations section (eliminated redundancy)
- ✅ Updated demo timeline to realistic Q3 2025 target
- ✅ Enhanced "Demos (BETA)" CTA for preview build access
- ✅ Resolved Vite dependency cache issues (demo loading problems fixed)
- ✅ Made homepage feature cards clickable navigation to Solutions page
- ✅ Standardized hero headline sizing across all pages (text-4xl md:text-5xl)

### 7.6 Site Polish & Mobile Responsiveness - ✅ COMPLETED (June 23, 2025)
**Duration**: 2.5 hours (via Claude Code session)
**Focus**: Site-wide consistency and mobile-responsive design optimization
- ✅ Standardized section spacing across all pages (py-20 for main sections)
- ✅ Unified container widths to max-w-6xl for visual consistency
- ✅ Added gradient styling to About page "Technical Expertise" heading
- ✅ Fixed mobile-responsive news update cards using CSS Grid + Flexbox solution
- ✅ Aligned horizontal divider lines between cards with min-h-[44px] containers
- ✅ Enhanced homepage news updates with social media icons and ASB conference link
- ✅ Improved divider spacing (pt-2 below, mt-6 above for better visual hierarchy)

### 7.5 Phase B2 - 🎯 READY TO START WITH ENHANCED FOUNDATION
**Target**: Multi-algorithm comparison with validated accuracy measurement
- 🎯 Basic fusion algorithm (EMG + Force rule-based combination - target 75%)
- 🎯 AI fusion algorithm (multi-modal pattern recognition - target 92%)
- 🎯 Algorithm validation against web-annotated ground truth reference
- 🎯 Accuracy comparison dashboard (side-by-side performance metrics)
- 🎯 Production deployment (complete demo with refined branding on main branch)
- ✅ **Foundation Complete**: Brand positioning, site structure, validation tools, and demo operational

---

## 8. Technical Solutions & Patterns

### 8.1 Key Technical Solutions
- **Smart Caching**: Cache validation based on CSV file timestamps vs JSON output timestamps
- **Chart.js Performance**: Event markers with full dataset + axis limits approach (simplified and reliable)
- **React Hydration**: client:only directive for complex interactive components
- **Data Synchronization**: Master timeline approach with multi-rate sensor fusion
- **Force Convention**: Positive values = loading for intuitive biomechanics visualization

### 8.2 Performance Optimization Patterns
- **Build-time Processing**: Heavy CSV parsing done during build, runtime loads optimized JSON
- **Batched Chart Updates**: Queue updates and flush in batches for smooth 60fps rendering
- **Memory Management**: Sliding window data management for long trials
- **Lazy Loading**: Component islands load only when needed

### 8.3 TypeScript Integration Patterns
```typescript
interface DemoData {
  metadata: TrialMetadata;
  timestamps: number[];
  forcePlates: {
    left: ForceData;
    right: ForceData;
  };
  emg: EMGData;
  kinematics: KinematicsData;
  groundTruthEvents: GaitEvent[];
}

interface DetectedEvent {
  time: number;
  type: 'heel_strike' | 'toe_off';
  leg: 'left' | 'right';
  threshold_deviation: number;
  detection_method: string;
  force_magnitude?: number; // Enhanced in Phase B1c
  algorithm_parameters?: Record<string, any>;
}
```

---

## 9. Ground Truth Annotation Tool

### 9.1 Scientific Validation Framework - ✅ COMPLETED & OPERATIONAL
**Location**: `scripts/ground-truth-annotation/`
**Purpose**: Create sensor-independent reference standard for algorithm validation
**Status**: Fully tested and ready for Phase B2 algorithm validation

**Components**:
- **Data Loader**: Multi-modal CSV parsing (kinetics 1000Hz, EMG 2000Hz, kinematics 100Hz) ✅
- **Synchronizer**: Data alignment with anti-aliasing and interpolation ✅
- **Visualizer**: Interactive multi-panel plots for expert annotation ✅  
- **Annotator**: Complete workflow for manual gait event annotation ✅

**Key Features**:
- Interactive Jupyter notebook interface with click-to-annotate functionality ✅
- Multi-modal visualization combining force, kinematic, and EMG data ✅
- Constraint-aware methodology accounting for left leg locked extension ✅
- Scientific validation framework supporting accuracy claims (60% → 75% → 92%) ✅
- Comprehensive documentation (150+ pages) for future repository extraction ✅
- **FIXED**: Import paths, sampling rate calculations, variable references ✅

**Recent Fixes (June 19, 2025)**:
- Corrected scipy.interpolation → scipy.interpolate import
- Fixed time calculation using sample indices vs Frame column
- Resolved variable reference errors in notebooks
- Verified accurate 1000Hz/2000Hz/100Hz sampling rates

**Enhancement Updates (June 20, 2025)**:
- Fixed kinematic data loading with unique column name generation (78 markers preserved)
- Enhanced annotation interface with multi-modal visualization (force + kinematics + EMG)
- Replaced asymmetry index with meaningful kinematic vertical marker display
- Verified matplotlib backend compatibility for Jupyter notebook environments
- Complete annotation workflow operational for scientific ground truth creation

**Key Marker Improvements (June 20, 2025)**:
- **Semantic Marker Names**: Parse actual marker names from CSV header (S12:RTOE → RTOE_X/Y/Z)
- **Key Marker Extraction**: New `load_kinematics_key_markers()` function extracting only 4 critical markers
- **Targeted Visualization**: Shows only heel/toe markers with clear labels and color coding
- **Expert-Friendly Interface**: Red (right) vs blue (left), solid (toe) vs dashed (heel) visual distinction
- **Annotation Guidance**: Heel minima = heel strikes, toe minima = toe offs for precise event detection
- **Data Quality**: All 4 markers verified with complete coverage (20,000 points over 20s demo window)

**Output Files**:
- Ground truth events JSON with expert annotations
- Validation results comparing algorithm performance  
- Scientific methodology documentation

---

## Next Development Steps

### Immediate Priority (Phase B2)
1. **Sampling Rate Fix**: Apply corrected timing calculations to main demo processing pipeline
2. **Basic Fusion Implementation**: Rule-based EMG + Force combination algorithm (target 75%)
3. **AI Fusion Implementation**: Multi-modal pattern recognition with constraint learning (target 92%)
4. **Ground Truth Creation**: Use operational annotation tool to establish T5 reference standard
5. **Algorithm Validation**: Validate accuracy claims against manually annotated ground truth
6. **Accuracy Dashboard**: Side-by-side comparison visualization showing 60% → 75% → 92% progression

### Technical Requirements for Phase B2
- Maintain current Chart.js performance (60fps)
- Preserve smart caching system for development efficiency
- Extend existing component architecture without breaking changes
- Add algorithm comparison without affecting current traditional detection
- Mobile-responsive design for all new UI components

---

**Document Status**: Consolidated Technical Reference v1.0  
**Total Lines**: ~400 (target achieved)  
**Scope**: Complete development context for Phase B2 continuation