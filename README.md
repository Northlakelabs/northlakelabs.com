# Northlake Labs

AI-powered biomechanics solutions combining intelligent software and custom robotics.

## About

Northlake Labs specializes in developing comprehensive biomechanics solutions that combine cutting-edge AI software with custom robotics hardware. We create intelligent systems that bridge the physical and digital realms of biomechanics research, clinical assessment, and rehabilitation.

## Live Website

**Visit**: [www.northlakelabs.com](https://www.northlakelabs.com)  
**Status**: ✅ Live and operational with interactive multi-sensor fusion demo

### Key Features
- Interactive gait analysis demonstration with real-time Chart.js visualization
- Multi-modal sensor fusion (Force plates + EMG + Kinematics)
- Progressive algorithm comparison showcasing AI enhancement 
- Mobile-responsive design with professional presentation
- Scientific ground truth validation framework

## Technical Stack

**Frontend**: Astro 5.9.0 + React + TypeScript + Tailwind CSS  
**Deployment**: GitHub Pages with automated workflows  
**Data Processing**: Node.js pipeline with smart caching (10-20x faster development)  
**Visualization**: Chart.js optimized for 60fps real-time rendering  
**Scientific Tools**: Python + Jupyter notebooks for ground truth annotation

## Current Development Status

### ✅ Phase B1 Complete & Deployed
- Traditional force plate detection algorithm with 81 events detected
- Interactive controls with real-time threshold adjustments (20-1000N ranges)
- Comprehensive gait analysis with force metrics and biomechanical calculations
- Mobile-first responsive design with collapsible panels
- Live demo operational on solutions page

### ✅ Ground Truth Annotation Tool Complete
- Multi-modal data visualization and interactive annotation interface
- Scientific validation framework for algorithm accuracy assessment
- Complete Python toolkit with Jupyter notebook workflow
- All import, sampling rate, and visualization issues resolved

### 🎯 Phase B2 Ready to Start
- Basic fusion algorithm (EMG + Force rule-based combination - target 75%)
- AI fusion algorithm (multi-modal pattern recognition - target 92%)
- Algorithm validation against ground truth annotations
- Accuracy progression demonstration (60% → 75% → 92%)

## Development Commands

```bash
# Fast development (cached data)
npm run dev-fast

# Smart data processing (only if CSV changed)
npm run process-data

# Ground truth annotation
source venv/bin/activate
cd scripts/ground-truth-annotation/
jupyter lab --no-browser --port=8888
```

## Repository Structure

```
.
├── src/                          # Astro website source
│   ├── components/interactive/   # React components for demos
│   └── pages/                    # Website pages
├── scripts/                      # Data processing and utilities
│   ├── process-demo-data.js      # CSV to JSON pipeline
│   └── ground-truth-annotation/  # Scientific validation toolkit
├── public/demo-data/             # Generated demo files (T5-demo.json)
└── docs/                         # Technical documentation
```

## Documentation

- **[CLAUDE.md](CLAUDE.md)**: Project overview and development commands
- **[docs/technical-specs.md](docs/technical-specs.md)**: Comprehensive technical implementation guide
- **[docs/development-log.md](docs/development-log.md)**: Session tracking and progress history
- **[docs/design.md](docs/design.md)**: Brand guidelines and content strategy

---

© 2025 Northlake Labs. All rights reserved.
