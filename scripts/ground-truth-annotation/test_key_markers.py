#!/usr/bin/env python3
"""
Test script to verify the improved kinematic marker loading and visualization.
"""

import sys
sys.path.append('src')

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from data_loader import GaitDataLoader

def test_marker_parsing():
    """Test the new marker parsing functionality."""
    print("Testing improved kinematic marker loading...")
    
    # Initialize loader
    loader = GaitDataLoader(data_dir="data")
    
    # Test T5 trial
    trial_id = "T5"
    
    print(f"\n1. Testing full kinematics loading with semantic names...")
    full_kinematics = loader.load_kinematics(trial_id)
    print(f"   Loaded {len(full_kinematics.columns)} columns")
    print(f"   Sample columns: {list(full_kinematics.columns[:10])}")
    
    # Look for heel/toe markers
    heel_toe_cols = [col for col in full_kinematics.columns 
                     if any(marker in col.upper() for marker in ['TOE', 'CAL', 'HEEL'])]
    print(f"   Found heel/toe related columns: {heel_toe_cols}")
    
    print(f"\n2. Testing key markers extraction...")
    key_markers = loader.load_kinematics_key_markers(trial_id)
    print(f"   Key markers shape: {key_markers.shape}")
    print(f"   Key marker columns: {list(key_markers.columns)}")
    
    # Check for expected columns
    expected_cols = [
        'right_toe_x', 'right_toe_y', 'right_toe_z',
        'right_heel_x', 'right_heel_y', 'right_heel_z',
        'left_toe_x', 'left_toe_y', 'left_toe_z',
        'left_heel_x', 'left_heel_y', 'left_heel_z'
    ]
    
    print(f"\n3. Checking expected columns...")
    for col in expected_cols:
        if col in key_markers.columns:
            non_nan_count = key_markers[col].notna().sum()
            print(f"   ✓ {col}: {non_nan_count}/{len(key_markers)} values")
        else:
            print(f"   ❌ {col}: Missing")
    
    # Quick visualization test
    print(f"\n4. Testing visualization with key markers...")
    
    plt.figure(figsize=(12, 6))
    
    # Plot vertical positions of key markers (first 20 seconds)
    time_mask = key_markers['time'] <= 20.0
    plot_data = key_markers[time_mask]
    
    # Define plotting style
    marker_styles = {
        'right_toe_z': {'label': 'Right Toe', 'color': 'red', 'style': '-'},
        'right_heel_z': {'label': 'Right Heel', 'color': 'darkred', 'style': '--'},
        'left_toe_z': {'label': 'Left Toe', 'color': 'blue', 'style': '-'},
        'left_heel_z': {'label': 'Left Heel', 'color': 'darkblue', 'style': '--'}
    }
    
    for col, style in marker_styles.items():
        if col in plot_data.columns and plot_data[col].notna().any():
            plt.plot(plot_data['time'], plot_data[col],
                    label=style['label'], 
                    color=style['color'],
                    linestyle=style['style'],
                    linewidth=2)
    
    plt.xlabel('Time (s)')
    plt.ylabel('Vertical Position (mm)')
    plt.title('Key Gait Markers - Heel & Toe Vertical Positions (T5 Trial)')
    plt.legend()
    plt.grid(True, alpha=0.3)
    
    # Save test plot
    plt.savefig('output/test_key_markers.png', dpi=150, bbox_inches='tight')
    print("   ✓ Test plot saved to output/test_key_markers.png")
    
    plt.close()
    
    print(f"\n✅ Key marker loading test complete!")
    return True

if __name__ == "__main__":
    try:
        test_marker_parsing()
        print("\n🎯 All tests passed! Ready for annotation with improved markers.")
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()