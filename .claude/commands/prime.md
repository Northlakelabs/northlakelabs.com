You are Claude Code working on the Northlake Labs biomechanics website project. To prime yourself with full project context, please execute these steps in order:

## Step 1: Read Core Project Documentation
Read these files to understand the project structure and development context:
- `Read CLAUDE.md` - Development instructions, interactive demo details, and codebase overview
- `Read README.md` - Project overview and basic information

## Step 2: Read Consolidated Development Documentation  
Read the streamlined 5-file documentation structure:
- `Read docs/technical-specs.md` - CONSOLIDATED TECHNICAL REFERENCE: Multi-sensor fusion implementation, algorithms, and component architecture
- `Read docs/design.md` - Overall site strategy, brand guidelines, and design system
- `Read docs/development-log.md` - Compact progress tracking, current phase status, and velocity metrics

## Step 3: Check Current Development Status
Execute these commands to understand current state:
- `TodoRead` - Check active task list and priorities
- `Bash "git status"` - See current git state and uncommitted changes  
- `Bash "git log --oneline -5"` - Review recent commits

## Step 4: Understand Project Structure
Run this to see the current file organization:
- `LS /mnt/c/Users/Geoff/Documents/Github/Northlakelabs`

## Step 5: Understand the Dataset Context
Examine the constrained gait dataset:
- `LS /mnt/c/Users/Geoff/Documents/Github/Northlakelabs/data` - See available data structure
- `Read /mnt/c/Users/Geoff/Documents/Github/Northlakelabs/data/Sub1/Kinetics/Sub1_Kinetics_T5.csv` (first 10 lines) - Sample kinetics data
- `Read /mnt/c/Users/Geoff/Documents/Github/Northlakelabs/data/Sub1/EMG/Sub1_EMG_T5.csv` (first 10 lines) - Sample EMG data

## Context Summary
After reading these files, you should understand:

**Project**: Northlake Labs LLC website (northlakelabs.com) - AI-powered biomechanics solutions
**Current Focus**: Multi-sensor fusion demo for constrained gait analysis (left leg locked in extension)
**Development Phase**: Phase A COMPLETED ✅ → Phase B Algorithm Implementation (Days 4-6 of 13-day cycle)
**Tech Stack**: Astro 5.9.0 + React + TypeScript + Chart.js + Zustand

**Dataset Details**:
- **Source**: Constrained gait research data - Subject 1 with left leg locked in extension
- **Format**: Clean CSV files (Kinetics 1000Hz, EMG 2000Hz, Kinematics 100Hz)
- **Trials**: T1-T30 available (~300 seconds each)
- **Demo Target**: Extract optimal 20-second segments for interactive demo

**Demo Concept**: 
- **Progressive Enhancement**: Traditional (60%) → Basic Fusion (75%) → AI Fusion (92%)
- **Clinical Value**: Shows AI adaptation to pathological gait patterns
- **Technical Challenge**: Multi-rate data synchronization and real-time visualization

**Current Priority**: 
1. ✅ Trial analysis and selection (T5 selected with perfect score)
2. ✅ CSV processing pipeline development (complete scripts/ directory)
3. ✅ Data synchronization (1000Hz unified timeline)
4. ✅ JSON export generation (T5-demo.json ready)
5. 🎯 **NEXT: Phase B Algorithm Implementation** (Traditional → Basic → AI Fusion)

**Key Files to Understand**:
- `docs/technical-specs.md` - Consolidated implementation roadmap, specifications, and component architecture
- `docs/development-log.md` - Current progress and session tracking
- `CLAUDE.md` - Development commands and guidelines

You should now be ready to continue Phase B algorithm development with full project context.

**Next Session Focus**: Implement the three detection algorithms (Traditional → Basic Fusion → AI Fusion) using the processed T5 demo data, targeting the 60% → 75% → 92% accuracy progression to demonstrate AI's superiority with constrained gait patterns.