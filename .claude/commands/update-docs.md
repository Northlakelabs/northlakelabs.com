# Update Documentation - Sync All Docs After Development Progress

Systematically update all project documentation to reflect current development progress and maintain consistency across the 5 core files.

## Execution Steps

### Step 1: Assess Current Development State
- `TodoRead` - Check completed vs pending tasks
- `Bash "git log --oneline -5"` - Review recent development progress
- `LS src/components/interactive` - Check implemented components
- `LS scripts` - See completed processing scripts
- `LS public/demo-data` - Check generated demo files

### Step 2: Review Core Documentation Files for Updates

**5 Core Documentation Files to Check:**
- `Read CLAUDE.md` (lines 110-140) - Current development status and phase progress
- `Read docs/technical-specs.md` (lines 1-50) - Technical implementation progress and component status
- `Read docs/design.md` (lines 348-380) - Current development phase status
- `Read docs/development-log.md` (lines 1-30) - Recent session progress and phase completion status

### Step 3: Update Progress Tracking & Human Time Logging

**Human Time Session Logging:**
- `Bash "git log --oneline --since='1 day ago' --format='%H %cd %s' --date=iso"` - Check recent commits with timestamps
- Calculate session duration from commit timestamps and current time
- Update `docs/development-log.md` with actual human-hours spent
- Log specific activities completed in this session (3-4 lines max)

**Phase Progress Updates:**
- **Phase A (Days 1-3)**: Update completed checkboxes in timeline
- **Phase B (Days 4-6)**: Mark started/completed algorithm implementations
- **Phase C (Days 7-10)**: Track UI component development
- **Phase D (Days 11-13)**: Record integration and optimization progress

**Files to Update Based on Progress:**

#### development-log.md Updates:
- **Session Log section**: Add new session entry with actual duration (3-4 lines max)
- **Phase completion metrics**: Update actual vs estimated time
- **Velocity calculations**: Update simple percentage improvements
- **Current phase status**: Update Phase B1/B2 completion status

#### technical-specs.md Updates:
- **Implementation Timeline section**: Update ✅ checkboxes for completed features
- **Algorithm Progress section**: Mark completed detection algorithms
- **Performance Metrics section**: Update actual vs target performance numbers
- **Technical specifications**: Refine based on actual implementation details

#### design.md Updates:
- **Development Phase section**: Update current phase progress
- **Interactive Demonstrations section**: Update current demo status
- **Recent Accomplishments section**: Add new completed features (keep concise)

#### CLAUDE.md Updates:
- **Current Development Phase section**: Update Phase B1/B2 status
- **Interactive Demo details**: Update technical implementation status
- **Common Tasks section**: Add new development procedures discovered
- **Smart Caching section**: Update performance improvements achieved

### Step 4: Update Based on Implementation Discoveries

**Technical Updates:**
- **Performance metrics**: Update actual vs target performance numbers
- **Algorithm accuracy**: Record real accuracy progression results
- **File sizes**: Update actual demo data file sizes
- **Processing times**: Record real CSV processing performance

**Implementation Notes:**
- **Challenges encountered**: Document technical obstacles and solutions
- **Architecture decisions**: Record important technical choices made
- **Performance optimizations**: Note successful optimization strategies
- **Data insights**: Record findings from trial analysis and processing

### Step 5: Maintain Consistency Across Files

**Cross-Reference Checks:**
- **Accuracy targets**: Ensure 60% → 75% → 92% consistent across all docs
- **Timeline references**: Verify Phase A-D descriptions match
- **Technical specifications**: Ensure component names and file paths align
- **Development priorities**: Confirm current focus areas are consistent

**Format Consistency:**
- **Checkbox formatting**: Use ✅ for completed, ❌ for failed, ⏳ for in-progress
- **Code block syntax**: Ensure consistent JavaScript/TypeScript formatting
- **File path references**: Verify all paths are current and accurate
- **Progress indicators**: Use consistent "X/Y completed" format

### Step 6: Add New Documentation Sections (If Needed)

**When Implementation Reveals New Needs:**
- **Troubleshooting sections**: Common issues and solutions
- **Performance tuning**: Optimization techniques discovered
- **Data processing notes**: CSV parsing insights and best practices
- **Algorithm tuning**: Parameter adjustments and calibration notes

### Step 7: Maintain 5-File Documentation Structure

**Validate Core Documentation Structure:**
- `LS docs/` - Ensure only core files exist (technical-specs.md, design.md, development-log.md + archive/)
- Check that no new .md files have been created outside the 5-file structure
- If new files exist, determine if they should be consolidated or archived

**Maintain `.claude/commands/prime.md` Consistency:**
- **Verify reading sequence** matches current 5-file structure
- **Update Context Summary** to reflect current development phase
- **Update phase references** and current focus areas
- **Ensure file paths** are accurate for consolidated structure

**5-File Structure Enforcement:**
- `CLAUDE.md` - Primary development guide
- `README.md` - Project overview
- `docs/technical-specs.md` - Consolidated technical reference
- `docs/design.md` - Design system and strategy
- `docs/development-log.md` - Compact progress tracking

### Step 8: Validation and Consistency Check

**Final Validation Steps:**
- **Read through updated sections** to ensure accuracy
- **Check for conflicting information** between files
- **Verify all links and file references** are current
- **Ensure phase progress is accurately reflected**
- **Verify prime.md includes all critical context documents**

## Update Decision Matrix

**Always Update When:**
- ✅ Major tasks completed (mark checkboxes)
- ✅ New components implemented (add to architecture docs)
- ✅ Performance targets achieved (update metrics)
- ✅ Technical decisions made (document in specifications)
- ✅ Phase transitions (update timeline and priorities)
- ✅ Human development sessions end (log actual time spent)
- ✅ New documentation files created (add to prime.md)

**Consider Updating When:**
- 🤔 Minor optimizations made (add to notes)
- 🤔 Development approach refined (update methodology)
- 🤔 New tools or libraries added (update tech stack)
- 🤔 Testing insights gained (enhance testing guidelines)

**Don't Update For:**
- ❌ Temporary experimental changes
- ❌ Work-in-progress incomplete features
- ❌ Minor code formatting or style changes
- ❌ Debugging and troubleshooting sessions

## Progress Tracking Examples

**Phase A Completion Example:**
```markdown
### Phase A: Data Pipeline (Days 1-3) - COMPLETED ✅
1. ✅ **Trial Analysis & Selection** - T05 selected as optimal demo trial
2. ✅ **CSV Processing Pipeline** - Build-time processing implemented
3. ✅ **Data Synchronization** - 1000Hz unified timeline achieved
4. ✅ **JSON Export Generation** - 487KB optimized demo file generated
```

**Phase B Progress Example:**
```markdown
### Phase B: Algorithm Implementation (Days 4-6) - IN PROGRESS ⏳
1. ✅ **Stage 1: Traditional Detection** - 58% accuracy achieved
2. ⏳ **Stage 2: Basic Fusion** - EMG integration in development
3. ❌ **Stage 3: AI Fusion** - Not started
4. ❌ **Accuracy Measurement System** - Pending algorithm completion
```

**Prime.md Update Example:**
```markdown
## Step 2: Read Current Development Plan  
Read the comprehensive development documentation:
- `Read docs/demoplan.md` - CURRENT ACTIVE PLAN: Multi-sensor fusion demo implementation
- `Read docs/design.md` - Overall site strategy and current development phase
- `Read docs/demo-specifications.md` - Technical specifications for implementation
+ `Read docs/time-tracking.md` - Session time tracking and development velocity metrics
+ `Read docs/phase-a-completion.md` - Phase A completion summary and lessons learned
```

## Usage Guidelines

**Run this command when:**
- 🎯 Completing major development milestones
- 🎯 Finishing development phases or sub-phases
- 🎯 Before team handoffs or project reviews
- 🎯 After implementing significant new features
- 🎯 When documentation becomes out of sync with reality
- 🎯 At the end of each development session (for time tracking)

**Command Output:**
- Summary of documentation files updated
- List of progress items marked complete
- Note any new sections or insights added
- Highlight any inconsistencies resolved
- Report prime.md updates if new docs were added
- Log actual human time spent in current session

This command ensures all project stakeholders have current, accurate information about development progress and technical implementation details throughout the multi-sensor fusion demo development cycle.