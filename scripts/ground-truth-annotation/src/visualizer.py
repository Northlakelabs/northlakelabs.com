"""
Visualization utilities for multi-modal gait data annotation.
Creates interactive plots for manual gait event annotation.
"""

import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional
import seaborn as sns

# Set style for clean plots
plt.style.use('default')
sns.set_palette("husl")

class GaitDataVisualizer:
    """Create interactive visualizations for gait event annotation."""
    
    def __init__(self, figsize=(15, 10)):
        """Initialize visualizer with figure settings."""
        self.figsize = figsize
        self.events = []  # Store annotated events
        
    def create_annotation_plot(self, synchronized_data: Dict[str, pd.DataFrame],
                              emg_envelopes: pd.DataFrame = None,
                              time_range: Tuple[float, float] = None) -> plt.Figure:
        """
        Create multi-panel plot for gait event annotation.
        
        Args:
            synchronized_data: Dict with 'kinetics', 'emg', 'kinematics' DataFrames
            emg_envelopes: EMG envelope data (optional)
            time_range: (start_time, end_time) for display range
            
        Returns:
            matplotlib Figure object
        """
        fig, axes = plt.subplots(4, 1, figsize=self.figsize, sharex=True)
        fig.suptitle('Multi-Modal Gait Analysis - Click to Annotate Events', fontsize=16)
        
        # Extract data
        kinetics = synchronized_data['kinetics']
        kinematics = synchronized_data['kinematics']
        emg = synchronized_data.get('emg', None)
        
        # Apply time range filter if specified
        if time_range:
            start_time, end_time = time_range
            mask = (kinetics['time'] >= start_time) & (kinetics['time'] <= end_time)
            kinetics = kinetics[mask]
            kinematics = kinematics[mask]
            if emg is not None:
                emg = emg[mask]
            if emg_envelopes is not None:
                emg_envelopes = emg_envelopes[mask]
        
        # Plot 1: Force Plates
        self._plot_force_plates(axes[0], kinetics)
        
        # Plot 2: Key Kinematic Markers (Vertical positions)
        self._plot_kinematic_markers(axes[1], kinematics)
        
        # Plot 3: EMG Envelopes
        if emg_envelopes is not None:
            self._plot_emg_envelopes(axes[2], emg_envelopes)
        else:
            axes[2].text(0.5, 0.5, 'EMG data not available', 
                        transform=axes[2].transAxes, ha='center', va='center')
            axes[2].set_ylabel('EMG')
        
        # Plot 4: Combined Overview
        self._plot_overview(axes[3], kinetics, kinematics)
        
        # Configure shared x-axis
        axes[-1].set_xlabel('Time (seconds)')
        
        # Add click event handler for annotation
        self._setup_click_annotation(fig, axes)
        
        plt.tight_layout()
        return fig
    
    def _plot_force_plates(self, ax, kinetics_data):
        """Plot force plate vertical forces."""
        time = kinetics_data['time']
        
        # Plot both force plates if available (using correct column names)
        if 'Fz_L' in kinetics_data.columns:
            ax.plot(time, kinetics_data['Fz_L'], label='Left Force Plate (Fz_L)', 
                   color='blue', alpha=0.7)
        
        if 'Fz_R' in kinetics_data.columns:
            ax.plot(time, kinetics_data['Fz_R'], label='Right Force Plate (Fz_R)', 
                   color='red', alpha=0.7)
        
        ax.set_ylabel('Vertical Force (N)')
        ax.set_title('Force Plates')
        ax.legend()
        ax.grid(True, alpha=0.3)
        
        # Add zero line
        ax.axhline(y=0, color='black', linestyle='-', alpha=0.3)
    
    def _plot_kinematic_markers(self, ax, kinematics_data):
        """Plot key kinematic markers for gait events."""
        time = kinematics_data['time']
        
        # Get available numeric columns (excluding time, Frame, Sub Frame)
        numeric_cols = [col for col in kinematics_data.columns 
                       if col not in ['time', 'Frame', 'Sub Frame'] 
                       and pd.api.types.is_numeric_dtype(kinematics_data[col])]
        
        # Plot first few kinematic signals (assuming they are vertical positions)
        colors = plt.cm.tab10(np.linspace(0, 1, min(4, len(numeric_cols))))
        
        for i, col in enumerate(numeric_cols[:4]):  # Plot first 4 channels
            ax.plot(time, kinematics_data[col], 
                   label=f'Kinematic {i+1}', color=colors[i], alpha=0.7)
        
        ax.set_ylabel('Position/Angle (units vary)')
        ax.set_title('Kinematic Markers')
        if len(numeric_cols) > 0:
            ax.legend()
        else:
            ax.text(0.5, 0.5, 'No kinematic data available', 
                   transform=ax.transAxes, ha='center', va='center')
        ax.grid(True, alpha=0.3)
    
    def _plot_emg_envelopes(self, ax, emg_envelopes):
        """Plot EMG signal envelopes."""
        time = emg_envelopes['time']
        
        # Plot key EMG channels (first 4 envelopes)
        envelope_cols = [col for col in emg_envelopes.columns if 'envelope' in col]
        
        colors = plt.cm.tab10(np.linspace(0, 1, len(envelope_cols)))
        
        for i, col in enumerate(envelope_cols[:4]):  # Limit to 4 channels for clarity
            ax.plot(time, emg_envelopes[col], 
                   label=col.replace('_envelope', ''), 
                   color=colors[i], alpha=0.7)
        
        ax.set_ylabel('EMG Amplitude (V)')
        ax.set_title('EMG Envelopes')
        ax.legend()
        ax.grid(True, alpha=0.3)
    
    def _plot_overview(self, ax, kinetics_data, kinematics_data):
        """Plot combined overview for context."""
        time = kinetics_data['time']
        
        # Normalize and plot force plates (using correct column names)
        if 'Fz_L' in kinetics_data.columns:
            fz_max = kinetics_data['Fz_L'].abs().max()
            if fz_max > 0:
                fz_norm = kinetics_data['Fz_L'] / fz_max
                ax.plot(time, fz_norm, label='Left Force (norm)', 
                       color='blue', alpha=0.6, linewidth=1)
        
        if 'Fz_R' in kinetics_data.columns:
            fz_max = kinetics_data['Fz_R'].abs().max()
            if fz_max > 0:
                fz_norm = kinetics_data['Fz_R'] / fz_max
                ax.plot(time, fz_norm, label='Right Force (norm)', 
                       color='red', alpha=0.6, linewidth=1)
        
        ax.set_ylabel('Normalized Signals')
        ax.set_title('Overview')
        ax.legend()
        ax.grid(True, alpha=0.3)
        ax.axhline(y=0, color='black', linestyle='-', alpha=0.3)
    
    def _setup_click_annotation(self, fig, axes):
        """Setup interactive click annotation."""
        def on_click(event):
            if event.inaxes is not None and event.dblclick:
                # Get click position
                click_time = event.xdata
                
                if click_time is not None:
                    # Prompt for event type
                    event_type = self._get_event_type_input()
                    
                    if event_type:
                        # Add event marker
                        self._add_event_marker(axes, click_time, event_type)
                        
                        # Store event
                        self.events.append({
                            'time': click_time,
                            'type': event_type,
                            'timestamp': pd.Timestamp.now()
                        })
                        
                        # Refresh display
                        fig.canvas.draw()
                        
                        print(f"Added {event_type} at {click_time:.3f}s")
        
        fig.canvas.mpl_connect('button_press_event', on_click)
    
    def _get_event_type_input(self) -> Optional[str]:
        """Get event type from user input."""
        print("\\nEvent types:")
        print("1: Left Heel Strike")
        print("2: Left Toe Off") 
        print("3: Right Heel Strike")
        print("4: Right Toe Off")
        print("0: Cancel")
        
        try:
            choice = input("Select event type (1-4, 0 to cancel): ").strip()
            
            event_map = {
                '1': 'left_heel_strike',
                '2': 'left_toe_off',
                '3': 'right_heel_strike', 
                '4': 'right_toe_off'
            }
            
            return event_map.get(choice)
            
        except (EOFError, KeyboardInterrupt):
            return None
    
    def _add_event_marker(self, axes, time_point, event_type):
        """Add visual event marker to all subplots."""
        # Color mapping for event types
        colors = {
            'left_heel_strike': 'blue',
            'left_toe_off': 'lightblue',
            'right_heel_strike': 'red',
            'right_toe_off': 'lightcoral'
        }
        
        color = colors.get(event_type, 'black')
        
        # Add vertical line to each subplot
        for ax in axes:
            ax.axvline(x=time_point, color=color, linestyle='--', 
                      alpha=0.8, linewidth=2, label=event_type)
    
    def export_events(self, filepath: str = "output/ground_truth_events.json"):
        """Export annotated events to JSON file."""
        import json
        
        # Convert to serializable format
        events_data = {
            'trial_info': {
                'annotation_date': pd.Timestamp.now().isoformat(),
                'total_events': len(self.events)
            },
            'events': self.events
        }
        
        with open(filepath, 'w') as f:
            json.dump(events_data, f, indent=2, default=str)
        
        print(f"Exported {len(self.events)} events to {filepath}")
    
    def get_annotated_events(self) -> pd.DataFrame:
        """Get annotated events as DataFrame."""
        return pd.DataFrame(self.events)

def create_constrained_gait_plot(synchronized_data: Dict[str, pd.DataFrame],
                                time_window: float = 20.0) -> plt.Figure:
    """
    Create multi-modal plot for gait event annotation.
    Shows force plates, key kinematic markers (heel/toe), and EMG activity.
    
    Args:
        synchronized_data: Synchronized multi-modal data
        time_window: Time window to display (seconds)
        
    Returns:
        matplotlib Figure with 3 subplots for annotation
    """
    fig, axes = plt.subplots(3, 1, figsize=(15, 10))
    fig.suptitle('Multi-Modal Gait Event Annotation - Force, Key Markers & EMG', fontsize=16)
    
    kinetics = synchronized_data['kinetics']
    kinematics = synchronized_data['kinematics']
    
    # Filter to time window
    mask = kinetics['time'] <= time_window
    kinetics = kinetics[mask]
    kinematics = kinematics[mask]
    
    time = kinetics['time']
    
    # Plot 1: Force asymmetry
    if 'Fz_L' in kinetics.columns and 'Fz_R' in kinetics.columns:
        axes[0].plot(time, kinetics['Fz_L'], label='Left Force Plate', color='blue', linewidth=2)
        axes[0].plot(time, kinetics['Fz_R'], label='Right Force Plate', color='red', linewidth=2)
        axes[0].fill_between(time, kinetics['Fz_L'], alpha=0.3, color='blue')
        axes[0].fill_between(time, kinetics['Fz_R'], alpha=0.3, color='red')
        axes[0].set_ylabel('Vertical Force (N)')
        axes[0].set_title('Force Asymmetry Pattern')
        axes[0].legend()
        axes[0].grid(True, alpha=0.3)
    
    # Plot 2: Key kinematic markers (heel and toe vertical positions)
    # Look for specific heel and toe markers that are critical for gait events
    key_markers = {
        'right_toe_z': {'label': 'Right Toe', 'color': 'red', 'style': '-'},
        'right_heel_z': {'label': 'Right Heel', 'color': 'darkred', 'style': '--'},
        'left_toe_z': {'label': 'Left Toe', 'color': 'blue', 'style': '-'},
        'left_heel_z': {'label': 'Left Heel', 'color': 'darkblue', 'style': '--'}
    }
    
    markers_found = 0
    for marker_col, style_info in key_markers.items():
        if marker_col in kinematics.columns:
            axes[1].plot(time, kinematics[marker_col], 
                        label=style_info['label'],
                        color=style_info['color'],
                        linestyle=style_info['style'],
                        linewidth=2,
                        alpha=0.8)
            markers_found += 1
    
    if markers_found > 0:
        axes[1].set_ylabel('Vertical Position (mm)')
        axes[1].set_title('Key Gait Markers - Heel & Toe Vertical Positions')
        axes[1].legend()
        axes[1].grid(True, alpha=0.3)
        
        # Add annotation help
        axes[1].text(0.02, 0.98, 
                    'Look for: Heel minima = heel strike, Toe minima = toe off',
                    transform=axes[1].transAxes, fontsize=9, 
                    verticalalignment='top', alpha=0.7,
                    bbox=dict(boxstyle="round,pad=0.3", facecolor="wheat", alpha=0.7))
    else:
        # Fallback: show any available Z markers 
        z_markers = [col for col in kinematics.columns if col.endswith('_Z')]
        if len(z_markers) > 0:
            colors = ['blue', 'red', 'green', 'orange']
            for i, marker in enumerate(z_markers[:4]):
                color = colors[i % len(colors)]
                label = marker.replace('_Z', ' (vertical)')
                axes[1].plot(time, kinematics[marker], label=label, 
                            color=color, alpha=0.8, linewidth=1.5)
        
        axes[1].set_ylabel('Vertical Position (mm)')
        axes[1].set_title('Kinematic Markers - Vertical Positions')
        axes[1].legend()
        axes[1].grid(True, alpha=0.3)
    
    # Plot 3: EMG Activity Overview (more useful than asymmetry for gait events)
    if 'emg' in synchronized_data and len(synchronized_data['emg'].columns) > 3:
        emg_data = synchronized_data['emg']
        emg_mask = emg_data['time'] <= time_window
        emg_filtered = emg_data[emg_mask]
        emg_time = emg_filtered['time']
        
        # Get EMG columns (exclude time, Frame, Sub Frame)
        emg_cols = [col for col in emg_filtered.columns 
                   if col not in ['time', 'Frame', 'Sub Frame'] 
                   and pd.api.types.is_numeric_dtype(emg_filtered[col])]
        
        if len(emg_cols) >= 2:
            # Plot first 4 EMG channels with simple envelope
            emg_colors = ['blue', 'red', 'green', 'orange']
            for i, col in enumerate(emg_cols[:4]):
                # Simple envelope: moving RMS over 100 samples
                envelope = emg_filtered[col].rolling(window=100, center=True).apply(
                    lambda x: np.sqrt(np.mean(x**2)), raw=True
                )
                color = emg_colors[i % len(emg_colors)]
                axes[2].plot(emg_time, envelope, label=col, 
                           color=color, alpha=0.8, linewidth=1.5)
            
            axes[2].set_ylabel('EMG Amplitude (V)')
            axes[2].set_xlabel('Time (seconds)')
            axes[2].set_title('EMG Activity Overview')
            axes[2].legend()
            axes[2].grid(True, alpha=0.3)
        else:
            axes[2].text(0.5, 0.5, 'EMG data processing...', 
                        transform=axes[2].transAxes, ha='center', va='center')
            axes[2].set_ylabel('EMG')
            axes[2].set_xlabel('Time (seconds)')
            axes[2].set_title('EMG Activity')
            axes[2].grid(True, alpha=0.3)
    else:
        axes[2].text(0.5, 0.5, 'EMG data not available', 
                    transform=axes[2].transAxes, ha='center', va='center')
        axes[2].set_ylabel('EMG')
        axes[2].set_xlabel('Time (seconds)')
        axes[2].set_title('EMG Activity')
        axes[2].grid(True, alpha=0.3)
    
    plt.tight_layout()
    return fig