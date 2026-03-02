# Web-Based Ground Truth Annotation Tool

A reliable, browser-based annotation interface for creating ground truth gait event data.

## 🎯 Overview

This tool provides a **much more reliable alternative** to the problematic matplotlib-based interactive annotation in Jupyter notebooks. It uses native browser click events with Chart.js for consistent, environment-independent annotation.

## 🚀 Features

- ✅ **Extremely reliable** - browser click events always work
- ✅ **Environment independent** - works anywhere with a browser
- ✅ **Professional interface** - Chart.js visualization with native click handling
- ✅ **Multi-modal data display** - Force plates + Key markers + EMG activity
- ✅ **Automatic saving/loading** - JSON format compatible with existing validation workflow
- ✅ **Easy to use** - just click on charts to annotate events

## 📋 Quick Start

### 1. Start the Server
```bash
# From the repository root
source venv/bin/activate
cd scripts/ground-truth-annotation/web-tool
python annotation_server.py
```

### 2. Open in Browser
Navigate to: http://localhost:5000

### 3. Annotate Events
1. Click **"Load Trial T5"**
2. **Click on any chart** at the time of a gait event
3. **Select event type** when prompted:
   - Left Heel Strike
   - Left Toe Off  
   - Right Heel Strike
   - Right Toe Off
4. **Save annotations** when complete

## 📊 Data Display

The interface shows three synchronized charts:

### Force Plates (Top)
- **Blue line**: Left foot vertical force (Fz_L)
- **Red line**: Right foot vertical force (Fz_R)
- **Look for**: Force spikes (heel strikes), force drops (toe offs)

### Key Gait Markers (Middle)
- **Blue solid**: Left toe vertical position
- **Blue dashed**: Left heel vertical position
- **Red solid**: Right toe vertical position  
- **Red dashed**: Right heel vertical position
- **Look for**: Marker minima often correspond to ground contact

### EMG Activity (Bottom)
- **Multiple colors**: EMG envelope signals from 8 channels
- **Look for**: Muscle activation patterns that correlate with gait events

## 🎯 Annotation Strategy

### For Constrained Gait (T5 Trial)
- **Subject constraint**: Left leg locked in extension
- **Expected pattern**: Right leg shows normal gait, left leg shows minimal/altered patterns
- **Focus area**: 20-second window (consistent with main demo)
- **Expected events**: ~20-25 total events

### Visual Cues
- **Heel strikes**: Force spikes + heel marker minima + EMG activation
- **Toe offs**: Force drops + toe marker minima + EMG patterns
- **Use all three data types** for accurate annotation

## 💾 Output Format

Annotations are saved as JSON files compatible with the existing validation workflow:

```json
{
  "trial_info": {
    "trial_id": "T5",
    "total_events": 23,
    "annotation_date": "2025-06-22T10:30:00",
    "duration_seconds": 20.0
  },
  "methodology": {
    "annotation_method": "manual_expert_web_interface",
    "constraint_type": "left_leg_extension_lock",
    "data_modalities": ["force_plates", "kinematics", "emg"]
  },
  "events": [
    {
      "time": 1.234,
      "type": "right_heel_strike",
      "annotation_method": "web_interface_click",
      "timestamp": "2025-06-22T10:30:15Z"
    }
  ]
}
```

## 🔧 Technical Details

### API Endpoints
- `GET /` - Main annotation interface
- `GET /api/trials` - List available trials  
- `GET /api/data/<trial_id>` - Load trial data
- `POST /api/annotations/<trial_id>` - Save annotations
- `GET /api/annotations/<trial_id>` - Load existing annotations

### Data Processing
- **Sampling rate**: Unified 1000Hz timeline
- **Synchronization**: Multi-modal data alignment
- **Time window**: 20 seconds (0-20s) for demo consistency
- **Force data**: Left/Right Fx, Fy, Fz
- **Kinematics**: 4 key heel/toe markers (vertical positions)
- **EMG**: 8 envelope channels for muscle activity patterns

## 🔄 Integration with Existing Workflow

This web tool **replaces** the problematic `02_annotation_tool.ipynb` while maintaining compatibility:

1. **01_data_exploration.ipynb** → Explore data ✅
2. **Web annotation tool** → Create ground truth ✅ (replaces notebook 02)
3. **03_validation.ipynb** → Validate algorithms ✅

The output JSON format is identical, so existing notebook 03 works without changes.

## ⚠️ Troubleshooting

### Server Won't Start
```bash
# Make sure Flask is installed
source venv/bin/activate
pip install flask

# Check if port 5000 is busy
lsof -i :5000
```

### Data Loading Errors
- Ensure T5 CSV files exist in `../data/` directory
- Check that all three modalities are present (kinetics, EMG, kinematics)
- Verify virtual environment is activated

### Browser Issues
- Try a different browser (Chrome/Firefox recommended)
- Clear browser cache
- Check browser console for JavaScript errors

## 🎉 Advantages Over Jupyter Notebook Approach

| Aspect | Jupyter Notebook | Web Tool |
|--------|------------------|----------|
| **Reliability** | ❌ matplotlib backend issues | ✅ Native browser events |
| **Environment** | ❌ VSCode/Jupyter Lab specific | ✅ Any browser |
| **Click Events** | ❌ Often don't register | ✅ Always work |
| **Debugging** | ❌ Hard to troubleshoot | ✅ Browser dev tools |
| **Performance** | ❌ Can be slow/laggy | ✅ Smooth Chart.js rendering |
| **Setup** | ❌ Backend configuration | ✅ Just open browser |

---

**Created**: June 2025  
**Status**: ✅ Fully operational and tested  
**Next**: Use for Phase B2 algorithm validation with ground truth reference