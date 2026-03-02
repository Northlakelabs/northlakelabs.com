# Analyze Trial - Quick Trial Quality Assessment for Demo Selection

Analyze a specific trial (T1-T30) for constrained gait demo suitability. This command is essential for Phase A trial selection process.

## Usage
`/analyze-trial T05` (replace with desired trial number T01-T30)

## Execution Steps

### Step 1: Basic Trial Information
- `Bash "echo 'Analyzing Trial: ${trialId}'"` - Confirm trial being analyzed
- `LS /mnt/c/Users/Geoff/Documents/Github/Northlakelabs/data/Sub1/Kinetics/Sub1_Kinetics_${trialId}.csv` - Verify kinetics file exists
- `LS /mnt/c/Users/Geoff/Documents/Github/Northlakelabs/data/Sub1/EMG/Sub1_EMG_${trialId}.csv` - Verify EMG file exists
- `LS /mnt/c/Users/Geoff/Documents/Github/Northlakelabs/data/Sub1/Kinematics/Sub1_Kinematics_${trialId}.csv` - Verify kinematics file exists

### Step 2: Duration and Data Volume Analysis
- `Bash "wc -l /mnt/c/Users/Geoff/Documents/Github/Northlakelabs/data/Sub1/Kinetics/Sub1_Kinetics_${trialId}.csv"` - Check kinetics duration
- `Bash "wc -l /mnt/c/Users/Geoff/Documents/Github/Northlakelabs/data/Sub1/EMG/Sub1_EMG_${trialId}.csv"` - Check EMG duration  
- `Bash "wc -l /mnt/c/Users/Geoff/Documents/Github/Northlakelabs/data/Sub1/Kinematics/Sub1_Kinematics_${trialId}.csv"` - Check kinematics duration

**Expected Durations:**
- **Kinetics**: ~301,000 lines (300 seconds × 1000Hz)
- **EMG**: ~602,000 lines (300 seconds × 2000Hz)  
- **Kinematics**: ~30,000 lines (300 seconds × 100Hz)

### Step 3: Data Quality Assessment - Kinetics
- `Read /mnt/c/Users/Geoff/Documents/Github/Northlakelabs/data/Sub1/Kinetics/Sub1_Kinetics_${trialId}.csv` (lines 1-20) - Check header structure
- `Read /mnt/c/Users/Geoff/Documents/Github/Northlakelabs/data/Sub1/Kinetics/Sub1_Kinetics_${trialId}.csv` (lines 100-120) - Sample early data
- `Read /mnt/c/Users/Geoff/Documents/Github/Northlakelabs/data/Sub1/Kinetics/Sub1_Kinetics_${trialId}.csv` (lines 10000-10020) - Sample mid-trial data

**Force Plate Analysis Focus:**
- **Left Force Plate (FP1)**: Columns 2-10 (Fx, Fy, Fz, Mx, My, Mz, Cx, Cy, Cz)
- **Right Force Plate (FP2)**: Columns 11-19 (Fx, Fy, Fz, Mx, My, Mz, Cx, Cy, Cz)
- **Constraint Pattern**: Look for left leg reduced loading vs right leg increased loading
- **Data Quality**: Check for missing values (should see mostly zeros on left, forces on right)

### Step 4: Data Quality Assessment - EMG
- `Read /mnt/c/Users/Geoff/Documents/Github/Northlakelabs/data/Sub1/EMG/Sub1_EMG_${trialId}.csv` (lines 1-10) - Check EMG header structure  
- `Read /mnt/c/Users/Geoff/Documents/Github/Northlakelabs/data/Sub1/EMG/Sub1_EMG_${trialId}.csv` (lines 1000-1010) - Sample EMG data

**EMG Analysis Focus:**
- **16 Channels**: IM EMG1 through IM EMG16 (columns 2-17)
- **Signal Quality**: Look for reasonable voltage ranges (microvolts)
- **Bilateral Patterns**: Check for potential left-right muscle activation differences
- **Artifacts**: Look for obvious noise or saturation issues

### Step 5: Data Quality Assessment - Kinematics  
- `Read /mnt/c/Users/Geoff/Documents/Github/Northlakelabs/data/Sub1/Kinematics/Sub1_Kinematics_${trialId}.csv` (lines 1-10) - Check kinematics header
- `Read /mnt/c/Users/Geoff/Documents/Github/Northlakelabs/data/Sub1/Kinematics/Sub1_Kinematics_${trialId}.csv` (lines 500-510) - Sample marker data

**Kinematics Analysis Focus:**
- **3D Markers**: X, Y, Z coordinates for body markers
- **Key Markers**: Look for hip, knee, ankle markers (RHIP, LHIP, RKNE, LKNE, etc.)
- **Data Completeness**: Check for missing marker data (gaps in tracking)
- **Movement Patterns**: Look for reasonable coordinate ranges

### Step 6: Constraint Pattern Analysis

**Force Asymmetry Assessment:**
- Compare force magnitudes between left (FP1) and right (FP2) force plates
- **Good Constraint**: Clear asymmetry with reduced left forces, increased right forces
- **Poor Constraint**: Similar bilateral forces (constraint not maintained)

**Gait Event Potential:**
- Look for clear force transitions for heel strikes and toe-offs
- **Good Events**: Distinct force peaks and valleys for event detection
- **Poor Events**: Noisy or irregular force patterns

**Walking Consistency:**
- Assess regularity of force patterns throughout trial
- **Good Consistency**: Regular, repeating gait cycles
- **Poor Consistency**: Irregular timing, stops, or artifacts

### Step 7: Demo Suitability Scoring

**Scoring Criteria (Rate each 1-5, 5 = excellent):**

1. **Duration Adequacy** (5 points max)
   - 5: >280 seconds (enough for multiple 20s windows)
   - 3: 200-280 seconds (adequate)
   - 1: <200 seconds (too short)

2. **Constraint Visibility** (5 points max)
   - 5: Clear left-right force asymmetry (>2:1 ratio)
   - 3: Moderate asymmetry (1.5:1 ratio)
   - 1: Minimal asymmetry (<1.2:1 ratio)

3. **Data Quality** (5 points max)
   - 5: No missing values, clean signals
   - 3: Minor gaps or artifacts
   - 1: Significant data issues

4. **Gait Consistency** (5 points max)
   - 5: Regular, clear gait cycles throughout
   - 3: Mostly regular with some variations
   - 1: Irregular or inconsistent patterns

5. **Event Detection Potential** (5 points max)
   - 5: Very clear force transitions for heel strikes/toe-offs
   - 3: Moderately clear events
   - 1: Difficult to identify clear events

### Step 8: Final Assessment and Recommendation

**Overall Trial Rating:**
- **23-25 points: EXCELLENT** - Top candidate for demo
- **18-22 points: GOOD** - Suitable for demo with minor limitations
- **13-17 points: FAIR** - Usable but not optimal
- **8-12 points: POOR** - Not recommended for demo
- **<8 points: UNUSABLE** - Serious quality issues

**Demo Suitability Assessment:**
Provide summary assessment in this format:

```
TRIAL ANALYSIS SUMMARY: ${trialId}
================================

Duration: [X seconds] - [GOOD/FAIR/POOR]
Constraint Pattern: [EXCELLENT/GOOD/FAIR/POOR] 
Data Quality: [EXCELLENT/GOOD/FAIR/POOR]
Gait Consistency: [EXCELLENT/GOOD/FAIR/POOR]
Event Detection: [EXCELLENT/GOOD/FAIR/POOR]

OVERALL SCORE: [X/25] - [EXCELLENT/GOOD/FAIR/POOR/UNUSABLE]

RECOMMENDATION: 
✅ HIGHLY RECOMMENDED for demo
or
⚠️ ACCEPTABLE with minor limitations
or  
❌ NOT RECOMMENDED - [specific reasons]

KEY FINDINGS:
- [Notable constraint patterns observed]
- [Data quality observations]  
- [Specific advantages/disadvantages for demo]

DEMO WINDOW POTENTIAL:
- Estimated [X] viable 20-second windows available
- Best segments likely: [time ranges if observable]
```

## Usage Notes

**When to Use This Command:**
- During Phase A trial selection process
- When comparing multiple candidate trials
- To validate trial quality before processing
- To document trial selection rationale

**Analysis Strategy:**
- Start with trials T05, T10, T15, T20 (systematic sampling)
- Focus on highest-scoring trials for detailed analysis
- Compare 3-5 candidates before final selection
- Document findings for each analyzed trial

**Follow-up Actions:**
- Use highest-scoring trial for Phase A processing pipeline development
- Document trial selection rationale in specifications
- Update todo list with selected trial ID
- Proceed to CSV processing pipeline implementation

This command provides systematic, objective trial assessment to ensure optimal demo data selection for the multi-sensor fusion demonstration.