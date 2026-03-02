"""
Multi-rate data synchronization utilities.
Aligns data from different modalities to a common timeline.
"""

import pandas as pd
import numpy as np
from typing import Dict, Tuple
from scipy import signal
from scipy.interpolate import interp1d

class MultiModalSynchronizer:
    """Synchronize multi-modal gait data to common timeline."""
    
    def __init__(self, target_rate: int = 1000):
        """
        Initialize synchronizer.
        
        Args:
            target_rate: Target sampling rate in Hz (default 1000 Hz)
        """
        self.target_rate = target_rate
    
    def create_master_timeline(self, duration: float) -> np.ndarray:
        """
        Create master timeline at target sampling rate.
        
        Args:
            duration: Duration in seconds
            
        Returns:
            Time array at target sampling rate
        """
        return np.linspace(0, duration, int(duration * self.target_rate))
    
    def resample_to_target_rate(self, data: pd.DataFrame, 
                               time_col: str = 'time',
                               target_times: np.ndarray = None) -> pd.DataFrame:
        """
        Resample data to target sampling rate.
        
        Args:
            data: DataFrame with time column
            time_col: Name of time column
            target_times: Target time points (if None, create from data duration)
            
        Returns:
            Resampled DataFrame
        """
        if target_times is None:
            duration = data[time_col].max()
            target_times = self.create_master_timeline(duration)
        
        # Create resampled DataFrame
        resampled = pd.DataFrame({'time': target_times})
        
        # Interpolate each numeric column
        for col in data.columns:
            if col != time_col and pd.api.types.is_numeric_dtype(data[col]):
                # Remove NaN values for interpolation
                valid_mask = ~data[col].isna()
                if valid_mask.sum() > 1:  # Need at least 2 points
                    interp_func = interp1d(
                        data[time_col][valid_mask], 
                        data[col][valid_mask],
                        kind='linear',
                        bounds_error=False,
                        fill_value='extrapolate'
                    )
                    resampled[col] = interp_func(target_times)
                else:
                    resampled[col] = np.nan
        
        return resampled
    
    def downsample_emg(self, emg_data: pd.DataFrame) -> pd.DataFrame:
        """
        Downsample EMG data from 2000 Hz to target rate.
        Applies anti-aliasing filter before downsampling.
        
        Args:
            emg_data: EMG DataFrame at 2000 Hz
            
        Returns:
            Downsampled EMG DataFrame
        """
        # Calculate downsampling factor
        original_rate = 2000
        downsample_factor = original_rate // self.target_rate
        
        if downsample_factor == 1:
            return emg_data
        
        # Apply anti-aliasing filter
        nyquist = original_rate / 2
        cutoff = self.target_rate / 2
        b, a = signal.butter(4, cutoff / nyquist, btype='low')
        
        # Create new downsampled DataFrame with correct length
        downsampled_data = {}
        
        # Downsample time vector first to get correct length
        downsampled_time = emg_data['time'][::downsample_factor]
        downsampled_data['time'] = downsampled_time
        
        # Filter and downsample each EMG channel
        for col in emg_data.columns:
            if col != 'time' and pd.api.types.is_numeric_dtype(emg_data[col]):
                # Apply filter
                filtered = signal.filtfilt(b, a, emg_data[col])
                # Downsample
                downsampled_data[col] = filtered[::downsample_factor]
        
        # Create new DataFrame with consistent length
        return pd.DataFrame(downsampled_data)
    
    def upsample_kinematics(self, kinematics_data: pd.DataFrame, 
                           target_times: np.ndarray) -> pd.DataFrame:
        """
        Upsample kinematics data from 100 Hz to target rate.
        Uses linear interpolation.
        
        Args:
            kinematics_data: Kinematics DataFrame at 100 Hz
            target_times: Target time points
            
        Returns:
            Upsampled kinematics DataFrame
        """
        return self.resample_to_target_rate(kinematics_data, 'time', target_times)
    
    def synchronize_all_modalities(self, data_dict: Dict[str, pd.DataFrame]) -> Dict[str, pd.DataFrame]:
        """
        Synchronize all data modalities to common timeline.
        
        Args:
            data_dict: Dictionary with 'kinetics', 'emg', 'kinematics' DataFrames
            
        Returns:
            Dictionary with synchronized DataFrames
        """
        # Determine common duration (shortest duration across modalities)
        durations = {
            modality: df['time'].max() for modality, df in data_dict.items()
        }
        common_duration = min(durations.values())
        
        # Create master timeline
        master_times = self.create_master_timeline(common_duration)
        
        synchronized = {}
        
        # Process each modality
        for modality, df in data_dict.items():
            # Trim to common duration
            trimmed = df[df['time'] <= common_duration].copy()
            
            if modality == 'kinetics':
                # Kinetics is already at 1000 Hz, just resample to exact times
                synchronized[modality] = self.resample_to_target_rate(trimmed, 'time', master_times)
            
            elif modality == 'emg':
                # Downsample EMG from 2000 Hz
                downsampled = self.downsample_emg(trimmed)
                synchronized[modality] = self.resample_to_target_rate(downsampled, 'time', master_times)
            
            elif modality == 'kinematics':
                # Upsample kinematics from 100 Hz
                synchronized[modality] = self.upsample_kinematics(trimmed, master_times)
            
            elif modality == 'key_markers':
                # Upsample key markers from 100 Hz (same as kinematics)
                synchronized[modality] = self.upsample_kinematics(trimmed, master_times)
        
        return synchronized

def compute_emg_envelopes(emg_data: pd.DataFrame, 
                         channels: list = None,
                         window_ms: float = 50.0,
                         sampling_rate: int = 1000) -> pd.DataFrame:
    """
    Compute EMG signal envelopes for visualization.
    
    Args:
        emg_data: EMG DataFrame
        channels: List of EMG channel columns (if None, auto-detect)
        window_ms: Smoothing window in milliseconds
        sampling_rate: Sampling rate in Hz
        
    Returns:
        DataFrame with EMG envelopes
    """
    if channels is None:
        # Auto-detect EMG channels (exclude time and non-numeric columns)
        channels = [col for col in emg_data.columns 
                   if col != 'time' and pd.api.types.is_numeric_dtype(emg_data[col])]
    
    envelopes = pd.DataFrame({'time': emg_data['time']})
    
    # Convert window to samples
    window_samples = int(window_ms * sampling_rate / 1000)
    
    for channel in channels:
        if channel in emg_data.columns:
            # Rectify signal
            rectified = np.abs(emg_data[channel])
            
            # Apply moving average filter
            envelope = signal.savgol_filter(rectified, window_samples, 3)
            
            envelopes[f'{channel}_envelope'] = envelope
    
    return envelopes