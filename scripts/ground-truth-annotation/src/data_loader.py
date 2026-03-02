"""
Data loading utilities for multi-modal gait analysis data.
Handles CSV parsing for Kinetics, EMG, and Kinematics data.
"""

import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, Tuple, Optional
import warnings

class GaitDataLoader:
    """Load and parse multi-modal gait analysis CSV files."""
    
    def __init__(self, data_dir: str = "data"):
        """Initialize with data directory path."""
        self.data_dir = Path(data_dir)
        
    def load_kinetics(self, trial_id: str) -> pd.DataFrame:
        """
        Load kinetics (force plate) data for specified trial.
        
        Args:
            trial_id: Trial identifier (e.g., "T5")
            
        Returns:
            DataFrame with columns: Frame, Sub Frame, force plate data
        """
        filepath = self.data_dir / "kinetics" / f"Sub1_Kinetics_{trial_id}.csv"
        
        # Read CSV with proper header handling
        # Line 3 has column names, line 4 has units, data starts at line 5
        df = pd.read_csv(filepath, skiprows=4, header=0)
        
        # Create unique column names for dual force plates
        # Left plate: Frame, Sub Frame, Fx_L, Fy_L, Fz_L, Mx_L, My_L, Mz_L, Cx_L, Cy_L, Cz_L
        # Right plate: Fx_R, Fy_R, Fz_R, Mx_R, My_R, Mz_R, Cx_R, Cy_R, Cz_R
        unique_names = ['Frame', 'Sub Frame']
        force_components = ['Fx', 'Fy', 'Fz', 'Mx', 'My', 'Mz', 'Cx', 'Cy', 'Cz']
        
        # Left force plate columns
        for comp in force_components:
            unique_names.append(f'{comp}_L')
        
        # Right force plate columns  
        for comp in force_components:
            unique_names.append(f'{comp}_R')
        
        # Set proper column names
        df.columns = unique_names[:len(df.columns)]
        
        # Convert to time in seconds (1000 Hz sampling)
        # Use sample index instead of Frame column
        df['time'] = df.index / 1000.0
        
        return df
    
    def load_emg(self, trial_id: str) -> pd.DataFrame:
        """
        Load EMG data for specified trial.
        
        Args:
            trial_id: Trial identifier (e.g., "T5")
            
        Returns:
            DataFrame with EMG channels
        """
        filepath = self.data_dir / "emg" / f"Sub1_EMG_{trial_id}.csv"
        
        # Read CSV with proper header handling
        # Line 3 has column names, line 4 has units, data starts at line 5
        df = pd.read_csv(filepath, skiprows=4, header=0)
        
        # Use the header row (line 3) for column names
        with open(filepath, 'r') as f:
            lines = f.readlines()
            header_line = lines[3].strip()
            column_names = [col.strip() for col in header_line.split(',')]
        
        # Set proper column names
        df.columns = column_names[:len(df.columns)]
        
        # Convert to time in seconds (2000 Hz sampling)
        # Use sample index instead of Frame column  
        df['time'] = df.index / 2000.0
        
        return df
    
    def load_kinematics(self, trial_id: str) -> pd.DataFrame:
        """
        Load kinematics (motion capture) data for specified trial.
        
        Args:
            trial_id: Trial identifier (e.g., "T5")
            
        Returns:
            DataFrame with marker positions using semantic marker names
        """
        filepath = self.data_dir / "kinematics" / f"Sub1_Kinematics_{trial_id}.csv"
        
        # Read marker names from header row 3 (0-indexed line 2)
        with open(filepath, 'r') as f:
            lines = f.readlines()
            marker_header = lines[2].strip()  # Row 3 contains marker names
            marker_names = [name.strip() for name in marker_header.split(',')]
        
        # Read CSV with proper header handling
        # Line 3 has marker names, line 4 has X,Y,Z, line 5 has units, data starts at line 6
        df = pd.read_csv(filepath, skiprows=4, header=0)
        
        # Create semantic column names using actual marker names
        unique_names = ['Frame', 'Sub Frame']
        
        # Process marker names (skip first 2 empty entries for Frame, Sub Frame)
        marker_names_clean = marker_names[2:]  # Skip Frame, Sub Frame entries
        
        # Create column names with marker semantics
        coord_idx = 0
        for marker_name in marker_names_clean:
            if marker_name and marker_name.strip():  # Skip empty entries
                # Clean marker name (remove S12: prefix for readability)
                clean_name = marker_name.replace('S12:', '').strip()
                if clean_name:
                    unique_names.extend([
                        f'{clean_name}_X',
                        f'{clean_name}_Y',
                        f'{clean_name}_Z'
                    ])
                else:
                    # Fallback for empty or malformed names
                    unique_names.extend([
                        f'Marker{coord_idx//3+1:02d}_X',
                        f'Marker{coord_idx//3+1:02d}_Y',
                        f'Marker{coord_idx//3+1:02d}_Z'
                    ])
                coord_idx += 3
        
        # Handle any remaining columns
        while len(unique_names) < len(df.columns):
            unique_names.append(f'Extra_{len(unique_names)}')
        
        # Set proper column names (only use as many as we have)
        df.columns = unique_names[:len(df.columns)]
        
        # Convert to time in seconds (100 Hz sampling)
        # Use sample index instead of Frame column
        df['time'] = df.index / 100.0
        
        return df
    
    def load_kinematics_key_markers(self, trial_id: str) -> pd.DataFrame:
        """
        Load only key gait markers (heel and toe positions) for annotation.
        
        Args:
            trial_id: Trial identifier (e.g., "T5")
            
        Returns:
            DataFrame with only heel/toe marker positions for gait annotation
        """
        # Load full kinematics data with semantic names
        full_kinematics = self.load_kinematics(trial_id)
        
        # Define the 4 key markers for gait events
        key_markers = {
            'right_toe': ['RTOE_X', 'RTOE_Y', 'RTOE_Z'],
            'right_heel': ['RCAL_X', 'RCAL_Y', 'RCAL_Z'],
            'left_toe': ['LTOE_X', 'LTOE_Y', 'LTOE_Z'],
            'left_heel': ['LCAL_X', 'LCAL_Y', 'LCAL_Z']
        }
        
        # Extract only key markers
        key_data = pd.DataFrame()
        key_data['time'] = full_kinematics['time']
        
        for marker_label, marker_cols in key_markers.items():
            for coord_col in marker_cols:
                if coord_col in full_kinematics.columns:
                    # Use semantic names like 'right_toe_z' for clarity
                    coord_suffix = coord_col.split('_')[-1].lower()  # x, y, or z
                    new_col_name = f'{marker_label}_{coord_suffix}'
                    key_data[new_col_name] = full_kinematics[coord_col]
                else:
                    # Handle missing markers gracefully
                    coord_suffix = coord_col.split('_')[-1].lower()
                    new_col_name = f'{marker_label}_{coord_suffix}'
                    key_data[new_col_name] = np.nan
                    warnings.warn(f"Marker {coord_col} not found in kinematics data")
        
        return key_data
    
    def load_all_modalities(self, trial_id: str) -> Dict[str, pd.DataFrame]:
        """
        Load all data modalities for a trial.
        
        Args:
            trial_id: Trial identifier (e.g., "T5")
            
        Returns:
            Dictionary with keys: 'kinetics', 'emg', 'kinematics'
        """
        return {
            'kinetics': self.load_kinetics(trial_id),
            'emg': self.load_emg(trial_id),
            'kinematics': self.load_kinematics(trial_id)
        }
    
    def get_trial_duration(self, trial_id: str) -> float:
        """Get trial duration in seconds."""
        kinetics = self.load_kinetics(trial_id)
        return kinetics['time'].max()
    
    def get_sampling_rates(self) -> Dict[str, int]:
        """Get sampling rates for each modality."""
        return {
            'kinetics': 1000,  # Hz
            'emg': 2000,       # Hz
            'kinematics': 100  # Hz
        }

def extract_key_kinematic_markers(kinematics_df: pd.DataFrame) -> Dict[str, pd.DataFrame]:
    """
    Extract key markers for gait event detection.
    
    Args:
        kinematics_df: Full kinematics DataFrame
        
    Returns:
        Dictionary with key marker data (toe, heel positions)
    """
    markers = {}
    
    # Key markers for gait events
    marker_sets = {
        'right_toe': ['S12:RTOE'],
        'right_heel': ['S12:RCAL'], 
        'left_toe': ['S12:LTOE'],
        'left_heel': ['S12:LCAL']
    }
    
    for marker_name, columns in marker_sets.items():
        marker_data = pd.DataFrame()
        marker_data['time'] = kinematics_df['time']
        
        # Extract X, Y, Z coordinates for each marker
        for col in columns:
            if f'{col}.1' in kinematics_df.columns:  # Z coordinate (vertical)
                marker_data['z'] = kinematics_df[f'{col}.1']
            elif f'{col}' in kinematics_df.columns:
                # Handle different column naming conventions
                marker_data['x'] = kinematics_df[f'{col}']
                if f'{col}.1' in kinematics_df.columns:
                    marker_data['y'] = kinematics_df[f'{col}.1']
                if f'{col}.2' in kinematics_df.columns:
                    marker_data['z'] = kinematics_df[f'{col}.2']
        
        markers[marker_name] = marker_data
    
    return markers

def extract_force_plate_signals(kinetics_df: pd.DataFrame) -> Dict[str, pd.Series]:
    """
    Extract key force plate signals for gait event detection.
    
    Args:
        kinetics_df: Kinetics DataFrame
        
    Returns:
        Dictionary with force signals for left/right plates
    """
    signals = {}
    
    # Extract vertical forces (Fz) for both plates
    # Force Plate #1 (left) and #2 (right) based on typical setup
    if 'Fz' in kinetics_df.columns:
        signals['left_fz'] = kinetics_df['Fz']
    if 'Fz.1' in kinetics_df.columns:
        signals['right_fz'] = kinetics_df['Fz.1']
    
    # Add time reference
    signals['time'] = kinetics_df['time']
    
    return signals