# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Northlake Labs company website - an Astro-based static site showcasing AI-powered biomechanics solutions. The site combines hardware and software offerings with interactive demonstrations and professional content.

**Live Site**: https://www.northlakelabs.com
**Framework**: Astro 5.9.0 with React integration
**Deployment**: GitHub Pages with automated workflows

## Development Commands

### Fast Development (Recommended)
```bash
# Fast development - instant startup using cached data
npm run dev-fast

# Fast build - instant build using cached data  
npm run build-fast
```

### Full Development (When Data Changes)
```bash
# Full development - processes data + starts server
npm run dev

# Full build - processes data + builds
npm run build

# Preview production build
npm run preview
```

### Data Processing Commands
```bash
# Smart caching - only processes if CSV sources changed
npm run process-data

# Force reprocess demo data (bypass cache completely)
npm run process-data-force

# Trial quality analysis across T1-T30
npm run analyze-trials

# Astro CLI (for adding integrations, etc.)
npm run astro
```

### Smart Caching System
The data processing pipeline includes intelligent caching for 10-20x faster development:

**How It Works:**
- **Cache Check**: Compares timestamps of source CSV files vs generated JSON files
- **Smart Skip**: If JSON files are newer than CSV sources, skips processing entirely  
- **Auto-Process**: Only processes when source data has actually changed
- **Force Override**: Use `--force` flag to bypass cache when needed

**Performance:**
- **First run**: ~2-3 minutes (processes ~300MB of CSV data)
- **Subsequent runs**: ~500ms (cache hit)
- **Development startup**: 500ms vs 3 minutes

**Cache Validation:**
- ✅ Do T5-demo.json and T5-metadata.json exist?
- ✅ Are output files newer than all source CSV files?
- ✅ Are all source CSV files present?

## Architecture Overview

### Framework Structure
- **Astro**: Static site generator with component islands architecture
- **React Integration**: Interactive components hydrated on demand
- **TypeScript**: Full type safety across components and utilities
- **Tailwind CSS**: Utility-first styling with custom brand configuration

### Page Structure
```
src/pages/
├── index.astro           # Homepage with hero and features
├── about/index.astro     # Professional profile with publications
├── solutions/index.astro # Interactive gait analysis demo
├── products/index.astro  # Product pipeline and development
└── contact/index.astro   # Contact information and forms
```

### Component Organization
- **Layout Components**: Header, Footer, Layout (Astro components)
- **UI Components**: Button, SocialLinks (reusable Astro components)  
- **Interactive Components**: React components for demos and visualizations
- **Sections**: Page-specific content blocks

## Key Technologies

### Tailwind Configuration
Custom brand colors defined in `tailwind.config.mjs`:
- `black-pearl`: #040b1b (primary background)
- `burnt-sienna`: #eb5b48 (primary accent)
- `royal-purple`: #5c37a9 (secondary accent)
- `indigo`: #585ccc (tertiary accent)

### Interactive Demonstrations
The multi-sensor fusion demo uses Chart.js for real-time visualization, Zustand for state management, and features T5 trial data with constrained gait patterns.

**Current Status**: Phase B1c ✅ COMPLETED & DEPLOYED - Enhanced demo with comprehensive force analysis and biomechanical insights  
**Bespoke Branding**: ✅ COMPLETED & DEPLOYED - Strategic brand positioning with animated homepage  
**Next Phase**: Phase B2 multi-algorithm comparison (Basic Fusion → AI Fusion)

### State Management Structure
```typescript
// store.ts pattern for interactive components
interface MultiSensorFusionState {
  isPlaying: boolean;
  currentTime: number;
  enabledStages: {
    traditional: boolean;
    basicFusion: boolean;
    aiFusion: boolean;
  };
  algorithmResults: DetectionResult[];
  accuracyMetrics: AccuracyComparison;
}
```

## Brand Guidelines

### Typography
- **Primary Font**: Inter (Google Fonts)
- **Brand Text**: Orbitron font for "NORTHLAKE LABS" branding
- **Gradient Text**: Brand color gradients for headings

### Visual Patterns
- **Glass Morphism**: `bg-white/5 backdrop-blur-sm border border-white/10`
- **Hover Effects**: `hover:shadow-lg hover:shadow-royal-purple/20 transition-all duration-300 hover:-translate-y-2`
- **Gradient Backgrounds**: Three-color gradients using brand colors

## Deployment

### GitHub Pages Workflow
- Automated deployment via `.github/workflows/`
- Custom domain configuration for northlakelabs.com
- Static build output in `dist/` directory

### Build Configuration
```javascript
// astro.config.mjs
export default defineConfig({
  integrations: [tailwind(), react()],
  output: 'static',
  site: 'https://www.northlakelabs.com',
  trailingSlash: 'ignore'
});
```

## Content Management

### Professional Content
- About page includes real publications from Google Scholar/PubMed
- Patents section with USPTO integration
- Professional headshot and credentials

### Interactive Content
- Multi-sensor fusion gait analysis demo with constrained gait patterns
- Real-time sensor data visualization (Force plates + EMG + Kinematics)
- Progressive algorithm comparison (Traditional → Basic Fusion → AI Fusion)
- Clinical context and educational panels for pathological gait analysis
- Live accuracy metrics and confidence scoring visualization

## Development Notes

### Performance Considerations
- Astro's partial hydration for optimal loading
- Three.js components lazy-loaded for heavy 3D content
- Component islands pattern minimizes JavaScript bundle

### Mobile Optimization
- Responsive design with mobile-first approach
- Touch-friendly interactive controls
- Optimized layout for portrait orientations

### Browser Compatibility
- Modern browser features (ES2020+)
- Canvas API for 2D graphics
- WebGL for 3D visualizations

## Development Guidelines

### Code Style
- Follow existing component patterns when creating new components
- Use TypeScript for all new components and utilities
- Maintain consistent naming conventions (PascalCase for components, camelCase for functions)
- Preserve existing indentation and formatting patterns

### Interactive Components
- Use Astro components for static content, React for interactive features
- Follow the established pattern: separate hooks, types, and store files
- Real-time demos should target 60fps performance
- Include loading states and error boundaries for complex components

### Content Updates
- Professional content (publications, patents) should be factual and verifiable
- Maintain consistent tone: professional but accessible
- Use existing gradient text patterns for headings
- Follow mobile-first responsive design principles

### Testing Interactive Demos
When modifying multi-sensor fusion demo or other interactive components:
- Test across different screen sizes and mobile devices
- Verify Chart.js rendering performance at 60fps
- Ensure real-time data streaming doesn't cause memory leaks
- Check that playback controls are accessible via keyboard
- Validate algorithm accuracy progression is clearly visible
- Test CSV data processing pipeline with different trials

## Common Tasks

### Processing Demo Data
Demo data processing pipeline uses T5 trial as the selected dataset:
- **Run processing**: `npm run process-data` (generates T5-demo.json)
- **Analyze trials**: `npm run analyze-trials` (quality assessment of T1-T30)
- **Generated files**: `public/demo-data/T5-demo.json` (16.7MB) and `T5-metadata.json`

### Current Development Phase
**Phase B1**: ✅ COMPLETED & DEPLOYED - Traditional detection demo operational
**Phase B1a**: ✅ COMPLETED & DEPLOYED - Enhanced UX with mobile-first design and comprehensive gait analysis
**Phase B1b**: ✅ COMPLETED - Code quality improvements with accurate terminology (threshold_deviation)
**Phase B1c**: ✅ COMPLETED - Force analysis enhancements with biomechanical insights and mobile layout fixes
**Ground Truth Tool**: ✅ COMPLETED & OPERATIONAL - Scientific validation framework with fixed sampling rates
**Web Annotation Tool**: ✅ COMPLETED & OPERATIONAL - Reliable browser-based annotation interface replacing problematic matplotlib
**Site Structure**: ✅ COMPLETED - Clean main site with hidden demos page for development
**Bespoke Branding**: ✅ COMPLETED & DEPLOYED - Strategic brand positioning with animated homepage transition
**Products Page Enhancement**: ✅ COMPLETED - Intelligent systems messaging with cross-sector experience positioning
**Website UX Optimization**: ✅ COMPLETED - Solutions page enhancement with contextual contact flow and mobile-first CTAs
**Website Polish & Demo Fixes**: ✅ COMPLETED - Interactive demo operational, streamlined Solutions page, homepage navigation enhanced
**Site Polish & Mobile Responsiveness**: ✅ COMPLETED - Standardized spacing, container widths, responsive news cards with aligned dividers
**Phase B2**: 🎯 READY TO START - Multi-algorithm comparison with validated ground truth reference and enhanced UX foundation

### Adding New Publications
Publications are in `src/pages/about/index.astro` - follow existing format with title, journal, year, and DOI links.

### Modifying Demo Parameters  
Demo constants are defined in `types.ts` files within component directories. Key parameters:
- **Algorithm thresholds**: Force plate detection limits (20-1000N), EMG activation levels
- **Accuracy targets**: Traditional (60%), Basic Fusion (75%), AI Fusion (92%)
- **Terminology**: Updated "confidence" to "threshold_deviation" for technical accuracy
- **Processing settings**: Sampling rates, filter parameters, constraint detection
- **Data format**: JSON structure for 20-second constrained gait trials (T5 optimized)
- **Responsive display**: Chart window sizing (6s/4s/3s), panel collapsibility, mobile optimization
- **Gait analysis**: Temporal parameters, frequency metrics, asymmetry analysis, force magnitude capture, biomechanical insights

### Updating Brand Colors
Brand colors are centralized in `tailwind.config.mjs`. Use existing color variables rather than hex codes in components.

### Ground Truth Annotation Tool
A complete scientific validation framework with both Jupyter and web-based annotation options:
- **Location**: `scripts/ground-truth-annotation/`
- **Status**: ✅ FULLY OPERATIONAL - Multiple annotation interfaces available
- **Setup**: Use Python virtual environment at repository root
- **Web Tool**: Reliable browser-based annotation interface (recommended)
- **Jupyter Option**: Interactive notebooks for expert manual annotation with multi-modal display
- **Purpose**: Create sensor-independent ground truth for accuracy validation
- **Output**: Ground truth events and validation results for algorithm comparison
- **Data Support**: Complete kinetics (1000Hz), EMG (2000Hz), kinematics (100Hz, 78 markers)
- **Interface**: Multi-modal visualization (force plates + **key heel/toe markers only** + EMG activity)
- **Enhanced Usability**: Shows only 4 relevant markers (left/right heel/toe) with clear labels and color coding

#### Web Annotation Tool (Recommended)
- **Location**: `scripts/ground-truth-annotation/web-tool/`
- **Status**: ✅ FULLY OPERATIONAL - Replaces problematic matplotlib interactive plots
- **Advantages**: Environment-independent, reliable browser click events, Chart.js visualization
- **Usage**: Start server with `python annotation_server.py`, open http://localhost:5000
- **Features**: Native click events, automatic saving/loading, JSON export compatible with validation workflow

```bash
# Setup and usage
source venv/bin/activate
cd scripts/ground-truth-annotation/
jupyter lab --no-browser --port=8888
# Navigate to: notebooks/02_annotation_tool.ipynb for interactive annotation
```

## Additional Documentation

For complete technical implementation details, see `docs/technical-specs.md`
For development progress and session tracking, see `docs/development-log.md`  
For design strategy and brand guidelines, see `docs/design.md`