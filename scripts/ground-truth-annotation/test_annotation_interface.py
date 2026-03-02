#!/usr/bin/env python3
"""
Test script to verify the improved annotation interface with key markers.
"""

import sys
sys.path.append('src')

import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend for testing
import matplotlib.pyplot as plt
from data_loader import GaitDataLoader
from annotator import create_demo_annotation_session

def test_annotation_interface():
    """Test the improved annotation interface with key markers."""
    print("Testing improved annotation interface...")
    
    # Create annotation session
    print("1. Creating annotation session...")
    annotator = create_demo_annotation_session(
        trial_id="T5",
        data_dir="data",
        output_dir="output"
    )
    
    # Load trial data
    print("2. Loading trial data with key markers...")
    annotator.load_trial("T5")
    
    # Check that key markers are loaded
    kinematics = annotator.synchronized_data['kinematics']
    print(f"   Kinematics columns: {list(kinematics.columns)}")
    
    # Check for expected key markers
    expected_markers = ['right_toe_z', 'right_heel_z', 'left_toe_z', 'left_heel_z']
    markers_found = [col for col in expected_markers if col in kinematics.columns]
    print(f"   Key markers found: {markers_found}")
    
    # Test visualization (first 20 seconds)
    print("3. Testing constrained gait visualization...")
    try:
        # Import the visualization function directly
        from visualizer import create_constrained_gait_plot
        
        # Create the plot with first 20 seconds
        fig = create_constrained_gait_plot(
            annotator.synchronized_data,
            time_window=20.0
        )
        
        # Save test figure
        plt.savefig('output/test_annotation_interface.png', dpi=150, bbox_inches='tight')
        plt.close()
        
        print("   ✓ Annotation interface plot saved to output/test_annotation_interface.png")
        
    except Exception as e:
        print(f"   ❌ Visualization test failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Test data quality for first 20 seconds
    print("4. Testing data quality for annotation window...")
    time_mask = kinematics['time'] <= 20.0
    plot_data = kinematics[time_mask]
    
    for marker in markers_found:
        if marker in plot_data.columns:
            valid_data = plot_data[marker].notna().sum()
            range_data = plot_data[marker].max() - plot_data[marker].min()
            print(f"   {marker}: {valid_data}/{len(plot_data)} valid points, range: {range_data:.1f}mm")
    
    print("\n✅ Annotation interface test complete!")
    print("\nExpected improvements:")
    print("  • Kinematic plot now shows only 4 relevant markers")
    print("  • Clear labels: Right Toe, Right Heel, Left Toe, Left Heel")
    print("  • Vertical positions (Z-coordinates) for gait event detection")
    print("  • Visual distinction between left/right and toe/heel markers")
    print("\nReady for expert gait event annotation!")
    
    return True

if __name__ == "__main__":
    try:
        test_annotation_interface()
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()