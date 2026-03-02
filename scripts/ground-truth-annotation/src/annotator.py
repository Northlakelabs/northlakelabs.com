"""
Interactive annotation class for gait event detection.
Provides streamlined workflow for manual ground truth annotation.
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from typing import Dict, List, Optional, Tuple
import json
from pathlib import Path

from data_loader import GaitDataLoader
from synchronizer import MultiModalSynchronizer, compute_emg_envelopes
from visualizer import GaitDataVisualizer, create_constrained_gait_plot

class GaitEventAnnotator:
    """
    Complete workflow for gait event ground truth annotation.
    Handles data loading, synchronization, visualization, and export.
    """
    
    def __init__(self, data_dir: str = "data", output_dir: str = "output"):
        """
        Initialize annotator with data and output directories.
        
        Args:
            data_dir: Directory containing CSV data files
            output_dir: Directory for saving annotation results
        """
        self.data_dir = Path(data_dir)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        
        # Initialize components
        self.loader = GaitDataLoader(data_dir)
        self.synchronizer = MultiModalSynchronizer(target_rate=1000)
        self.visualizer = GaitDataVisualizer()
        
        # Data storage
        self.trial_id = None
        self.raw_data = None
        self.synchronized_data = None
        self.emg_envelopes = None
        
    def load_trial(self, trial_id: str) -> None:
        """
        Load and prepare trial data for annotation.
        
        Args:
            trial_id: Trial identifier (e.g., "T5")
        """
        print(f"Loading trial {trial_id}...")
        
        self.trial_id = trial_id
        
        # Load all modalities
        self.raw_data = self.loader.load_all_modalities(trial_id)
        
        # Also load key markers for better annotation visualization
        self.raw_data['key_markers'] = self.loader.load_kinematics_key_markers(trial_id)
        
        # Synchronize data
        print("Synchronizing multi-modal data...")
        self.synchronized_data = self.synchronizer.synchronize_all_modalities(self.raw_data)
        
        # Replace kinematics with key markers for annotation interface
        if 'key_markers' in self.synchronized_data:
            print("Using key heel/toe markers for annotation...")
            self.synchronized_data['kinematics'] = self.synchronized_data['key_markers']
        
        # Compute EMG envelopes for visualization
        if 'emg' in self.synchronized_data:
            print("Computing EMG envelopes...")
            self.emg_envelopes = compute_emg_envelopes(
                self.synchronized_data['emg'],
                window_ms=50.0,
                sampling_rate=1000
            )
        
        duration = self.synchronized_data['kinetics']['time'].max()
        print(f"Trial {trial_id} loaded successfully. Duration: {duration:.1f} seconds")
    
    def create_annotation_interface(self, time_range: Tuple[float, float] = None,
                                  constrained_gait_view: bool = True) -> plt.Figure:
        """
        Create interactive annotation interface.
        
        Args:
            time_range: (start_time, end_time) for focused annotation
            constrained_gait_view: Whether to show constrained gait analysis
            
        Returns:
            matplotlib Figure for annotation
        """
        if self.synchronized_data is None:
            raise ValueError("No trial data loaded. Call load_trial() first.")
        
        print("Creating annotation interface...")
        print("Instructions:")
        print("- Double-click on any plot to add gait events")
        print("- You will be prompted to select event type")
        print("- Events are marked across all subplots")
        print("- Use save_annotations() to export results")
        
        if constrained_gait_view:
            # Create specialized constrained gait view
            fig = create_constrained_gait_plot(self.synchronized_data, 
                                             time_window=time_range[1] if time_range else 20.0)
        else:
            # Create standard multi-modal view
            fig = self.visualizer.create_annotation_plot(
                self.synchronized_data,
                self.emg_envelopes,
                time_range
            )
        
        plt.show()
        return fig
    
    def quick_annotation_workflow(self, trial_id: str, 
                                 time_window: float = 20.0,
                                 export_immediately: bool = True) -> Dict:
        """
        Complete annotation workflow in one function.
        
        Args:
            trial_id: Trial to annotate
            time_window: Time window for annotation (seconds)
            export_immediately: Whether to export results immediately
            
        Returns:
            Dictionary with annotation results
        """
        # Load trial
        self.load_trial(trial_id)
        
        # Create annotation interface
        time_range = (0, time_window)
        fig = self.create_annotation_interface(time_range, constrained_gait_view=True)
        
        # Wait for user annotation (manual step)
        input("\\nPress Enter when you've finished annotating events...")
        
        # Get results
        events_df = self.visualizer.get_annotated_events()
        
        if export_immediately and len(events_df) > 0:
            results = self.save_annotations()
            print(f"\\nAnnotation complete! {len(events_df)} events saved.")
            return results
        else:
            print(f"\\nAnnotation complete! {len(events_df)} events ready for export.")
            return {'events': events_df.to_dict('records'), 'trial_id': trial_id}
    
    def save_annotations(self, filename: Optional[str] = None) -> Dict:
        """
        Save annotated events to JSON file.
        
        Args:
            filename: Custom filename (if None, auto-generate)
            
        Returns:
            Dictionary with saved annotation data
        """
        if filename is None:
            filename = f"{self.trial_id}_ground_truth_events.json"
        
        filepath = self.output_dir / filename
        
        # Get annotated events
        events_df = self.visualizer.get_annotated_events()
        
        # Create export data
        export_data = {
            'trial_info': {
                'trial_id': self.trial_id,
                'annotation_date': pd.Timestamp.now().isoformat(),
                'total_events': len(events_df),
                'duration_seconds': self.synchronized_data['kinetics']['time'].max(),
                'sampling_rate_hz': 1000
            },
            'methodology': {
                'annotation_method': 'manual_expert_annotation',
                'data_modalities': list(self.synchronized_data.keys()),
                'constraint_type': 'left_leg_locked_extension',
                'annotator': 'biomechanics_expert'
            },
            'events': events_df.to_dict('records') if len(events_df) > 0 else []
        }
        
        # Save to file
        with open(filepath, 'w') as f:
            json.dump(export_data, f, indent=2, default=str)
        
        print(f"Annotations saved to {filepath}")
        return export_data
    
    def validate_annotations(self) -> Dict:
        """
        Validate annotated events for completeness and consistency.
        
        Returns:
            Dictionary with validation results
        """
        events_df = self.visualizer.get_annotated_events()
        
        if len(events_df) == 0:
            return {'status': 'no_events', 'message': 'No events annotated'}
        
        # Analyze event distribution
        event_counts = events_df['type'].value_counts()
        
        # Check for balance
        expected_events = ['left_heel_strike', 'left_toe_off', 'right_heel_strike', 'right_toe_off']
        
        validation = {
            'total_events': len(events_df),
            'event_distribution': event_counts.to_dict(),
            'time_range': {
                'start': events_df['time'].min(),
                'end': events_df['time'].max(),
                'span': events_df['time'].max() - events_df['time'].min()
            },
            'missing_event_types': [et for et in expected_events if et not in event_counts.index],
            'status': 'valid' if all(et in event_counts.index for et in expected_events) else 'incomplete'
        }
        
        return validation
    
    def get_annotation_summary(self) -> str:
        """Get formatted summary of current annotations."""
        events_df = self.visualizer.get_annotated_events()
        validation = self.validate_annotations()
        
        summary = f"""
Annotation Summary for Trial {self.trial_id}
={'='*50}
Total Events: {validation['total_events']}
Time Range: {validation['time_range']['start']:.2f} - {validation['time_range']['end']:.2f} seconds
Duration: {validation['time_range']['span']:.2f} seconds

Event Distribution:
{chr(10).join([f"  {event_type}: {count}" for event_type, count in validation['event_distribution'].items()])}

Status: {validation['status'].upper()}
{f"Missing: {', '.join(validation['missing_event_types'])}" if validation['missing_event_types'] else "Complete"}
"""
        return summary

def create_demo_annotation_session(trial_id: str = "T5", 
                                 data_dir: str = "data", 
                                 output_dir: str = "output") -> GaitEventAnnotator:
    """
    Create a ready-to-use annotation session for demo purposes.
    
    Args:
        trial_id: Trial to annotate (default "T5")
        data_dir: Data directory path
        output_dir: Output directory path
        
    Returns:
        Configured GaitEventAnnotator instance
    """
    print("Setting up Ground Truth Annotation Session")
    print("="*50)
    
    annotator = GaitEventAnnotator(data_dir, output_dir)
    
    print(f"Ready to annotate trial {trial_id}")
    print("Next steps:")
    print("1. annotator.load_trial('T5')")
    print("2. annotator.create_annotation_interface()")
    print("3. annotator.save_annotations()")
    
    return annotator