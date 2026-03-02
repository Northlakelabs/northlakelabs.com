# Documentation Pruning Command

## Purpose
Consolidate and prune project documentation to reduce context window usage while preserving all critical information needed for continued development. Target: 50-70% size reduction while maintaining 100% development context.

## Target Document Structure (5 Core Files)

### Files to MAINTAIN
1. **`CLAUDE.md`** (Root) - Primary development guide (~300 lines max)
2. **`README.md`** (Root) - Project overview (keep unchanged)
3. **`docs/technical-specs.md`** (NEW) - Consolidated technical reference (~400 lines max)
4. **`docs/design.md`** (Existing) - Design system and strategy (~200 lines max)
5. **`docs/development-log.md`** (NEW) - Compact progress tracking (~150 lines max)

### Files to CONSOLIDATE/ARCHIVE
- **`docs/demoplan.md`** → Merge into `technical-specs.md`
- **`docs/demo-specifications.md`** → Merge into `technical-specs.md`
- **`docs/time-tracking.md`** → Condense into `development-log.md`
- **`docs/phase-a-completion.md`** → Archive to `docs/archive/`
- **`docs/phase-b-test-results.md`** → Archive to `docs/archive/`
- **`docs/documentation-update-summary.md`** → Delete (meta-documentation)

## Consolidation Strategy

### Phase 1: Content Analysis & Backup
1. **Create archive directory**: `docs/archive/[timestamp]/`
2. **Backup all existing docs** to archive
3. **Scan for any additional .md files** in root and docs/
4. **Map critical vs duplicate content** across all files

### Phase 2: Careful Consolidation

#### Create `docs/technical-specs.md`
**Source Files**: `demoplan.md` + `demo-specifications.md` + technical sections from other files

**PRESERVE EXACTLY** (Critical for Development):
- **Component Architecture**: Complete `src/components/interactive/MultiSensorFusionDemo/` structure
- **Data Pipeline Commands**: `npm run process-data`, `analyze-trials`, `process-data-force`
- **Algorithm Specifications**: Traditional → Basic Fusion → AI Fusion progression (60% → 75% → 92%)
- **Technical Solutions**: SSR fixes, Chart.js optimizations, smart caching implementation
- **File Locations**: `public/demo-data/`, `scripts/`, component paths, generated files
- **Performance Targets**: 60fps rendering, loading times, accuracy metrics
- **TypeScript Interfaces**: All established patterns and type definitions
- **Build Integration**: Package.json scripts and build process details

**CONSOLIDATE CAREFULLY**:
- Remove duplicate project overviews (keep one authoritative version)
- Merge overlapping technical requirements into unified sections
- Combine similar algorithm descriptions

#### Create `docs/development-log.md`
**Source Files**: `time-tracking.md` + status sections from multiple files

**PRESERVE EXACTLY**:
- **Current Phase Status**: Phase B1 complete ✅, Phase B2 ready to start 🎯
- **Human Hours by Phase**: Phase A (3.5h), Phase B1 (8.5h), Phase B2 (TBD)
- **Development Velocity**: ~50-70% faster than estimates
- **Next Immediate Tasks**: Basic Fusion + AI Fusion algorithm implementation
- **Critical Technical Decisions**: Smart caching, Chart.js solutions, component patterns
- **Current Demo Status**: 81 events detected, interactive controls operational

**SIMPLIFY TO**:
- **Milestone Summaries**: Major completions in 3-4 lines each
- **Session Format**: Date, Duration, Key Outcomes (no verbose logs)
- **Velocity Metrics**: Simple percentage improvements vs detailed analysis

#### Refine `CLAUDE.md`
**REMOVE DUPLICATES** (now in technical-specs.md):
- Detailed component architecture descriptions
- Verbose algorithm implementation details
- Duplicate development phase status information

**PRESERVE ESSENTIAL**:
- Development commands and workflows
- Smart caching system details
- Current development guidelines
- Integration patterns and key technologies
- Brand guidelines and styling patterns

#### Refine `docs/design.md`
**PRESERVE**:
- Brand identity and color schemes
- Typography and visual patterns
- Site architecture and content strategy
- Component design patterns

**REMOVE**:
- Duplicate technical implementation details
- Verbose progress tracking (now in development-log.md)

### Phase 3: Archive Strategy
Move to `docs/archive/[timestamp]/`:
- All original files before modification
- `phase-a-completion.md`
- `phase-b-test-results.md`
- `documentation-update-summary.md`
- Any additional .md files not in core 5

### Phase 4: Validation & Integration

#### Critical Validation Checks
1. **Component Architecture**: Verify complete MultiSensorFusionDemo structure documented
2. **Commands Present**: All npm scripts and development commands referenced
3. **Technical Context**: Phase B2 continuation context fully preserved
4. **File Paths**: All script locations, data files, and component paths documented
5. **Integration Points**: Cross-references between documents maintained

#### Size Validation
- `CLAUDE.md`: ≤ 300 lines
- `technical-specs.md`: ≤ 400 lines  
- `design.md`: ≤ 200 lines
- `development-log.md`: ≤ 150 lines
- **Total Target**: ~50-70% reduction from current documentation size

#### Command Integration Testing
Ensure updated structure works with:
- `.claude/commands/update-docs.md` (update file references)
- `.claude/commands/prime.md` (update reading sequence)

## Document Governance Rules

### Single Source of Truth
- Each piece of information lives in exactly one document
- Cross-reference instead of duplicating content
- Maintain clear ownership of information types

### Maintenance Principles
1. **Active Pruning**: Remove outdated info when adding new content
2. **Size Limits**: Enforce maximum line counts to prevent bloat
3. **Session Continuity**: Always preserve context needed to continue work
4. **Technical Preservation**: Never remove working solutions or established patterns

## Execution Safety
- **Backup First**: Full archive before any changes
- **Incremental Changes**: Create one file at a time, validate before continuing
- **Rollback Plan**: Keep original files until new structure validated
- **Integration Testing**: Verify other commands work with new structure

## Expected Outcomes
- **Context Efficiency**: 50-70% reduction in documentation size
- **Preserved Functionality**: 100% of critical development information maintained
- **Faster Priming**: Reduced context window usage for development sessions
- **Cleaner Organization**: Logical information architecture with clear ownership
- **Session Continuity**: All context needed to continue Phase B2 development preserved

## Usage
Run this command periodically (suggested: after major phase completions) to maintain lean, efficient documentation that scales with project growth while preserving all essential development context.