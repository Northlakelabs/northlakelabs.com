/**
 * Real-time force plate chart with Chart.js
 * Shows left/right force data with detected event markers
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import type { ChartData, ChartOptions } from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { ForceData } from '../hooks/useDataLoader';
import type { DetectedEvent } from '../algorithms/utils';
import { PlaybackControls } from './PlaybackControls';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface ForceChartProps {
  forceData: ForceData;
  detectedEvents: DetectedEvent[];
  currentTime: number;
  className?: string;
}

export function ForceChart({ forceData, detectedEvents, currentTime, className = '' }: ForceChartProps) {
  const chartRef = useRef<ChartJS<'line'>>(null);
  const [windowSize, setWindowSize] = useState(6); // Dynamic window size
  const [visibleWindow, setVisibleWindow] = useState({ start: 0, end: 6 });
  const [chartHeight, setChartHeight] = useState(400); // Dynamic chart height

  // Debug events on every render
  console.log('🎯 ForceChart render - events count:', detectedEvents.length);
  console.log('🎯 ForceChart render - events sample:', detectedEvents.slice(0, 3));

  // Responsive sizing based on screen width
  useEffect(() => {
    const updateResponsiveSizes = () => {
      if (typeof window !== 'undefined') {
        if (window.innerWidth >= 1024) {
          setWindowSize(6); // Desktop: 6 seconds
          setChartHeight(400); // Desktop: 400px
        } else if (window.innerWidth >= 768) {
          setWindowSize(4); // Tablet: 4 seconds
          setChartHeight(350); // Tablet: 350px
        } else {
          setWindowSize(3); // Mobile: 3 seconds
          setChartHeight(280); // Mobile: 280px (smaller for space)
        }
      }
    };

    updateResponsiveSizes();
    window.addEventListener('resize', updateResponsiveSizes);
    return () => window.removeEventListener('resize', updateResponsiveSizes);
  }, []);

  // Debug: Log when events change
  useEffect(() => {
    console.log('🎯 ForceChart received events:', detectedEvents.length);
    if (detectedEvents.length > 0) {
      console.log('🎯 Event range:', detectedEvents[0]?.time?.toFixed(1) + 's to ' + detectedEvents[detectedEvents.length - 1]?.time?.toFixed(1) + 's');
    }
  }, [detectedEvents]);

  // Update visible window based on current time and responsive window size
  useEffect(() => {
    const start = Math.max(0, currentTime - windowSize / 2);
    const end = Math.min(forceData.duration, start + windowSize);
    setVisibleWindow({ start, end });
  }, [currentTime, forceData.duration, windowSize]);

  // Prepare chart data - LOAD ALL DATA, no slicing
  const chartData: ChartData<'line'> = {
    labels: forceData.timestamps, // Full dataset
    datasets: [
      {
        label: 'Left Force Plate',
        data: forceData.leftForce, // Full dataset
        borderColor: 'rgb(59, 130, 246)', // blue-500
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
        tension: 0.1
      },
      {
        label: 'Right Force Plate',
        data: forceData.rightForce, // Full dataset
        borderColor: 'rgb(239, 68, 68)', // red-500
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
        tension: 0.1
      }
    ]
  };

  // Chart options optimized for performance - USE AXIS LIMITS FOR VIEWPORT
  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false, // Disable for performance
    interaction: {
      intersect: false,
      mode: 'index'
    },
    scales: {
      x: {
        type: 'linear',
        min: visibleWindow.start, // Control viewport with axis limits
        max: visibleWindow.end,   // Instead of data slicing
        title: {
          display: true,
          text: 'Time (seconds)',
          color: 'rgb(156, 163, 175)' // gray-400
        },
        grid: {
          color: 'rgba(156, 163, 175, 0.1)'
        },
        ticks: {
          color: 'rgb(156, 163, 175)',
          maxTicksLimit: 8
        }
      },
      y: {
        title: {
          display: true,
          text: 'Vertical Force (N)',
          color: 'rgb(156, 163, 175)'
        },
        grid: {
          color: 'rgba(156, 163, 175, 0.1)'
        },
        ticks: {
          color: 'rgb(156, 163, 175)'
        }
      }
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: 'rgb(156, 163, 175)',
          usePointStyle: true,
          pointStyle: 'line'
        }
      },
      tooltip: {
        enabled: false // Disable for performance
      }
    },
    elements: {
      point: {
        radius: 0 // Hide points for performance
      }
    }
  };

  // Add current time indicator
  const currentTimePlugin = {
    id: 'currentTime',
    afterDraw: (chart: ChartJS) => {
      if (currentTime >= visibleWindow.start && currentTime <= visibleWindow.end) {
        const ctx = chart.ctx;
        const xScale = chart.scales.x;
        const yScale = chart.scales.y;
        
        const x = xScale.getPixelForValue(currentTime);
        
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(x, yScale.top);
        ctx.lineTo(x, yScale.bottom);
        ctx.stroke();
        ctx.restore();
      }
    }
  };

  // Add event markers - RECREATE PLUGIN on every render to ensure updates
  const eventMarkersPlugin = {
    id: 'eventMarkers',
    afterDraw: (chart: ChartJS) => {
      const ctx = chart.ctx;
      const xScale = chart.scales.x;
      const yScale = chart.scales.y;
      
      // Debug: Plugin execution
      console.log('🔧 Plugin executing - events:', detectedEvents.length, 'axis range:', xScale.min?.toFixed(1) + '-' + xScale.max?.toFixed(1));
      
      // Debug: Count event types
      const heelStrikes = detectedEvents.filter(e => e.type === 'heel_strike');
      const toeOffs = detectedEvents.filter(e => e.type === 'toe_off');
      console.log('🔧 Event breakdown - heel strikes:', heelStrikes.length, 'toe offs:', toeOffs.length);
      
      // NO FILTERING - Chart.js will only render events in visible axis range
      detectedEvents.forEach((event, index) => {
        const x = xScale.getPixelForValue(event.time);
        
        // Debug first few events
        if (index < 5) {
          console.log(`🔧 Event ${index}: type=${event.type}, time=${event.time.toFixed(2)}, x=${x.toFixed(1)}`);
        }
        
        // Skip if event is outside canvas (Chart.js optimization)
        if (x < xScale.left || x > xScale.right) return;
        
        // Color based on event type
        const color = event.type === 'heel_strike' 
          ? 'rgba(34, 197, 94, 0.8)'  // green-500 for heel strikes
          : 'rgba(239, 68, 68, 0.8)'; // red-500 for toe offs
        
        // Opacity based on threshold deviation
        const alpha = Math.max(0.3, event.threshold_deviation);
        
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.moveTo(x, yScale.top);
        ctx.lineTo(x, yScale.bottom);
        ctx.stroke();
        
        // Add event label
        ctx.fillStyle = color;
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        const label = event.type === 'heel_strike' ? 'HS' : 'TO';
        const labelY = event.leg === 'left' ? yScale.top + 15 : yScale.top + 30;
        ctx.fillText(`${label}-${event.leg[0].toUpperCase()}`, x, labelY);
        
        ctx.restore();
      });
    }
  };

  // Register plugins - note: plugins are passed directly to Line component
  // No need to register/unregister globally

  return (
    <div className={`bg-white/5 rounded-xl border border-white/10 p-4 space-y-4 ${className}`}>
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">
          Force Plate Data - Traditional Detection
        </h3>
        <div className="flex flex-wrap gap-4 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-blue-500"></div>
            <span>Left Force Plate</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-red-500"></div>
            <span>Right Force Plate</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-green-500"></div>
            <span>Heel Strikes (HS)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-red-500"></div>
            <span>Toe Offs (TO)</span>
          </div>
        </div>
      </div>
      
      <div style={{ height: `${chartHeight}px` }}>
        <Line 
          ref={chartRef}
          data={chartData} 
          options={chartOptions}
          plugins={[currentTimePlugin, eventMarkersPlugin]}
        />
      </div>
      
      {/* Window info */}
      <div className="text-xs text-gray-500 text-center">
        Viewing: {visibleWindow.start.toFixed(1)}s - {visibleWindow.end.toFixed(1)}s 
        (Window: {windowSize}s, Current: {currentTime.toFixed(3)}s)
      </div>

      {/* Integrated Playback Controls */}
      <div className="border-t border-white/10 pt-4">
        <PlaybackControls integrated={true} />
      </div>
    </div>
  );
}