#!/usr/bin/env python3
"""
Web-based annotation server for gait event ground truth creation.
Provides reliable browser-based annotation interface using Chart.js.
"""

import sys
import os
from pathlib import Path
from flask import Flask, render_template, jsonify, request, send_from_directory
import json
import pandas as pd
import numpy as np
from datetime import datetime

# Add src directory to path for imports
sys.path.append(str(Path(__file__).parent.parent / 'src'))

from data_loader import GaitDataLoader
from synchronizer import MultiModalSynchronizer, compute_emg_envelopes

app = Flask(__name__, 
            static_folder='static',
            template_folder='static')

# Global data storage
loader = None
synchronizer = None
current_trial_data = None

def init_data_loader():
    """Initialize data loader and synchronizer."""
    global loader, synchronizer
    data_dir = Path(__file__).parent.parent / 'data'
    loader = GaitDataLoader(str(data_dir))
    synchronizer = MultiModalSynchronizer(target_rate=1000)
    print(f"✓ Data loader initialized with directory: {data_dir}")

@app.route('/')
def index():
    """Serve the main annotation interface."""
    return send_from_directory('static', 'annotation_tool.html')

@app.route('/annotation.js')
def serve_js():
    """Serve the JavaScript file."""
    return send_from_directory('static', 'annotation.js')

@app.route('/api/trials')
def get_trials():
    """Get list of available trials."""
    try:
        # For now, return T5 which we know works
        trials = [
            {
                'id': 'T5',
                'name': 'Trial 5 (Constrained Gait)',
                'description': 'Subject 1 with left leg locked in extension',
                'duration': '302 seconds',
                'constraint': 'Left leg extension lock'
            }
        ]
        return jsonify({'trials': trials})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/data/<trial_id>')
def get_trial_data(trial_id):
    """Load and return trial data for annotation."""
    global current_trial_data
    
    try:
        print(f"Loading trial {trial_id}...")
        
        # Load raw data
        kinetics_data = loader.load_kinetics(trial_id)
        emg_data = loader.load_emg(trial_id)
        kinematics_data = loader.load_kinematics(trial_id)
        
        print(f"✓ Raw data loaded")
        
        # Synchronize data
        synchronized_data = synchronizer.synchronize_all_modalities({
            'kinetics': kinetics_data,
            'emg': emg_data,
            'kinematics': kinematics_data
        })
        
        print(f"✓ Data synchronized at 1000Hz")
        
        # Load key markers for annotation guidance
        key_markers = loader.load_kinematics_key_markers(trial_id)
        master_timeline = synchronizer.create_master_timeline(synchronized_data['kinetics']['time'].max())
        synchronized_data['key_markers'] = synchronizer.upsample_kinematics(key_markers, master_timeline)
        
        # Compute EMG envelopes
        emg_envelopes = compute_emg_envelopes(synchronized_data['emg'])
        synchronized_data['emg_envelopes'] = emg_envelopes
        
        print(f"✓ EMG envelopes computed")
        print(f"  Available EMG envelope columns: {list(emg_envelopes.columns)}")
        
        # Create 20-second window for annotation (consistent with demo)
        time_window = 20.0
        
        # Filter data to time window
        time_mask = synchronized_data['kinetics']['time'] <= time_window
        
        annotation_data = {
            'trial_id': trial_id,
            'time_window': time_window,
            'sampling_rate': 1000,
            'timestamps': synchronized_data['kinetics']['time'][time_mask].tolist(),
            'force_plates': {
                'left': {
                    'fz': synchronized_data['kinetics']['Fz_L'][time_mask].tolist(),
                    'fx': synchronized_data['kinetics']['Fx_L'][time_mask].tolist(),
                    'fy': synchronized_data['kinetics']['Fy_L'][time_mask].tolist()
                },
                'right': {
                    'fz': synchronized_data['kinetics']['Fz_R'][time_mask].tolist(),
                    'fx': synchronized_data['kinetics']['Fx_R'][time_mask].tolist(),
                    'fy': synchronized_data['kinetics']['Fy_R'][time_mask].tolist()
                }
            },
            'key_markers': {
                'left_heel_z': synchronized_data['key_markers']['left_heel_z'][time_mask].tolist(),
                'left_toe_z': synchronized_data['key_markers']['left_toe_z'][time_mask].tolist(),
                'right_heel_z': synchronized_data['key_markers']['right_heel_z'][time_mask].tolist(),
                'right_toe_z': synchronized_data['key_markers']['right_toe_z'][time_mask].tolist()
            },
            'emg_envelopes': {
                col.replace('_envelope', ''): synchronized_data['emg_envelopes'][col][time_mask].tolist()
                for col in list(emg_envelopes.columns)[1:9]  # First 8 EMG channels (skip time column)
                if col != 'time'
            }
        }
        
        # Store for later use
        current_trial_data = synchronized_data
        
        print(f"✓ Trial {trial_id} prepared for annotation")
        print(f"  - Time window: 0 to {time_window}s")
        print(f"  - Data points: {len(annotation_data['timestamps'])}")
        print(f"  - Force plates: Left & Right (Fx, Fy, Fz)")
        print(f"  - Key markers: 4 heel/toe positions")
        print(f"  - EMG channels: 8 envelope signals")
        
        return jsonify(annotation_data)
        
    except Exception as e:
        print(f"❌ Error loading trial {trial_id}: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/annotations/<trial_id>', methods=['POST'])
def save_annotations(trial_id):
    """Save annotated events."""
    try:
        annotations = request.json
        
        # Create output directory
        output_dir = Path(__file__).parent.parent / 'output'
        output_dir.mkdir(exist_ok=True)
        
        # Prepare export data
        export_data = {
            'trial_info': {
                'trial_id': trial_id,
                'total_events': len(annotations['events']),
                'annotation_date': datetime.now().isoformat(),
                'duration_seconds': annotations.get('time_window', 20.0),
                'annotator': 'web_tool',
                'sampling_rate': 1000
            },
            'methodology': {
                'annotation_method': 'manual_expert_web_interface',
                'constraint_type': 'left_leg_extension_lock',
                'data_modalities': ['force_plates', 'kinematics', 'emg'],
                'time_window': f"0 to {annotations.get('time_window', 20.0)} seconds",
                'annotation_tool': 'web_based_chart_interface'
            },
            'events': annotations['events']
        }
        
        # Save to file
        output_file = output_dir / f'{trial_id}_ground_truth_events.json'
        with open(output_file, 'w') as f:
            json.dump(export_data, f, indent=2)
        
        print(f"✓ Annotations saved to: {output_file}")
        print(f"  - Total events: {len(annotations['events'])}")
        
        # Return summary
        if annotations['events']:
            events_df = pd.DataFrame(annotations['events'])
            event_counts = events_df['type'].value_counts().to_dict()
        else:
            event_counts = {}
        
        return jsonify({
            'success': True,
            'file_path': str(output_file),
            'total_events': len(annotations['events']),
            'event_distribution': event_counts
        })
        
    except Exception as e:
        print(f"❌ Error saving annotations: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/annotations/<trial_id>', methods=['GET'])
def load_annotations(trial_id):
    """Load existing annotations if they exist."""
    try:
        output_file = Path(__file__).parent.parent / 'output' / f'{trial_id}_ground_truth_events.json'
        
        if output_file.exists():
            with open(output_file, 'r') as f:
                data = json.load(f)
            return jsonify({
                'exists': True,
                'events': data.get('events', []),
                'trial_info': data.get('trial_info', {})
            })
        else:
            return jsonify({'exists': False, 'events': []})
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("🚀 Starting Ground Truth Annotation Server")
    print("=" * 50)
    
    # Initialize data loader
    init_data_loader()
    
    print(f"📝 Annotation interface will be available at:")
    print(f"   http://localhost:5000")
    print(f"")
    print(f"🎯 Features:")
    print(f"   - Reliable browser-based annotation")
    print(f"   - Chart.js visualization with native click events")
    print(f"   - Multi-modal data display (Force + Kinematics + EMG)")
    print(f"   - Automatic annotation saving and loading")
    print(f"   - Compatible with existing validation workflow")
    print(f"")
    print(f"💡 Usage:")
    print(f"   1. Open http://localhost:5000 in your browser")
    print(f"   2. Load trial T5")
    print(f"   3. Click on charts to annotate gait events")
    print(f"   4. Select event type when prompted")
    print(f"   5. Save annotations for algorithm validation")
    print("=" * 50)
    
    app.run(debug=True, host='0.0.0.0', port=5000)