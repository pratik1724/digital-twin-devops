import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
  ReferenceLine
} from 'recharts';
import { Search, TrendingUp, Activity, Eye, EyeOff, Play, Pause, Download, Clock, Calendar, RefreshCw } from 'lucide-react';
import { getLiveValue, getAggregates } from '../../lib/sitewise';
import { inletMetrics, outletMetrics } from '../../config/dmr-map.js';
import { useNavigate } from 'react-router-dom';

// Color palette for metrics
const METRIC_COLORS = [
  '#00D9FF', '#FF6B35', '#FF0054', '#4ECDC4', '#FFD93D', '#A8DADC',
  '#F72585', '#7209B7', '#3A0CA3', '#06FFA5', '#FF9E00', '#00F5FF',
];

// Time range presets
const TIME_RANGES = [
  { label: 'Last 5 minutes', value: 5 * 60 * 1000 },
  { label: 'Last 15 minutes', value: 15 * 60 * 1000 },
  { label: 'Last 30 minutes', value: 30 * 60 * 1000 },
  { label: 'Last 1 hour', value: 60 * 60 * 1000 },
  { label: 'Last 3 hours', value: 3 * 60 * 60 * 1000 },
  { label: 'Last 5 hours', value: 5 * 60 * 60 * 1000 },
  { label: 'Last 12 hours', value: 12 * 60 * 60 * 1000 },
  { label: 'Last 24 hours', value: 24 * 60 * 60 * 1000 },
];

// Refresh intervals
const REFRESH_INTERVALS = [
  { label: '5 seconds', value: 5000 },
  { label: '15 seconds', value: 15000 },
  { label: '30 seconds', value: 30000 },
  { label: '1 minute', value: 60000 },
];

export function EnhancedMetricsDashboard() {
  const navigate = useNavigate();
  
  // State
  const [selectedMetrics, setSelectedMetrics] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [liveData, setLiveData] = useState({});
  const [historicalData, setHistoricalData] = useState({});
  const [timeSeriesData, setTimeSeriesData] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [showAverage, setShowAverage] = useState(false);
  
  // New state for enhanced features
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState(TIME_RANGES[3]); // Default: Last 1 hour
  const [refreshInterval, setRefreshInterval] = useState(REFRESH_INTERVALS[0].value);
  const [showTimeRangePicker, setShowTimeRangePicker] = useState(false);
  const [customStartTime, setCustomStartTime] = useState(null);
  const [customEndTime, setCustomEndTime] = useState(null);
  const [selectedTimestamp, setSelectedTimestamp] = useState(null);
  const [hoveredTimestamp, setHoveredTimestamp] = useState(null);
  const [detailsData, setDetailsData] = useState(null);
  const chartRef = useRef(null);

  // Simulation integration state
  const [selectedSimulationPoint, setSelectedSimulationPoint] = useState(null);
  const [simulationRunning, setSimulationRunning] = useState(false);
  const [simulationResults, setSimulationResults] = useState(null);
  const [simulationLogs, setSimulationLogs] = useState([]);
  const [showSimulationLogs, setShowSimulationLogs] = useState(false);
  
  // Modal state for data point details
  const [showDataPointModal, setShowDataPointModal] = useState(false);
  const [modalData, setModalData] = useState(null);

  // Back navigation and result tracking state
  const [dataPointResults, setDataPointResults] = useState(new Map()); // timestamp -> result count
  const [returnFromSimulation, setReturnFromSimulation] = useState(false);
  const [restoreDataPoint, setRestoreDataPoint] = useState(null);

  // Helper functions for simulation integration
  const isSimulationCompatibleMetric = (metricId) => {
    // Define metrics compatible with simulation (using button IDs)
    const simulationMetrics = {
      co2: ['co2_inlet_pv'], 
      ch4: ['ch4_inlet_pv'],  
      temperature: ['preheater1_pv', 'preheater2_pv', 'preheater3_pv', 'preheater4_pv'],
      pressure: ['pressure_reactor_pv']
    };
    
    return Object.values(simulationMetrics).flat().includes(metricId);
  };

  const getSimulationRequiredMetrics = () => {
    return {
      co2: selectedMetrics.find(id => id === 'co2_inlet_pv'),
      ch4: selectedMetrics.find(id => id === 'ch4_inlet_pv')
    };
  };

  const isSimulationReady = useMemo(() => {
    const required = getSimulationRequiredMetrics();
    const ready = !!(required.co2 && required.ch4);
    console.log('🎯 Simulation readiness computed:', {
      required,
      ready,
      selectedMetrics
    });
    return ready;
  }, [selectedMetrics]);

  // Combine all metrics
  const allMetrics = useMemo(() => {
    return [...inletMetrics, ...outletMetrics].map((metric, index) => ({
      ...metric,
      color: METRIC_COLORS[index % METRIC_COLORS.length],
      category: inletMetrics.includes(metric) ? 'Inlet' : 'Outlet'
    }));
  }, []);

  // Filter metrics based on search
  const filteredMetrics = useMemo(() => {
    if (!searchQuery.trim()) return allMetrics;
    const query = searchQuery.toLowerCase();
    return allMetrics.filter(metric => 
      metric.label.toLowerCase().includes(query) ||
      metric.category.toLowerCase().includes(query)
    );
  }, [allMetrics, searchQuery]);

  // Toggle metric selection
  const toggleMetric = (metricId) => {
    setSelectedMetrics(prev => {
      if (prev.includes(metricId)) {
        return prev.filter(id => id !== metricId);
      } else {
        return [...prev, metricId];
      }
    });
  };

  // Select all filtered metrics
  const selectAllFiltered = () => {
    const filteredIds = filteredMetrics.map(m => m.id);
    setSelectedMetrics(filteredIds);
  };

  // Clear all selections
  const clearAllSelections = () => {
    setSelectedMetrics([]);
  };

  // Handle time range change
  const handleTimeRangeChange = (range) => {
    console.log('⏰ Time range changed:', range.label);
    setSelectedTimeRange(range);
    setCustomStartTime(null);
    setCustomEndTime(null);
    setIsLiveMode(true);
    
    // Load historical data for the selected time range
    if (selectedMetrics.length > 0) {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - range.value);
      console.log(`📊 Loading historical data for range: ${startTime.toISOString()} to ${endTime.toISOString()}`);
      loadHistoricalDataForRange(startTime, endTime);
    }
  };

  // Handle custom time range
  const applyCustomTimeRange = () => {
    if (customStartTime && customEndTime) {
      setIsLiveMode(false);
      setShowTimeRangePicker(false);
      // Load data for custom range
      loadHistoricalDataForRange(new Date(customStartTime), new Date(customEndTime));
    }
  };

  // Reset to live mode
  const resetToLive = () => {
    setIsLiveMode(true);
    setCustomStartTime(null);
    setCustomEndTime(null);
    setSelectedTimeRange(TIME_RANGES[3]);
  };

  // Export to CSV
  const exportToCSV = () => {
    if (timeSeriesData.length === 0) return;
    
    const selectedMetricObjects = allMetrics.filter(m => selectedMetrics.includes(m.id));
    let csv = 'Timestamp,' + selectedMetricObjects.map(m => m.label).join(',') + '\n';
    
    timeSeriesData.forEach(point => {
      const time = new Date(point.timestamp).toISOString();
      const values = selectedMetricObjects.map(m => point[m.id] || '').join(',');
      csv += `${time},${values}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `drm-metrics-${Date.now()}.csv`;
    a.click();
  };

  // Load historical data for a specific range
  const loadHistoricalDataForRange = async (startDate, endDate) => {
    if (selectedMetrics.length === 0) {
      console.log('⚠️ loadHistoricalDataForRange: No metrics selected');
      return;
    }
    
    console.log('📊 loadHistoricalDataForRange called:', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      selectedMetrics: selectedMetrics.length + ' metrics'
    });
    
    setIsLoading(true);
    
    try {
      const selectedMetricObjects = allMetrics.filter(m => selectedMetrics.includes(m.id));
      console.log('📋 Selected metric objects:', selectedMetricObjects.map(m => m.id));
      
      const results = await Promise.all(
        selectedMetricObjects.map(async (metric) => {
          try {
            console.log(`🔍 Fetching data for metric: ${metric.id} (${metric.propertyId})`);
            const result = await getAggregates({
              assetId: metric.assetId,
              propertyId: metric.propertyId,
              aggregates: ['AVERAGE'],
              resolution: '1m',
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString()
            });
            console.log(`✅ Data fetched for ${metric.id}:`, result?.values?.length || 0, 'points');
            return { id: metric.id, data: result };
          } catch (error) {
            console.error(`❌ Error fetching data for ${metric.id}:`, error);
            return { id: metric.id, data: null };
          }
        })
      );
      
      console.log('📈 Processing results:', results.length);
      
      // Transform data into time series format
      const timeSeriesMap = new Map();
      results.forEach(({ id, data }) => {
        if (data && data.values) {
          console.log(`📊 Processing ${data.values.length} points for ${id}`);
          data.values.forEach(point => {
            const timestamp = new Date(point.timestamp).getTime();
            if (!timeSeriesMap.has(timestamp)) {
              timeSeriesMap.set(timestamp, { timestamp });
            }
            timeSeriesMap.get(timestamp)[id] = point.value;
          });
        } else {
          console.warn(`⚠️ No data returned for metric ${id}`);
        }
      });
      
      const newTimeSeriesData = Array.from(timeSeriesMap.values()).sort((a, b) => a.timestamp - b.timestamp);
      console.log(`🎯 Final time series data: ${newTimeSeriesData.length} points`);
      
      if (newTimeSeriesData.length > 0) {
        console.log('First point:', new Date(newTimeSeriesData[0].timestamp).toISOString());
        console.log('Last point:', new Date(newTimeSeriesData[newTimeSeriesData.length - 1].timestamp).toISOString());
      }
      
      setTimeSeriesData(newTimeSeriesData);
      
    } catch (error) {
      console.error('❌ Error loading historical data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load historical data when time range changes (non-live mode)
  useEffect(() => {
    if (isLiveMode) return;
    if (!customStartTime || !customEndTime) return;
    
    console.log('📊 Loading historical data for custom range:', {
      start: customStartTime,
      end: customEndTime
    });
    
    loadHistoricalDataForRange(new Date(customStartTime), new Date(customEndTime));
  }, [customStartTime, customEndTime, isLiveMode]);

  // Load historical data when selected metrics change and we have a time range
  useEffect(() => {
    if (selectedMetrics.length === 0) {
      setTimeSeriesData([]);
      return;
    }
    
    if (isLiveMode) {
      // In live mode, load historical data for the current time range
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - selectedTimeRange.value);
      console.log(`📈 Loading historical data for live mode: ${selectedTimeRange.label}`);
      console.log(`📊 Time range: ${startTime.toISOString()} to ${endTime.toISOString()}`);
      loadHistoricalDataForRange(startTime, endTime);
    }
  }, [selectedMetrics, selectedTimeRange, isLiveMode]);

  // Handle back navigation from simulation console
  useEffect(() => {
    handleBackFromSimulation();
    loadDataPointResults();
  }, []);

  // Reload results when returning from simulation
  useEffect(() => {
    if (returnFromSimulation) {
      loadDataPointResults();
      setReturnFromSimulation(false);
    }
  }, [returnFromSimulation]);

  // Track simulation readiness state changes
  useEffect(() => {
    const required = getSimulationRequiredMetrics();
    console.log('🎯 Simulation readiness check:', {
      selectedMetrics,
      hasCO2: !!required.co2,
      hasCH4: !!required.ch4,
      isReady: isSimulationReady
    });
  }, [selectedMetrics, isSimulationReady]);

  // Handle keyboard events for modal
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && showDataPointModal) {
        setShowDataPointModal(false);
        setModalData(null);
        setSimulationResults(null);
        setSimulationLogs([]);
      }
    };

    if (showDataPointModal) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [showDataPointModal]);

  // Load live data and filter based on selected time range
  useEffect(() => {
    if (!isLiveMode) return;
    
    let mounted = true;
    
    async function loadLiveData() {
      try {
        const results = await Promise.all(
          allMetrics.map(async (metric) => {
            try {
              const result = await getLiveValue({ 
                assetId: metric.assetId, 
                propertyId: metric.propertyId 
              });
              return { id: metric.id, data: result };
            } catch (error) {
              return { id: metric.id, data: null };
            }
          })
        );
        
        if (!mounted) return;
        
        const newLiveData = {};
        results.forEach(({ id, data }) => {
          newLiveData[id] = data;
        });
        
        setLiveData(newLiveData);
        setLastUpdate(new Date());
        
        // Add new live data point to existing time series
        const timestamp = new Date().getTime();
        const newPoint = { timestamp };
        allMetrics.forEach(metric => {
          const value = newLiveData[metric.id];
          newPoint[metric.id] = value?.value || 0;
        });
        
        setTimeSeriesData(prev => {
          // Only add new point if we have existing data (historical data loaded)
          // and it's not too old compared to the last point
          if (prev.length > 0) {
            const lastPoint = prev[prev.length - 1];
            const timeDiff = timestamp - lastPoint.timestamp;
            
            // Add new point and maintain time range window
            const updated = [...prev, newPoint];
            const cutoffTime = timestamp - selectedTimeRange.value;
            const filtered = updated.filter(p => p.timestamp >= cutoffTime);
            
            console.log('📈 Live data update:', {
              timeRange: selectedTimeRange.label,
              newPointTime: new Date(timestamp).toLocaleTimeString(),
              timeSinceLastPoint: Math.round(timeDiff / 1000) + 's',
              totalPoints: updated.length,
              filteredPoints: filtered.length
            });
            
            return filtered;
          }
          
          return prev; // Don't add live points until historical data is loaded
        });
        
      } catch (error) {
        console.error('Error loading live data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    console.log('🔄 Starting live data refresh', {
      timeRange: selectedTimeRange.label,
      interval: refreshInterval / 1000 + 's'
    });

    loadLiveData();
    const interval = setInterval(loadLiveData, refreshInterval);
    
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [allMetrics, isLiveMode, refreshInterval, selectedTimeRange]);

  // Removed old filtering effect - time filtering is now handled by data fetching

  // Handle graph click - open modal with data point details
  const handleGraphClick = (data) => {
    console.log('🔥 RECHARTS ONCLICK TRIGGERED:', { 
      hasData: !!data, 
      activePayload: data?.activePayload?.length || 0,
      chartX: data?.chartX,
      chartY: data?.chartY
    });
    
    if (data && data.activePayload && data.activePayload.length > 0) {
      const clickedData = data.activePayload[0].payload;
      
      console.log('🔥 OPENING MODAL WITH DATA:', {
        timestamp: new Date(clickedData.timestamp).toISOString(),
        availableKeys: Object.keys(clickedData),
        selectedMetricsCount: selectedMetrics.length
      });
      
      // Set modal data and show modal
      setModalData(clickedData);
      setShowDataPointModal(true);
      setSelectedTimestamp(clickedData.timestamp);
      
      console.log('🔥 MODAL SHOULD BE VISIBLE NOW!');
    } else {
      console.log('❌ NO DATA IN GRAPH CLICK');
    }
  };

  // Enhanced chart area click handler as primary method
  const handleChartClick = (event) => {
    console.log('🔥 CHART DIV CLICKED - FALLBACK METHOD');
    
    // If we have data, open modal with middle point as fallback
    if (timeSeriesData && timeSeriesData.length > 0) {
      const middleIndex = Math.floor(timeSeriesData.length / 2);
      const fallbackData = timeSeriesData[middleIndex];
      
      console.log('🔥 OPENING MODAL WITH FALLBACK DATA:', fallbackData);
      
      setModalData(fallbackData);
      setShowDataPointModal(true);
      setSelectedTimestamp(fallbackData.timestamp);
    }
  };

  // Format timestamp for display
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const formatDateTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Handler for running simulation from details panel
  const handleRunSimulation = async () => {
    if (!detailsData || !isSimulationReady) {
      alert('❌ Error: No data point selected or simulation not ready.');
      return;
    }
    
    const co2Flow = detailsData['co2_inlet_pv'];
    const ch4Flow = detailsData['ch4_inlet_pv'];
    
    if (!co2Flow || !ch4Flow) {
      alert('❌ Error: Missing required CO₂ or CH₄ flowrate data for simulation.');
      return;
    }
    
    setSimulationRunning(true);
    setSimulationResults(null);
    setSimulationLogs(['🎯 Starting simulation...', `📊 Using data from ${formatDateTime(detailsData.timestamp)}`]);
    
    try {
      // Call the simulation API (same as First Order Simulation page)
      const response = await fetch(`${import.meta.env.REACT_APP_BACKEND_URL}/api/dwsim/simulation/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Map the selected data to simulation inputs
          stream_3_temperature: 1200, // Default temperature
          stream_3_pressure: 1.5, // Default pressure
          stream_3_mass_flow: co2Flow,
          stream_4_temperature: 1200, // Default temperature
          stream_4_pressure: 1.5, // Default pressure
          stream_4_mass_flow: ch4Flow,
          source: 'enhanced_metrics_dashboard'
        }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setSimulationResults(result);
        setSimulationLogs(prev => [...prev, 
          '✅ Simulation completed successfully!',
          `📈 Results: ${Object.keys(result.results || {}).length} streams processed`,
          `⏱️ Completed at ${new Date().toLocaleTimeString()}`
        ]);
        console.log('🎯 Simulation completed:', result);
      } else {
        throw new Error(result.detail || 'Simulation failed');
      }
    } catch (error) {
      console.error('❌ Simulation error:', error);
      setSimulationLogs(prev => [...prev, 
        `❌ Simulation failed: ${error.message}`,
        '🔍 Check API connectivity and input parameters'
      ]);
    } finally {
      setSimulationRunning(false);
    }
  };

  // Handler for opening simulation console with pre-filled data (legacy - now using inline modal logic)
  const handleOpenSimulationConsole = () => {
    console.log('🔧 Legacy handleOpenSimulationConsole called - use modal inline logic instead');
  };

  // Load simulation results summary for data points
  const loadDataPointResults = async () => {
    try {
      const response = await fetch(`${import.meta.env.REACT_APP_BACKEND_URL}/api/simulation-results/summary`);
      const data = await response.json();
      
      if (data.success) {
        const resultsMap = new Map();
        data.data_points.forEach(dp => {
          resultsMap.set(dp.timestamp, dp.count);
        });
        setDataPointResults(resultsMap);
        console.log('📊 Loaded simulation results for', resultsMap.size, 'data points');
      }
    } catch (error) {
      console.error('❌ Failed to load data point results:', error);
    }
  };

  // Handle navigation back from simulation console
  const handleBackFromSimulation = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const returnFromSim = urlParams.get('return_from_simulation');
    const restoreState = urlParams.get('restore_state');
    
    if (returnFromSim === 'true' && restoreState) {
      try {
        const state = JSON.parse(decodeURIComponent(restoreState));
        console.log('🔄 Restoring dashboard state:', state);
        
        // Restore dashboard state
        if (state.selectedMetrics) {
          setSelectedMetrics(state.selectedMetrics);
        }
        
        if (state.selectedTimeRange) {
          const timeRange = TIME_RANGES.find(t => t.label === state.selectedTimeRange);
          if (timeRange) {
            setSelectedTimeRange(timeRange);
          }
        }
        
        setIsLiveMode(state.isLiveMode || true);
        
        // Restore modal data if available
        if (state.modalData) {
          setRestoreDataPoint(state.modalData);
          // Open modal after a short delay to ensure state is restored
          setTimeout(() => {
            setModalData(state.modalData);
            setShowDataPointModal(true);
            setSelectedTimestamp(state.modalData.timestamp);
          }, 1000);
        }
        
        setReturnFromSimulation(true);
        
        // Clean up URL parameters
        window.history.replaceState({}, '', window.location.pathname);
        
      } catch (error) {
        console.error('❌ Failed to restore dashboard state:', error);
      }
    }
  };

  // Simple hover tooltip - just shows basic info, click opens modal
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
      <div className="bg-gray-900 border border-cyan-500 rounded-lg p-2 shadow-xl">
        <p className="text-cyan-400 text-xs font-bold mb-1">{formatDateTime(label)}</p>
        <div className="text-xs text-gray-400">
          {payload.length} metric{payload.length !== 1 ? 's' : ''} • Click to view details
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen bg-gray-950 text-white flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-cyan-400" />
            Enhanced DRM Metrics Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-4">
          {/* Simulation Ready Indicator */}
          {isSimulationReady ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-900/20 border border-amber-600/30 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
              <span className="text-amber-400 text-sm font-medium">🎯 Simulation Ready</span>
              <button className="text-amber-400 hover:text-amber-300 text-sm font-medium px-2 py-0.5 bg-amber-600/20 hover:bg-amber-600/30 rounded border border-amber-600/40 transition-colors">
                Simulate
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-900/20 border border-gray-600/30 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-gray-500"></div>
              <span className="text-gray-500 text-sm">
                {selectedMetrics.includes('co2_inlet_pv') || selectedMetrics.includes('ch4_inlet_pv') 
                  ? `Select ${!selectedMetrics.includes('co2_inlet_pv') ? 'CO₂' : 'CH₄'} to enable simulation`
                  : 'Select CO₂ & CH₄ to enable simulation'}
              </span>
            </div>
          )}
          
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${isLiveMode ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
            <span className="text-gray-400">{isLiveMode ? 'Live Data' : 'Historical'}</span>
          </div>
          <div className="text-sm text-gray-400">
            Last Updated: {lastUpdate.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Main Content - Dual Panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Graphs (70%) */}
        <div className="w-[70%] bg-gray-950 flex flex-col overflow-hidden">
          {selectedMetrics.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <TrendingUp className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                <h3 className="text-xl text-gray-500 mb-2">No Metrics Selected</h3>
                <p className="text-gray-600">Select metrics from the right panel to view their graphs</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-auto">
              <div className="p-6 space-y-4">
                {/* Controls Bar */}
                <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    {/* Time Range Selector */}
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-cyan-400" />
                      <select
                        value={TIME_RANGES.indexOf(selectedTimeRange)}
                        onChange={(e) => handleTimeRangeChange(TIME_RANGES[e.target.value])}
                        className="bg-gray-800 border border-gray-700 rounded px-3 py-1 text-sm text-white"
                        disabled={!isLiveMode}
                      >
                        {TIME_RANGES.map((range, idx) => (
                          <option key={idx} value={idx}>{range.label}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => setShowTimeRangePicker(!showTimeRangePicker)}
                        className="px-3 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-sm flex items-center gap-2"
                      >
                        <Calendar className="w-4 h-4" />
                        Custom
                      </button>
                    </div>

                    {/* Refresh Interval */}
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-cyan-400" />
                      <select
                        value={refreshInterval}
                        onChange={(e) => setRefreshInterval(Number(e.target.value))}
                        className="bg-gray-800 border border-gray-700 rounded px-3 py-1 text-sm text-white"
                        disabled={!isLiveMode}
                      >
                        {REFRESH_INTERVALS.map((interval) => (
                          <option key={interval.value} value={interval.value}>{interval.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Live/Pause Toggle */}
                    <button
                      onClick={() => setIsLiveMode(!isLiveMode)}
                      className={`px-4 py-1 rounded text-sm font-medium flex items-center gap-2 ${
                        isLiveMode 
                          ? 'bg-green-600 hover:bg-green-700 text-white' 
                          : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      }`}
                    >
                      {isLiveMode ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      {isLiveMode ? 'Pause' : 'Resume'}
                    </button>

                    {/* Reset to Live */}
                    {!isLiveMode && (
                      <button
                        onClick={resetToLive}
                        className="px-4 py-1 bg-cyan-600 hover:bg-cyan-700 rounded text-sm font-medium"
                      >
                        Reset to Live
                      </button>
                    )}

                    {/* Export CSV */}
                    <button
                      onClick={exportToCSV}
                      className="px-4 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-sm flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Export CSV
                    </button>
                  </div>

                  {/* Custom Time Range Picker */}
                  {showTimeRangePicker && (
                    <div className="mt-4 pt-4 border-t border-gray-800 flex items-center gap-4">
                      <div className="flex-1">
                        <label className="text-xs text-gray-400 mb-1 block">Start Time</label>
                        <input
                          type="datetime-local"
                          value={customStartTime || ''}
                          onChange={(e) => setCustomStartTime(e.target.value)}
                          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1 text-sm text-white"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-gray-400 mb-1 block">End Time</label>
                        <input
                          type="datetime-local"
                          value={customEndTime || ''}
                          onChange={(e) => setCustomEndTime(e.target.value)}
                          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1 text-sm text-white"
                        />
                      </div>
                      <button
                        onClick={applyCustomTimeRange}
                        className="px-4 py-1 bg-cyan-600 hover:bg-cyan-700 rounded text-sm font-medium mt-5"
                      >
                        Apply
                      </button>
                    </div>
                  )}
                </div>

                {/* Main Time Series Chart */}
                <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white">Time Series Visualization</h3>
                    <div className="text-xs text-gray-400">
                      {timeSeriesData.length} data points | Click anywhere on chart area to open details modal
                    </div>
                  </div>
                  
                  <div 
                    onClick={handleChartClick} 
                    onDoubleClick={handleChartClick}
                    style={{ 
                      cursor: 'pointer',
                      border: '2px dashed transparent',
                      borderRadius: '8px',
                      padding: '4px'
                    }}
                    className="hover:border-cyan-500/50 transition-colors"
                    title="Click anywhere on the chart to view data point details"
                  >
                    <ResponsiveContainer width="100%" height={450}>
                      <LineChart 
                        data={timeSeriesData} 
                        onClick={handleGraphClick}
                      >
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        dataKey="timestamp" 
                        stroke="#9CA3AF"
                        tickFormatter={formatTime}
                        fontSize={10}
                      />
                      <YAxis stroke="#9CA3AF" fontSize={10} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend 
                        wrapperStyle={{ fontSize: '11px' }}
                        formatter={(value) => {
                          const metric = allMetrics.find(m => m.id === value);
                          return metric?.label || value;
                        }}
                      />
                      <Brush 
                        dataKey="timestamp" 
                        height={30} 
                        stroke="#06B6D4"
                        tickFormatter={formatTime}
                      />
                      {selectedTimestamp && (
                        <ReferenceLine 
                          x={selectedTimestamp} 
                          stroke="#06B6D4" 
                          strokeWidth={2}
                          strokeDasharray="3 3"
                        />
                      )}
                      {selectedSimulationPoint && isSimulationReady && (
                        <ReferenceLine 
                          x={selectedSimulationPoint.timestamp} 
                          stroke="#F59E0B" 
                          strokeWidth={3}
                          strokeDasharray="5 5"
                          label={{ 
                            value: "🎯 Simulation Point", 
                            position: "topLeft",
                            style: { 
                              fill: '#F59E0B', 
                              fontSize: '12px', 
                              fontWeight: 'bold',
                              backgroundColor: 'rgba(0,0,0,0.7)',
                              padding: '2px 4px',
                              borderRadius: '4px'
                            }
                          }}
                        />
                      )}
                      {selectedMetrics.map(metricId => {
                        const metric = allMetrics.find(m => m.id === metricId);
                        
                        // Custom dot function to show indicators for data points with results
                        const customDot = (props) => {
                          const { cx, cy, payload } = props;
                          const hasResults = dataPointResults.has(payload.timestamp);
                          
                          if (hasResults) {
                            const resultCount = dataPointResults.get(payload.timestamp);
                            return (
                              <g key={`dot-${payload.timestamp}-${metricId}`}>
                                {/* Outer glow ring */}
                                <circle 
                                  cx={cx} 
                                  cy={cy} 
                                  r={6} 
                                  fill="none" 
                                  stroke="#10B981" 
                                  strokeWidth={2} 
                                  opacity={0.6}
                                />
                                {/* Inner dot */}
                                <circle 
                                  cx={cx} 
                                  cy={cy} 
                                  r={3} 
                                  fill="#10B981" 
                                />
                                {/* Result count badge */}
                                <text 
                                  x={cx + 10} 
                                  y={cy - 8} 
                                  fill="#10B981" 
                                  fontSize={10} 
                                  fontWeight="bold"
                                >
                                  {resultCount}
                                </text>
                              </g>
                            );
                          }
                          
                          return null;
                        };
                        
                        return (
                          <Line
                            key={metricId}
                            type="monotone"
                            dataKey={metricId}
                            stroke={metric.color}
                            strokeWidth={2}
                            dot={customDot}
                            name={metric.label}
                            animationDuration={300}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

                {/* Details Panel - Synchronized Values */}
                {detailsData && (
                  <div className="bg-gray-900 rounded-xl p-6 border border-cyan-500">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-cyan-400">
                        Synchronized Values at {formatDateTime(detailsData.timestamp)}
                      </h3>
                      <button
                        onClick={() => setDetailsData(null)}
                        className="text-gray-400 hover:text-white"
                      >
                        ×
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-800">
                            <th className="text-left py-2 text-gray-400">Metric Name</th>
                            <th className="text-right py-2 text-gray-400">Value</th>
                            <th className="text-right py-2 text-gray-400">Unit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedMetrics.map(metricId => {
                            const metric = allMetrics.find(m => m.id === metricId);
                            const value = detailsData[metricId];
                            return (
                              <tr key={metricId} className="border-b border-gray-800">
                                <td className="py-2 flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: metric.color }}></div>
                                  <span className="text-white">{metric.label}</span>
                                </td>
                                <td className="text-right py-2 font-mono font-bold" style={{ color: metric.color }}>
                                  {value ? value.toFixed(2) : '--'}
                                </td>
                                <td className="text-right py-2 text-gray-400">{metric.unit}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedMetrics.map(metricId => {
                    const metric = allMetrics.find(m => m.id === metricId);
                    const live = liveData[metricId];
                    const historical = historicalData[metricId];
                    
                    return (
                      <div 
                        key={metricId}
                        className="bg-gray-900 rounded-lg p-4 border-l-4"
                        style={{ borderLeftColor: metric.color }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-gray-300">{metric.label}</h4>
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: metric.color }}
                          />
                        </div>
                        <div className="text-2xl font-bold mb-2" style={{ color: metric.color }}>
                          {live?.value?.toFixed(2) || '--'} {metric.unit}
                        </div>
                        {historical && (
                          <div className="grid grid-cols-3 gap-2 text-xs text-gray-400">
                            <div>
                              <div className="text-gray-500">Min</div>
                              <div className="font-mono">{historical.minimum?.toFixed(2)}</div>
                            </div>
                            <div>
                              <div className="text-gray-500">Avg</div>
                              <div className="font-mono">{historical.average?.toFixed(2)}</div>
                            </div>
                            <div>
                              <div className="text-gray-500">Max</div>
                              <div className="font-mono">{historical.maximum?.toFixed(2)}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Metrics Selector (30%) */}
        <div className="w-[30%] bg-gray-900 border-l border-gray-800 flex flex-col">
          {/* Search Bar */}
          <div className="p-4 border-b border-gray-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search metrics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={selectAllFiltered}
                className="flex-1 px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded text-gray-300"
              >
                Select All
              </button>
              <button
                onClick={clearAllSelections}
                className="flex-1 px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded text-gray-300"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Selection Info */}
          <div className="px-4 py-2 bg-gray-800 border-b border-gray-700 text-xs text-gray-400">
            {selectedMetrics.length} of {allMetrics.length} metrics selected
          </div>

          {/* Metrics List */}
          <div className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-gray-500">Loading metrics...</div>
              </div>
            ) : (
              <div className="p-2">
                {['Inlet', 'Outlet'].map(category => {
                  const categoryMetrics = filteredMetrics.filter(m => m.category === category);
                  if (categoryMetrics.length === 0) return null;

                  return (
                    <div key={category} className="mb-4">
                      <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase">
                        {category} Metrics ({categoryMetrics.length})
                      </div>
                      {categoryMetrics.map(metric => {
                        const isSelected = selectedMetrics.includes(metric.id);
                        const live = liveData[metric.id];

                        return (
                          <button
                            key={metric.id}
                            onClick={() => toggleMetric(metric.id)}
                            className={`w-full text-left p-3 rounded-lg mb-1 transition-all ${
                              isSelected 
                                ? 'bg-gray-800 border-l-4' 
                                : 'bg-gray-900 hover:bg-gray-850 border-l-4 border-transparent'
                            }`}
                            style={isSelected ? { borderLeftColor: metric.color } : {}}
                          >
                            <div className="flex items-start gap-3">
                              <div className="mt-1">
                                {isSelected ? (
                                  <Eye className="w-4 h-4" style={{ color: metric.color }} />
                                ) : (
                                  <EyeOff className="w-4 h-4 text-gray-600" />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="text-sm font-medium text-white mb-1">
                                  {metric.label}
                                </div>
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: metric.color }}
                                  />
                                  <div className="text-xs font-mono text-gray-400">
                                    {live?.value?.toFixed(2) || '--'} {metric.unit}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}

                {filteredMetrics.length === 0 && (
                  <div className="text-center text-gray-500 mt-8">
                    No metrics found
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Data Point Details Modal */}
      {showDataPointModal && modalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop - dimmed background */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
            onClick={() => setShowDataPointModal(false)}
          />
          
          {/* Modal Content */}
          <div className="relative bg-gray-900 border border-gray-700 rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-cyan-500 animate-pulse"></div>
                <h2 className="text-xl font-bold text-cyan-400">📊 Data Point Details</h2>
                {isSimulationReady && (
                  <span className="px-3 py-1 bg-amber-900/30 border border-amber-600/50 rounded-full text-sm text-amber-400">
                    🎯 Simulation Ready
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowDataPointModal(false)}
                className="text-gray-400 hover:text-white transition-colors text-2xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-800"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              {/* Time Reference */}
              <div className="mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
                <div className="text-sm text-gray-400 mb-2">Time Reference:</div>
                <div className="text-2xl font-mono text-white">
                  {formatDateTime(modalData.timestamp)}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  UTC: {new Date(modalData.timestamp).toISOString()}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Metric Values - Takes 2/3 of the space */}
                <div className="lg:col-span-2">
                  <h3 className="text-lg font-medium text-gray-300 mb-4">Selected Metrics Values:</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedMetrics.map(metricId => {
                      const metric = allMetrics.find(m => m.id === metricId);
                      const value = modalData[metricId];
                      if (!metric) return null;
                      
                      const isSimulationMetric = (metricId === 'co2_inlet_pv' || metricId === 'ch4_inlet_pv');
                      
                      return (
                        <div
                          key={metricId}
                          className={`p-4 rounded-lg border transition-all ${
                            isSimulationMetric 
                              ? 'bg-amber-900/20 border-amber-600/30 ring-1 ring-amber-500/20' 
                              : 'bg-gray-800 border-gray-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: metric.color }}
                            />
                            <span className="text-sm font-medium text-gray-300">
                              {metric.label}
                            </span>
                            {isSimulationMetric && (
                              <span className="text-xs text-amber-400 bg-amber-900/30 px-1.5 py-0.5 rounded">🎯</span>
                            )}
                          </div>
                          
                          <div className="text-xl font-mono text-white mb-1">
                            {value !== null && value !== undefined ? value.toFixed(2) : 'N/A'}
                          </div>
                          
                          <div className="text-sm text-gray-500">
                            {metric.unit || 'unit'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {selectedMetrics.length === 0 && (
                    <div className="text-center p-8 text-gray-500">
                      <div className="text-4xl mb-2">📊</div>
                      <div>No metrics selected. Select some metrics from the dashboard to see their values here.</div>
                    </div>
                  )}
                </div>

                {/* Actions Panel - Takes 1/3 of the space */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-300">🎯 Actions</h3>
                  
                  {isSimulationReady ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                        <div className="text-sm text-gray-400 mb-3">Ready for Simulation:</div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-300">CO₂ Flow:</span>
                            <span className="text-cyan-400 font-mono">{modalData['co2_inlet_pv']?.toFixed(1) || 'N/A'} ml/min</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-300">CH₄ Flow:</span>
                            <span className="text-orange-400 font-mono">{modalData['ch4_inlet_pv']?.toFixed(1) || 'N/A'} ml/min</span>
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => {
                          // Use modal data for simulation
                          setDetailsData(modalData);
                          handleRunSimulation();
                        }}
                        disabled={simulationRunning}
                        className="w-full px-4 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
                      >
                        {simulationRunning ? '⏳ Running Simulation...' : '🎯 Click to Simulate'}
                      </button>
                      
                      <button
                        onClick={() => {
                          console.log('🔧 Modal: Open Console button clicked');
                          
                          const co2Flow = modalData['co2_inlet_pv'];
                          const ch4Flow = modalData['ch4_inlet_pv'];
                          
                          // Get temperature and pressure from available metrics if present
                          const temperature = modalData['preheater1_pv'] || modalData['preheater2_pv'] || modalData['preheater3_pv'] || modalData['preheater4_pv'] || 1200;
                          const pressure = modalData['pressure_reactor_pv'] || 1.5;
                          
                          console.log('🔧 Modal: Navigating with data:', { 
                            co2Flow, 
                            ch4Flow, 
                            temperature, 
                            pressure,
                            availableKeys: Object.keys(modalData)
                          });
                          
                          // Store current dashboard state for back navigation
                          const dashboardState = {
                            selectedMetrics,
                            selectedTimeRange: selectedTimeRange.label,
                            isLiveMode,
                            modalData,
                            returnUrl: window.location.href
                          };
                          
                          // Navigate directly with modal data
                          const params = new URLSearchParams({
                            co2_flowrate: co2Flow?.toString() || '',
                            co2_temperature: temperature.toString(),
                            co2_pressure: pressure.toString(),
                            ch4_flowrate: ch4Flow?.toString() || '',
                            ch4_temperature: temperature.toString(), 
                            ch4_pressure: pressure.toString(),
                            timestamp: modalData.timestamp.toString(),
                            from_enhanced_metrics: 'true',
                            dashboard_state: encodeURIComponent(JSON.stringify(dashboardState))
                          });
                          
                          const targetUrl = `/simulation?${params.toString()}`;
                          console.log('🔧 Modal: Navigating to:', targetUrl);
                          
                          navigate(targetUrl);
                        }}
                        className="w-full px-4 py-3 bg-cyan-600 hover:bg-cyan-700 rounded-lg font-medium transition-colors"
                      >
                        🔧 Open in Simulation Console
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 bg-amber-900/20 border border-amber-600/30 rounded-lg text-center">
                      <div className="text-amber-400 mb-2">⚠️ Simulation Not Ready</div>
                      <div className="text-sm text-gray-400">Select both CO₂ & CH₄ metrics from the dashboard to enable simulation</div>
                    </div>
                  )}

                  {/* Simulation Results */}
                  {simulationResults && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="font-medium text-green-400">✅ Simulation Complete</span>
                      </div>
                      
                      <button
                        onClick={() => {
                          alert(`🎯 View Results\n\nSimulation completed successfully!\n\nResults will be displayed in the View Results modal (to be implemented next).`);
                        }}
                        className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors"
                      >
                        📈 View Results
                      </button>
                    </div>
                  )}

                  {/* API Logs */}
                  {simulationLogs.length > 0 && (
                    <div className="space-y-3">
                      <button
                        onClick={() => setShowSimulationLogs(!showSimulationLogs)}
                        className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors flex items-center justify-between"
                      >
                        <span>📝 API Logs</span>
                        <span>{showSimulationLogs ? '▼' : '▶'}</span>
                      </button>
                      
                      {showSimulationLogs && (
                        <div className="bg-gray-900 rounded-lg border border-gray-700 p-3 max-h-40 overflow-y-auto">
                          <div className="space-y-1">
                            {simulationLogs.map((log, index) => (
                              <div key={index} className="text-xs font-mono text-gray-300">
                                <span className="text-gray-500">[{new Date().toLocaleTimeString()}]</span> {log}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EnhancedMetricsDashboard;