# Commit Phase - Smart Git Commit for Development Phases

Intelligently create commits based on current development phase and completed work.

## Execution Steps

### Step 1: Assess Current State
Execute these commands to understand what's changed:
- `Bash "git status"` - See all changed, staged, and untracked files
- `Bash "git diff --stat"` - Statistical summary of changes
- `TodoRead` - Check current task list and completion status

### Step 2: Analyze Development Context
- `Read docs/demoplan.md` (lines 355-380) - Check current phase timeline
- Determine current development phase (A/B/C/D) based on work completed
- Identify primary focus area of changes

### Step 3: Generate Intelligent Commit Message

**Phase Detection Logic:**
- **Phase A (Days 1-3)**: Data pipeline, trial analysis, CSV processing
- **Phase B (Days 4-6)**: Algorithm implementation, detection stages
- **Phase C (Days 7-10)**: Interactive UI, charts, controls
- **Phase D (Days 11-13)**: Integration, optimization, polish

**Commit Message Format:**
```
feat: [Phase X] - [Brief descriptive title]

[Completed work details - 2-3 bullet points max]

Phase [X] progress: [Completed tasks]/[Total phase tasks]
[Any important technical notes or decisions]

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Example Commit Messages:**

*Phase A Example:*
```
feat: Phase A - Trial analysis and CSV processing pipeline

- Implement automated trial quality assessment for T1-T30
- Add CSV parsing utilities for kinetics, EMG, and kinematics data
- Create data synchronization pipeline for multi-rate sensors

Phase A progress: 2/4 tasks completed
Build-time processing strategy established for optimal performance

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

*Phase B Example:*
```
feat: Phase B - Traditional and basic fusion algorithm implementation

- Add Stage 1 traditional force plate detection with failure modes
- Implement Stage 2 basic EMG + force fusion with rule limitations
- Create accuracy measurement system for algorithm comparison

Phase B progress: 3/4 tasks completed
Established 60% → 75% accuracy progression baseline

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Step 4: Smart File Staging
Based on file analysis, stage relevant files:
- **Documentation changes**: Stage `.md` files
- **Implementation files**: Stage new `.ts/.tsx` files and significant changes
- **Configuration**: Stage `package.json`, config files if modified
- **Data processing**: Stage `scripts/` directory changes
- **Commands**: Stage `.claude/commands/` directory changes
- **Skip**: Large data files (>1MB), temporary files, build outputs, `node_modules/`

**Comprehensive Staging Strategy:**
```bash
# Stage all relevant files including untracked
git add *.md docs/ src/ scripts/ package.json .claude/commands/
git add public/demo-data/ --ignore-errors  # Stage if exists, ignore if too large
```

### Step 5: Execute Commit and Push
- Stage the appropriate files with `git add`
- Create commit with generated message using HEREDOC format
- Confirm commit was successful with `git log --oneline -1`
- **Push to remote**: `git push origin [current-branch]`
- Confirm push was successful

## Commit Decision Matrix

**Files to Always Stage:**
- `src/` changes (components, algorithms, utilities)
- `scripts/` changes (data processing pipeline)
- `docs/` updates (specifications, plans)
- `package.json` changes (new dependencies)
- `.claude/commands/` changes (custom commands)
- `*.md` files (documentation updates)
- `public/demo-data/` (if <1MB, generated demo files)

**Files to Skip:**
- `data/` directory (raw CSV files - too large)
- `node_modules/` (dependencies)
- `.astro/` build cache
- Large binary files (>1MB)
- Temporary files (`.tmp`, `.log`)
- Build outputs (`dist/`)

**Special Cases:**
- If only documentation changed: Use `docs:` prefix instead of `feat:`
- If fixing bugs: Use `fix:` prefix
- If refactoring without new features: Use `refactor:` prefix

## Usage Notes

This command should be used at logical development milestones:
- After completing a major task or feature
- Before switching development phases
- At end of development sessions
- When significant progress has been made

The command will automatically:
1. Analyze current work and phase
2. Generate appropriate commit message
3. Stage relevant files intelligently (including untracked)
4. Execute the commit
5. Push to remote repository
6. Confirm success

This streamlines the commit process while maintaining clear development phase tracking throughout the 13-day multi-sensor fusion demo implementation cycle.

## Implementation Example

When executing `/commit-phase`, the tool will:

```bash
# Stage comprehensive file set
git add *.md docs/ src/ scripts/ package.json .claude/commands/
git add public/demo-data/ 2>/dev/null || true  # Ignore if too large

# Create intelligent commit
git commit -m "$(cat <<'EOF'
feat: Phase A - [Generated title based on changes]
[Bullet points of completed work]
Phase A progress: X/Y tasks completed
EOF
)"

# Push to remote
git push origin $(git branch --show-current)

# Confirm success
git log --oneline -1
echo "✅ Commit and push completed successfully"
```