// Ground Truth Annotation Tool - JavaScript
// Reliable browser-based annotation using Chart.js with native click events

let trialData = null;
let annotations = [];
let charts = {};
let pendingEventTime = null;

// DOM elements
const loadTrialBtn = document.getElementById('loadTrialBtn');
const saveAnnotationsBtn = document.getElementById('saveAnnotationsBtn');
const clearAnnotationsBtn = document.getElementById('clearAnnotationsBtn');
const undoBtn = document.getElementById('undoBtn');
const status = document.getElementById('status');
const error = document.getElementById('error');
const charts_container = document.getElementById('charts');
const loading = document.getElementById('loading');
const eventModal = document.getElementById('eventModal');
const eventTime = document.getElementById('eventTime');

// Event listeners
loadTrialBtn.addEventListener('click', loadTrial);
saveAnnotationsBtn.addEventListener('click', saveAnnotations);
clearAnnotationsBtn.addEventListener('click', clearAnnotations);
undoBtn.addEventListener('click', undoLastAnnotation);

// Chart.js default configuration
Chart.defaults.color = '#e5e7eb';
Chart.defaults.backgroundColor = 'rgba(235, 91, 72, 0.1)';
Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';

function showStatus(message, isError = false) {
    if (isError) {
        error.textContent = message;
        error.style.display = 'block';
        status.style.display = 'none';
    } else {
        status.textContent = message;
        status.style.display = 'block';
        error.style.display = 'none';
    }
}

function hideMessages() {
    status.style.display = 'none';
    error.style.display = 'none';
}

async function loadTrial() {
    const trialId = 'T5';
    
    try {
        showStatus('Loading trial data...');
        loadTrialBtn.disabled = true;
        
        const response = await fetch(`/api/data/${trialId}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        trialData = await response.json();
        
        // Load existing annotations if they exist
        const annotationsResponse = await fetch(`/api/annotations/${trialId}`);
        if (annotationsResponse.ok) {
            const existingAnnotations = await annotationsResponse.json();
            if (existingAnnotations.exists) {
                annotations = existingAnnotations.events || [];
                showStatus(`✓ Trial loaded with ${annotations.length} existing annotations`);
            } else {
                annotations = [];
                showStatus('✓ Trial loaded - ready for annotation');
            }
        }
        
        createCharts();
        updateEventCounts();
        updateButtons();
        
        charts_container.style.display = 'block';
        loading.style.display = 'none';
        
    } catch (err) {
        console.error('Error loading trial:', err);
        showStatus(`Error loading trial: ${err.message}`, true);
        loadTrialBtn.disabled = false;
    }
}

function createCharts() {
    if (!trialData) return;
    
    // Destroy existing charts
    Object.values(charts).forEach(chart => chart.destroy());
    charts = {};
    
    // Create force plate chart
    createForceChart();
    createKinematicsChart();
    createEMGChart();
}

function createForceChart() {
    const ctx = document.getElementById('forceChart').getContext('2d');
    
    charts.force = new Chart(ctx, {
        type: 'line',
        data: {
            labels: trialData.timestamps,
            datasets: [
                {
                    label: 'Left Fz',
                    data: trialData.force_plates.left.fz,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.1
                },
                {
                    label: 'Right Fz',
                    data: trialData.force_plates.right.fz,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    position: 'top'
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Time (seconds)'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Force (N)'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            },
            onClick: (event, elements) => {
                handleChartClick(event, charts.force, 'force');
            }
        }
    });
    
    addAnnotationLines(charts.force);
}

function createKinematicsChart() {
    const ctx = document.getElementById('kinematicsChart').getContext('2d');
    
    charts.kinematics = new Chart(ctx, {
        type: 'line',
        data: {
            labels: trialData.timestamps,
            datasets: [
                {
                    label: 'Left Heel Z',
                    data: trialData.key_markers.left_heel_z,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    tension: 0.1
                },
                {
                    label: 'Left Toe Z',
                    data: trialData.key_markers.left_toe_z,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.1
                },
                {
                    label: 'Right Heel Z',
                    data: trialData.key_markers.right_heel_z,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    tension: 0.1
                },
                {
                    label: 'Right Toe Z',
                    data: trialData.key_markers.right_toe_z,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    position: 'top'
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Time (seconds)'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Height (mm)'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            },
            onClick: (event, elements) => {
                handleChartClick(event, charts.kinematics, 'kinematics');
            }
        }
    });
    
    addAnnotationLines(charts.kinematics);
}

function createEMGChart() {
    const ctx = document.getElementById('emgChart').getContext('2d');
    
    const datasets = Object.keys(trialData.emg_envelopes).slice(0, 4).map((channel, index) => ({
        label: `EMG ${index + 1}`,
        data: trialData.emg_envelopes[channel],
        borderColor: `hsl(${index * 90}, 70%, 60%)`,
        backgroundColor: `hsla(${index * 90}, 70%, 60%, 0.1)`,
        borderWidth: 1,
        pointRadius: 0,
        tension: 0.1
    }));
    
    charts.emg = new Chart(ctx, {
        type: 'line',
        data: {
            labels: trialData.timestamps,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    position: 'top'
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Time (seconds)'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'EMG Envelope (V)'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            },
            onClick: (event, elements) => {
                handleChartClick(event, charts.emg, 'emg');
            }
        }
    });
    
    addAnnotationLines(charts.emg);
}

function handleChartClick(event, chart, chartType) {
    // Get the click position relative to the chart
    const rect = chart.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    
    // Convert pixel position to data coordinates
    const canvasPosition = Chart.helpers.getRelativePosition(event, chart);
    const dataX = chart.scales.x.getValueForPixel(canvasPosition.x);
    
    if (dataX >= 0 && dataX <= trialData.time_window) {
        pendingEventTime = dataX;
        eventTime.textContent = dataX.toFixed(3);
        eventModal.style.display = 'block';
    }
}

function selectEvent(eventType) {
    if (pendingEventTime === null) return;
    
    // Add annotation
    const annotation = {
        time: pendingEventTime,
        type: eventType,
        annotation_method: 'web_interface_click',
        timestamp: new Date().toISOString()
    };
    
    annotations.push(annotation);
    
    // Update all charts with new annotation
    Object.values(charts).forEach(chart => {
        addAnnotationLines(chart);
    });
    
    updateEventCounts();
    updateButtons();
    
    // Close modal
    eventModal.style.display = 'none';
    pendingEventTime = null;
    
    showStatus(`✓ Added ${eventType.replace('_', ' ')} at ${pendingEventTime.toFixed(3)}s`);
}

function cancelEvent() {
    eventModal.style.display = 'none';
    pendingEventTime = null;
}

function addAnnotationLines(chart) {
    // Remove existing annotation lines
    chart.options.plugins = chart.options.plugins || {};
    chart.options.plugins.annotation = {
        annotations: {}
    };
    
    // Add vertical lines for each annotation
    annotations.forEach((annotation, index) => {
        const color = getEventColor(annotation.type);
        chart.options.plugins.annotation.annotations[`event_${index}`] = {
            type: 'line',
            mode: 'vertical',
            scaleID: 'x',
            value: annotation.time,
            borderColor: color,
            borderWidth: 2,
            borderDash: annotation.type.includes('heel') ? [] : [5, 5],
            label: {
                content: annotation.type.replace('_', ' '),
                enabled: true,
                position: 'top',
                backgroundColor: color,
                color: 'white',
                font: {
                    size: 10
                }
            }
        };
    });
    
    chart.update('none');
}

function getEventColor(eventType) {
    const colors = {
        'left_heel_strike': '#3b82f6',   // Blue
        'left_toe_off': '#06b6d4',       // Cyan
        'right_heel_strike': '#ef4444',  // Red
        'right_toe_off': '#f97316'       // Orange
    };
    return colors[eventType] || '#6b7280';
}

function updateEventCounts() {
    const counts = {
        left_heel_strike: 0,
        left_toe_off: 0,
        right_heel_strike: 0,
        right_toe_off: 0
    };
    
    annotations.forEach(annotation => {
        if (counts.hasOwnProperty(annotation.type)) {
            counts[annotation.type]++;
        }
    });
    
    document.getElementById('leftHeelCount').textContent = counts.left_heel_strike;
    document.getElementById('leftToeCount').textContent = counts.left_toe_off;
    document.getElementById('rightHeelCount').textContent = counts.right_heel_strike;
    document.getElementById('rightToeCount').textContent = counts.right_toe_off;
}

function updateButtons() {
    const hasData = trialData !== null;
    const hasAnnotations = annotations.length > 0;
    
    saveAnnotationsBtn.disabled = !hasData;
    clearAnnotationsBtn.disabled = !hasAnnotations;
    undoBtn.disabled = !hasAnnotations;
}

async function saveAnnotations() {
    if (!trialData || annotations.length === 0) {
        showStatus('No annotations to save', true);
        return;
    }
    
    try {
        showStatus('Saving annotations...');
        saveAnnotationsBtn.disabled = true;
        
        const payload = {
            events: annotations,
            time_window: trialData.time_window
        };
        
        const response = await fetch(`/api/annotations/${trialData.trial_id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        showStatus(`✓ Saved ${result.total_events} annotations to ${result.file_path}`);
        
    } catch (err) {
        console.error('Error saving annotations:', err);
        showStatus(`Error saving annotations: ${err.message}`, true);
    } finally {
        saveAnnotationsBtn.disabled = false;
    }
}

function clearAnnotations() {
    if (confirm('Are you sure you want to clear all annotations?')) {
        annotations = [];
        
        // Update all charts
        Object.values(charts).forEach(chart => {
            addAnnotationLines(chart);
        });
        
        updateEventCounts();
        updateButtons();
        
        showStatus('✓ All annotations cleared');
    }
}

function undoLastAnnotation() {
    if (annotations.length === 0) return;
    
    const removed = annotations.pop();
    
    // Update all charts
    Object.values(charts).forEach(chart => {
        addAnnotationLines(chart);
    });
    
    updateEventCounts();
    updateButtons();
    
    showStatus(`✓ Removed ${removed.type.replace('_', ' ')} at ${removed.time.toFixed(3)}s`);
}

// Initialize
hideMessages();
updateButtons();