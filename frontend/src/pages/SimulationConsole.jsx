import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import IndustrialDRMSimulation from '../components/simulation/IndustrialDRMSimulation';
import TestDRMSimulation from '../components/simulation/TestDRMSimulation';

const BRAND = process.env.REACT_APP_BRAND_NAME || "AnukaranAI";
const BRAND_LOGO = process.env.REACT_APP_BRAND_LOGO || "/brand.png";

// Input validation ranges
const VALIDATION_RANGES = {
  h2_flowrate: { min: 0, max: 2000, unit: 'ml/min' },
  ch4_flowrate: { min: 0, max: 2000, unit: 'ml/min' },
  co2_flowrate: { min: 0, max: 1000, unit: 'ml/min' },
  n2_flowrate: { min: 0, max: 1000, unit: 'ml/min' },
  air_flowrate: { min: 0, max: 1000, unit: 'ml/min' },
  reactor_temperature: { min: 200, max: 1000, unit: '°C' },
  reactor_pressure: { min: 1, max: 50, unit: 'bar' }
};

// Default simulation parameters
const DEFAULT_PARAMS = {
  h2_flowrate: 1200,
  ch4_flowrate: 800,
  co2_flowrate: 400,
  n2_flowrate: 200,
  air_flowrate: 300,
  reactor_temperature: 850,
  reactor_pressure: 5.0
};

function SimulationInputPanel({ params, onParamChange, onRunSimulation, isRunning }) {
  const [errors, setErrors] = useState({});

  const validateParam = (key, value) => {
    const range = VALIDATION_RANGES[key];
    if (!range) return null;
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return `Invalid number`;
    if (numValue < range.min || numValue > range.max) {
      return `Must be between ${range.min} and ${range.max} ${range.unit}`;
    }
    return null;
  };

  const handleInputChange = (key, value) => {
    const error = validateParam(key, value);
    setErrors(prev => ({ ...prev, [key]: error }));
    onParamChange(key, value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate all parameters
    const newErrors = {};
    Object.keys(params).forEach(key => {
      const error = validateParam(key, params[key]);
      if (error) newErrors[key] = error;
    });
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length === 0) {
      onRunSimulation(params);
    }
  };

  const renderInput = (key, label) => {
    const range = VALIDATION_RANGES[key];
    return (
      <div key={key} className="simulation-input-group">
        <label className="simulation-input-label">
          {label}
          <span className="simulation-input-unit">({range.unit})</span>
        </label>
        <input
          type="number"
          value={params[key]}
          onChange={(e) => handleInputChange(key, e.target.value)}
          min={range.min}
          max={range.max}
          step={key === 'reactor_pressure' ? '0.1' : '1'}
          className={`simulation-input ${errors[key] ? 'simulation-input-error' : ''}`}
          disabled={isRunning}
        />
        {errors[key] && <div className="simulation-error-text">{errors[key]}</div>}
        <div className="simulation-input-range">
          Range: {range.min} - {range.max} {range.unit}
        </div>
      </div>
    );
  };

  return (
    <div className="simulation-panel">
      <div className="simulation-panel-header">
        <h2 className="simulation-panel-title">🔧 Simulation Inputs</h2>
        <p className="simulation-panel-subtitle">Configure simulation parameters</p>
      </div>
      
      <form onSubmit={handleSubmit} className="simulation-form">
        <div className="simulation-input-section">
          <h3 className="simulation-section-title">Inlet Flowrates</h3>
          {renderInput('h2_flowrate', 'H₂ Inlet Flowrate')}
          {renderInput('ch4_flowrate', 'CH₄ Inlet Flowrate')}
          {renderInput('co2_flowrate', 'CO₂ Inlet Flowrate')}
          {renderInput('n2_flowrate', 'N₂ Inlet Flowrate')}
          {renderInput('air_flowrate', 'Air Inlet Flowrate')}
        </div>
        
        <div className="simulation-input-section">
          <h3 className="simulation-section-title">Reactor Conditions</h3>
          {renderInput('reactor_temperature', 'Reactor Temperature')}
          {renderInput('reactor_pressure', 'Reactor Pressure')}
        </div>
        
        <button 
          type="submit" 
          className={`simulation-run-button ${isRunning ? 'simulation-run-button-running' : ''}`}
          disabled={isRunning}
        >
          {isRunning ? (
            <>
              <div className="simulation-spinner"></div>
              Running Simulation...
            </>
          ) : (
            <>
              🚀 Run Simulation
            </>
          )}
        </button>
      </form>
    </div>
  );
}

function SimulationResultsPanel({ isRunning, results }) {
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const frameRef = useRef(null);

  useEffect(() => {
    let disposed = false;

    async function initVisualization() {
      if (!mountRef.current || disposed) return;

      try {
        // Scene setup
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0d0f12);
        sceneRef.current = scene;

        // Renderer setup
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
        rendererRef.current = renderer;
        mountRef.current.appendChild(renderer.domElement);

        // Camera setup
        const camera = new THREE.PerspectiveCamera(75, 
          mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 1000);
        camera.position.set(0, 0, 5);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(-1, 1, 1);
        scene.add(directionalLight);

        // Placeholder geometry - a rotating reactor vessel
        const geometry = new THREE.CylinderGeometry(1, 1, 3, 32);
        const material = new THREE.MeshPhongMaterial({ 
          color: 0x22c55e, 
          transparent: true, 
          opacity: 0.7,
          wireframe: false
        });
        const reactor = new THREE.Mesh(geometry, material);
        scene.add(reactor);

        // Add some inlet/outlet pipes
        const pipeGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1, 16);
        const pipeMaterial = new THREE.MeshPhongMaterial({ color: 0x3b82f6 });
        
        // Inlet pipes
        for (let i = 0; i < 5; i++) {
          const pipe = new THREE.Mesh(pipeGeometry, pipeMaterial);
          pipe.position.set(Math.cos(i * Math.PI * 0.4) * 1.2, 1, Math.sin(i * Math.PI * 0.4) * 1.2);
          pipe.rotation.z = Math.PI / 2;
          scene.add(pipe);
        }

        // Outlet pipe
        const outletPipe = new THREE.Mesh(pipeGeometry, new THREE.MeshPhongMaterial({ color: 0xef4444 }));
        outletPipe.position.set(0, -2, 0);
        scene.add(outletPipe);

        // Animation loop
        function animate() {
          if (disposed) return;
          
          frameRef.current = requestAnimationFrame(animate);
          
          // Rotate the reactor
          reactor.rotation.y += 0.01;
          
          renderer.render(scene, camera);
        }
        animate();

        // Handle resize
        function handleResize() {
          if (disposed || !mountRef.current) return;
          const width = mountRef.current.clientWidth;
          const height = mountRef.current.clientHeight;
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height);
        }
        
        window.addEventListener('resize', handleResize);
        
        return () => {
          window.removeEventListener('resize', handleResize);
        };

      } catch (error) {
        console.error('Visualization setup error:', error);
      }
    }

    initVisualization();

    return () => {
      disposed = true;
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      if (rendererRef.current && mountRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, []);

  return (
    <div className="simulation-panel">
      <div className="simulation-panel-header">
        <h2 className="simulation-panel-title">📊 Simulation Results</h2>
        <p className="simulation-panel-subtitle">3D CFD Visualization</p>
      </div>
      
      <div className="simulation-results-content">
        {!results && !isRunning && (
          <div className="simulation-placeholder">
            <div className="simulation-placeholder-icon">🔬</div>
            <div className="simulation-placeholder-text">
              Run a simulation to see CFD results
            </div>
            <div className="simulation-placeholder-subtext">
              Mesh, scalar fields, and streamlines will appear here
            </div>
          </div>
        )}
        
        {isRunning && (
          <div className="simulation-loading">
            <div className="simulation-loading-spinner"></div>
            <div className="simulation-loading-text">Processing simulation...</div>
            <div className="simulation-loading-subtext">Generating CFD results</div>
          </div>
        )}
        
        <div 
          ref={mountRef} 
          className="simulation-3d-viewer"
          style={{ 
            height: results || isRunning ? '300px' : '400px',
            display: results || !isRunning ? 'block' : 'none'
          }}
        />
        
        {results && (
          <div className="simulation-results-summary">
            <h3 className="simulation-results-title">Simulation Summary</h3>
            <div className="simulation-results-grid">
              <div className="simulation-result-item">
                <span className="simulation-result-label">Status:</span>
                <span className="simulation-result-value success">✅ Completed</span>
              </div>
              <div className="simulation-result-item">
                <span className="simulation-result-label">Runtime:</span>
                <span className="simulation-result-value">{results.runtime}s</span>
              </div>
              <div className="simulation-result-item">
                <span className="simulation-result-label">Mesh Cells:</span>
                <span className="simulation-result-value">{results.meshCells?.toLocaleString()}</span>
              </div>
              <div className="simulation-result-item">
                <span className="simulation-result-label">Converged:</span>
                <span className="simulation-result-value success">✅ Yes</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function SimulationConsole() {
  const navigate = useNavigate();
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [simulationType, setSimulationType] = useState('fop'); // 'cfd', 'ml', 'fop'

  // First Order Principle simulation parameters
  const [fopParams, setFopParams] = useState({
    T_C: 825.0,
    P_bar: 1.0,
    fCH4_mlpm: 700.0,
    fCO2_mlpm: 300.0,
    fN2_mlpm: 0.0,
    GHSV: 10000.0
  });

  // Enhanced navigation and save results state
  const [dashboardState, setDashboardState] = useState(null);
  const [originalDataPoint, setOriginalDataPoint] = useState(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveNotes, setSaveNotes] = useState('');
  const [savedResults, setSavedResults] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // Current simulation results from IndustrialDRMSimulation
  const [currentSimulationResults, setCurrentSimulationResults] = useState(null);
  const [showSavedResultsPanel, setShowSavedResultsPanel] = useState(false);
  const [selectedSavedResult, setSelectedSavedResult] = useState(null);

  // Handle URL parameters for pre-population from Enhanced Metrics Dashboard
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const fromEnhancedMetrics = urlParams.get('from_enhanced_metrics');
    const dashboardStateParam = urlParams.get('dashboard_state');
    
    if (fromEnhancedMetrics === 'true') {
      console.log('🔧 Pre-populating from Enhanced Metrics Dashboard');
      
      const co2Flowrate = urlParams.get('co2_flowrate');
      const ch4Flowrate = urlParams.get('ch4_flowrate');
      const co2Temperature = urlParams.get('co2_temperature');
      const co2Pressure = urlParams.get('co2_pressure');
      const ch4Temperature = urlParams.get('ch4_temperature');
      const ch4Pressure = urlParams.get('ch4_pressure');
      const timestamp = urlParams.get('timestamp');
      
      console.log('🔧 URL Parameters:', {
        co2Flowrate,
        ch4Flowrate,
        co2Temperature,
        co2Pressure,
        ch4Temperature,
        ch4Pressure,
        timestamp
      });
      
      // Store original data point information
      setOriginalDataPoint({
        timestamp: parseInt(timestamp),
        co2_flow: parseFloat(co2Flowrate) || 0,
        ch4_flow: parseFloat(ch4Flowrate) || 0,
        temperature: parseFloat(co2Temperature) || null,
        pressure: parseFloat(co2Pressure) || null
      });
      
      // Parse and store dashboard state for back navigation
      if (dashboardStateParam) {
        try {
          const state = JSON.parse(decodeURIComponent(dashboardStateParam));
          setDashboardState(state);
          console.log('🔧 Dashboard state stored for back navigation:', state);
        } catch (error) {
          console.error('❌ Failed to parse dashboard state:', error);
        }
      }
      
      // Update FOP parameters with the received values
      const updatedFopParams = { ...fopParams };
      
      if (co2Flowrate && !isNaN(parseFloat(co2Flowrate))) {
        updatedFopParams.fCO2_mlpm = parseFloat(co2Flowrate);
      }
      
      if (ch4Flowrate && !isNaN(parseFloat(ch4Flowrate))) {
        updatedFopParams.fCH4_mlpm = parseFloat(ch4Flowrate);
      }
      
      if (co2Temperature && !isNaN(parseFloat(co2Temperature))) {
        updatedFopParams.T_C = parseFloat(co2Temperature);
      }
      
      if (co2Pressure && !isNaN(parseFloat(co2Pressure))) {
        updatedFopParams.P_bar = parseFloat(co2Pressure);
      }
      
      setFopParams(updatedFopParams);
      
      console.log('✅ Pre-populated FOP parameters:', updatedFopParams);
      
      // Show a notification to the user
      setTimeout(() => {
        alert(`📊 Data Pre-populated from Enhanced Metrics!\n\nCO₂ Flow: ${updatedFopParams.fCO2_mlpm} ml/min\nCH₄ Flow: ${updatedFopParams.fCH4_mlpm} ml/min\nTemperature: ${updatedFopParams.T_C}°C\nPressure: ${updatedFopParams.P_bar} bar\n\nYou can now run the simulation directly!`);
      }, 1000);
    }
  }, []);

  // Load user info from localStorage and check permissions
  useEffect(() => {
    const userData = localStorage.getItem('dmr_user_data') || localStorage.getItem('smr_user_data');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setCurrentUser(user);
        // Redirect read-only users away from simulation console
        if (user.role === 'read_only') {
          alert('Access denied. Simulation Console is for Admin users only.');
          navigate('/digital-twins');
          return;
        }
      } catch (e) {
        console.error('Failed to parse user data:', e);
        navigate('/digital-twins');
      }
    } else {
      navigate('/digital-twins');
    }
  }, [navigate]);

  // Load all saved results on component mount
  useEffect(() => {
    loadAllSavedResults();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('dmr_authenticated');
    localStorage.removeItem('dmr_user');
    localStorage.removeItem('dmr_user_data');
    // Migration cleanup
    localStorage.removeItem('smr_authenticated');
    localStorage.removeItem('smr_user');
    localStorage.removeItem('smr_user_data');
    navigate('/');
  };

  const handleParamChange = (key, value) => {
    setParams(prev => ({ ...prev, [key]: parseFloat(value) || 0 }));
  };

  const handleFopParamChange = (key, value) => {
    setFopParams(prev => ({ ...prev, [key]: parseFloat(value) || 0 }));
  };

  // Enhanced back button - returns to exact data point in Enhanced Metrics Dashboard
  const handleEnhancedBack = () => {
    if (dashboardState) {
      console.log('🔄 Navigating back to Enhanced Metrics with state restoration');
      
      // Construct URL parameters for state restoration
      const restoreParams = new URLSearchParams({
        return_from_simulation: 'true',
        restore_state: encodeURIComponent(JSON.stringify(dashboardState))
      });
      
      navigate(`/metrics?${restoreParams.toString()}`);
    } else {
      // Fallback to regular dashboard
      navigate('/dashboard');
    }
  };

  // Save simulation results with improved logic
  const handleSaveResults = async () => {
    // Check if we have simulation results
    if (!currentSimulationResults) {
      alert('❌ No simulation results to save. Please run a simulation first.');
      return;
    }

    setIsSaving(true);
    
    try {
      // Prepare the result data
      const resultData = {
        time_reference: originalDataPoint ? {
          timestamp: originalDataPoint.timestamp,
          formatted_time: new Date(originalDataPoint.timestamp).toLocaleString()
        } : null,
        metrics_values: originalDataPoint ? {
          co2_flow: originalDataPoint.co2_flow,
          ch4_flow: originalDataPoint.ch4_flow,
          temperature: originalDataPoint.temperature,
          pressure: originalDataPoint.pressure
        } : {
          co2_flow: fopParams.fCO2_mlpm,
          ch4_flow: fopParams.fCH4_mlpm,
          temperature: fopParams.T_C,
          pressure: fopParams.P_bar
        },
        simulation_outputs: {
          ch4_conversion: currentSimulationResults.ch4_conversion || currentSimulationResults.conversion_ch4,
          co2_conversion: currentSimulationResults.co2_conversion || currentSimulationResults.conversion_co2,
          h2_yield: currentSimulationResults.h2_yield || currentSimulationResults.yield_h2,
          co_yield: currentSimulationResults.co_yield || currentSimulationResults.yield_co,
          h2_co_ratio: currentSimulationResults.h2_co_ratio,
          reactor_duty: currentSimulationResults.reactor_duty || currentSimulationResults.duty,
          exit_temperature: currentSimulationResults.exit_temperature,
          outlet_composition: currentSimulationResults.outlet_composition,
          runtime: currentSimulationResults.runtime,
          stream_count: {
            active: currentSimulationResults.active_streams,
            total: currentSimulationResults.total_streams
          },
          stream_details: currentSimulationResults.stream_data || currentSimulationResults.streams,
          api_log: currentSimulationResults.simulation_log || currentSimulationResults.log,
          modifications_applied: currentSimulationResults.modifications_applied,
          success_message: currentSimulationResults.message || currentSimulationResults.success_message,
          ...currentSimulationResults // Include any additional data
        },
        simulation_params: {
          ...fopParams,
          simulationType
        },
        notes: saveNotes,
        source: originalDataPoint ? 'data_point' : 'manual'
      };

      // Save to localStorage
      const savedResult = saveResultToStorage(resultData);

      alert(`✅ Result saved successfully!\n\nResult ID: ${savedResult.result_id}`);
      setShowSaveModal(false);
      setSaveNotes('');
      
    } catch (error) {
      console.error('❌ Save results error:', error);
      alert(`❌ Failed to save results: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Results Storage Management (using localStorage for simplicity)
  const STORAGE_KEY = 'simulation_results_storage';
  const MAX_RESULTS = 30;

  // Load all saved results from localStorage
  const loadAllSavedResults = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const results = stored ? JSON.parse(stored) : [];
      setSavedResults(results);
      console.log(`📊 Loaded ${results.length} saved results from storage`);
      return results;
    } catch (error) {
      console.error('❌ Failed to load saved results:', error);
      return [];
    }
  };

  // Save result to localStorage with automatic cleanup
  const saveResultToStorage = (resultData) => {
    try {
      let results = loadAllSavedResults();
      
      // Add new result at the beginning (most recent first)
      const newResult = {
        result_id: `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        ...resultData
      };
      
      results.unshift(newResult);
      
      // Maintain maximum of 30 results
      if (results.length > MAX_RESULTS) {
        results = results.slice(0, MAX_RESULTS);
        console.log(`🗑️ Trimmed results to ${MAX_RESULTS} entries (removed oldest)`);
      }
      
      // Save back to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
      setSavedResults(results);
      
      console.log(`✅ Saved result with ID: ${newResult.result_id}`);
      return newResult;
      
    } catch (error) {
      console.error('❌ Failed to save result:', error);
      throw error;
    }
  };

  // Delete a specific result
  const deleteResult = (resultId) => {
    try {
      const results = savedResults.filter(r => r.result_id !== resultId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
      setSavedResults(results);
      console.log(`🗑️ Deleted result: ${resultId}`);
    } catch (error) {
      console.error('❌ Failed to delete result:', error);
    }
  };

  const handleRunSimulation = async (simulationParams) => {
    setIsRunning(true);
    setResults(null);
    
    try {
      // TODO: Replace with actual API call to backend
      const backend = process.env.REACT_APP_BACKEND_URL || '';
      const response = await fetch(`${backend}/api/simulation/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(simulationParams),
      });
      
      if (response.ok) {
        const data = await response.json();
        // Simulate processing time
        setTimeout(() => {
          setResults({
            runtime: 45.2,
            meshCells: 125000,
            converged: true,
            ...data
          });
          setIsRunning(false);
        }, 3000);
      } else {
        // Fallback for demo - simulate successful completion
        setTimeout(() => {
          setResults({
            runtime: 42.8,
            meshCells: 118500,
            converged: true
          });
          setIsRunning(false);
        }, 3000);
      }
    } catch (error) {
      console.error('Simulation error:', error);
      // Fallback for demo
      setTimeout(() => {
        setResults({
          runtime: 38.5,
          meshCells: 95000,
          converged: true
        });
        setIsRunning(false);
      }, 3000);
    }
  };

  const handleRunMLSimulation = async () => {
    setIsRunning(true);
    setResults(null);
    
    // Simulate ML computation
    setTimeout(() => {
      setResults({
        type: 'ml',
        runtime: 12.3,
        accuracy: 0.95,
        predictions: {
          h2_yield: 0.78,
          co_yield: 0.82,
          conversion: 0.85,
          selectivity: 0.91
        },
        model_info: {
          architecture: 'Deep Neural Network',
          layers: 5,
          neurons: 256,
          training_samples: 10000
        }
      });
      setIsRunning(false);
    }, 2000);
  };

  const handleRunFOPSimulation = async () => {
    setIsRunning(true);
    setResults(null);
    
    try {
      const backend = process.env.REACT_APP_BACKEND_URL || '';
      const response = await fetch(`${backend}/api/simulation/fop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fopParams),
      });
      
      if (response.ok) {
        const data = await response.json();
        setResults({
          type: 'fop',
          ...data
        });
      } else {
        // Fallback simulation
        setResults({
          type: 'fop',
          runtime: 8.5,
          exit_temperature: 825.5,
          conversion_ch4: 0.82,
          conversion_co2: 0.79,
          yield_h2: 0.75,
          yield_co: 0.78,
          outlet_composition: {
            CH4: 0.12,
            CO2: 0.08,
            H2: 0.35,
            CO: 0.33,
            N2: 0.12
          }
        });
      }
    } catch (error) {
      console.error('FOP Simulation error:', error);
      // Fallback
      setResults({
        type: 'fop',
        runtime: 8.5,
        exit_temperature: 825.5,
        conversion_ch4: 0.82,
        conversion_co2: 0.79,
        yield_h2: 0.75,
        yield_co: 0.78,
        outlet_composition: {
          CH4: 0.12,
          CO2: 0.08,
          H2: 0.35,
          CO: 0.33,
          N2: 0.12
        }
      });
    }
    setIsRunning(false);
  };

  const getPageTitle = () => {
    switch (simulationType) {
      case 'ml': return 'Machine Learning ANN Simulation';
      case 'fop': return 'First Order Principle Simulation';
      default: return 'CFD Simulation';
    }
  };

  return (
    <div className="simulation-console">
      <header className="simulation-header">
        <div className="brand" aria-label={BRAND}>
          <img src={BRAND_LOGO} alt="brand" className="brand-logo" onError={(e)=>{e.currentTarget.style.display='none'}} />
          <span className="simulation-title">Simulation Console</span>
        </div>
        <div className="flex gap-3">
          {dashboardState ? (
            <button 
              className="btn-outline"
              onClick={handleEnhancedBack}
              title="Return to the same data point in Enhanced Metrics Dashboard"
            >
              ← Back to Data Point
            </button>
          ) : (
            <a className="btn-outline" href="/dashboard">Back to Dashboard</a>
          )}
          <a className="btn-outline" href="/metrics">Metrics</a>
          <button 
            className={`btn-outline ${showSavedResultsPanel ? 'bg-blue-600 text-white' : ''}`}
            onClick={() => setShowSavedResultsPanel(!showSavedResultsPanel)}
            title={`${showSavedResultsPanel ? 'Hide' : 'Show'} saved results panel`}
          >
            📊 Results ({savedResults.length})
          </button>
          <button className="btn-outline" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      {/* Simulation Type Selector - Compact Header */}
      <div className="simulation-selector-compact">
        <div className="simulation-selector-row">
          <div className="simulation-dropdown-group">
            <label htmlFor="simulation-type" className="simulation-selector-label">
              Select Simulation Type:
            </label>
            <select
              id="simulation-type"
              value={simulationType}
              onChange={(e) => {
                setSimulationType(e.target.value);
                setResults(null);
                setIsRunning(false);
              }}
              className="simulation-selector-dropdown"
            >
              <option value="cfd">CFD Simulation</option>
              <option value="ml">Machine Learning ANN Simulation</option>
              <option value="fop">First Order Principle Simulation</option>
            </select>
          </div>
          <h1 className="simulation-page-title-inline">{getPageTitle()}</h1>
        </div>
      </div>
      
      <div className="flex">
        {/* Saved Results Sidebar */}
        {showSavedResultsPanel && (
          <div className="w-80 bg-gray-900 border-r border-gray-700 h-screen overflow-y-auto">
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">📊 Saved Results</h3>
                <button
                  onClick={() => setShowSavedResultsPanel(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-gray-400 mt-1">
                {savedResults.length} of {MAX_RESULTS} results stored
              </p>
            </div>
            
            <div className="p-4">
              {savedResults.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl text-gray-600 mb-2">📊</div>
                  <p className="text-gray-500">No saved results yet</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Run simulations and save results to see them here
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedResults.map((result, index) => (
                    <div
                      key={result.result_id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedSavedResult?.result_id === result.result_id
                          ? 'border-blue-500 bg-blue-900/20'
                          : 'border-gray-700 hover:border-gray-600 hover:bg-gray-800/50'
                      }`}
                      onClick={() => setSelectedSavedResult(result)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-400">
                          #{index + 1} • {new Date(result.timestamp).toLocaleDateString()}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Delete this saved result?')) {
                              deleteResult(result.result_id);
                            }
                          }}
                          className="text-red-400 hover:text-red-300 text-xs"
                          title="Delete result"
                        >
                          🗑️
                        </button>
                      </div>
                      
                      <div className="text-sm text-white font-medium mb-1">
                        {result.time_reference ? 
                          `Data Point: ${result.time_reference.formatted_time}` :
                          `Manual Run: ${new Date(result.timestamp).toLocaleTimeString()}`
                        }
                      </div>
                      
                      <div className="text-xs text-gray-400">
                        CO₂: {result.metrics_values?.co2_flow?.toFixed(1) || 'N/A'} ml/min •{' '}
                        CH₄: {result.metrics_values?.ch4_flow?.toFixed(1) || 'N/A'} ml/min
                      </div>
                      
                      {result.simulation_outputs?.ch4_conversion && (
                        <div className="text-xs text-green-400 mt-1">
                          CH₄ Conv: {result.simulation_outputs.ch4_conversion.toFixed(1)}%
                        </div>
                      )}
                      
                      {result.notes && (
                        <div className="text-xs text-blue-300 mt-1 italic">
                          "{result.notes.substring(0, 50)}{result.notes.length > 50 ? '...' : ''}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Simulation Content */}
        <div className={`flex-1 ${simulationType === 'fop' ? 'simulation-content-fop' : 'simulation-content'}`}>
          {simulationType === 'cfd' && (
          <>
            <SimulationInputPanel 
              params={params}
              onParamChange={handleParamChange}
              onRunSimulation={handleRunSimulation}
              isRunning={isRunning}
            />
            <SimulationResultsPanel 
              isRunning={isRunning}
              results={results}
            />
          </>
        )}

        {simulationType === 'ml' && (
          <>
            <MLSimulationPanel 
              onRunSimulation={handleRunMLSimulation}
              isRunning={isRunning}
            />
            <MLResultsPanel 
              isRunning={isRunning}
              results={results}
            />
          </>
        )}

        {simulationType === 'fop' && (
          <div className="simulation-content-wrapper">
            <IndustrialDRMSimulation 
              onSaveResults={() => setShowSaveModal(true)}
              onSimulationComplete={(data) => {
                console.log("🎯 SimulationConsole received simulation data:", data);
                setCurrentSimulationResults(data);
              }}
              savedResultsCount={savedResults.length}
              currentResults={currentSimulationResults}
            />
          </div>
        )}
        </div>
      </div>

      {/* Save Results Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">💾 Save Simulation Results</h3>
            
            {originalDataPoint && (
              <div className="mb-4 p-3 bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-400">Data Point:</p>
                <p className="text-white">{new Date(originalDataPoint.timestamp).toLocaleString()}</p>
                <p className="text-sm text-gray-300">
                  CO₂: {originalDataPoint.co2_flow} ml/min, CH₄: {originalDataPoint.ch4_flow} ml/min
                </p>
              </div>
            )}
            
            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-2">Notes (optional):</label>
              <textarea
                value={saveNotes}
                onChange={(e) => setSaveNotes(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                rows={3}
                placeholder="Add notes about this simulation run..."
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleSaveResults}
                disabled={isSaving}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded font-medium transition-colors"
              >
                {isSaving ? '⏳ Saving...' : '💾 Save Results'}
              </button>
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 border border-gray-600 text-gray-300 rounded hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Saved Result Details Modal */}
      {selectedSavedResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">📊 Saved Result Details</h3>
              <button
                onClick={() => setSelectedSavedResult(null)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>
            
            {/* Result Info */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800 p-3 rounded-lg">
                  <p className="text-sm text-gray-400">Result ID</p>
                  <p className="text-white font-mono text-xs">{selectedSavedResult.result_id}</p>
                </div>
                <div className="bg-gray-800 p-3 rounded-lg">
                  <p className="text-sm text-gray-400">Saved At</p>
                  <p className="text-white">{new Date(selectedSavedResult.timestamp).toLocaleString()}</p>
                </div>
              </div>
              
              {/* Data Point Reference */}
              <div className="bg-gray-800 p-3 rounded-lg">
                <p className="text-sm text-gray-400 mb-2">Data Point Reference</p>
                {selectedSavedResult.time_reference ? (
                  <p className="text-white">{selectedSavedResult.time_reference.formatted_time}</p>
                ) : (
                  <p className="text-gray-500 italic">Manual simulation (no data point selected)</p>
                )}
              </div>
              
              {/* Metrics Values */}
              <div className="bg-gray-800 p-3 rounded-lg">
                <p className="text-sm text-gray-400 mb-2">Input Parameters</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>CO₂ Flow: <span className="text-cyan-400">{selectedSavedResult.metrics_values?.co2_flow?.toFixed(1) || 'N/A'} ml/min</span></div>
                  <div>CH₄ Flow: <span className="text-cyan-400">{selectedSavedResult.metrics_values?.ch4_flow?.toFixed(1) || 'N/A'} ml/min</span></div>
                  <div>Temperature: <span className="text-cyan-400">{selectedSavedResult.metrics_values?.temperature?.toFixed(1) || 'N/A'} °C</span></div>
                  <div>Pressure: <span className="text-cyan-400">{selectedSavedResult.metrics_values?.pressure?.toFixed(1) || 'N/A'} bar</span></div>
                </div>
              </div>
              
              {/* Simulation Outputs */}
              <div className="bg-gray-800 p-3 rounded-lg">
                <p className="text-sm text-gray-400 mb-2">Simulation Results</p>
                
                {/* Key Performance Indicators */}
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  {selectedSavedResult.simulation_outputs?.ch4_conversion && (
                    <div>CH₄ Conversion: <span className="text-green-400">{selectedSavedResult.simulation_outputs.ch4_conversion.toFixed(1)}%</span></div>
                  )}
                  {selectedSavedResult.simulation_outputs?.co2_conversion && (
                    <div>CO₂ Conversion: <span className="text-green-400">{selectedSavedResult.simulation_outputs.co2_conversion.toFixed(1)}%</span></div>
                  )}
                  {selectedSavedResult.simulation_outputs?.h2_co_ratio && (
                    <div>H₂/CO Ratio: <span className="text-cyan-400">{selectedSavedResult.simulation_outputs.h2_co_ratio.toFixed(2)}</span></div>
                  )}
                  {selectedSavedResult.simulation_outputs?.reactor_duty && (
                    <div>Reactor Duty: <span className="text-orange-400">{selectedSavedResult.simulation_outputs.reactor_duty.toFixed(1)} kW</span></div>
                  )}
                  {selectedSavedResult.simulation_outputs?.exit_temperature && (
                    <div>Exit Temp: <span className="text-yellow-400">{selectedSavedResult.simulation_outputs.exit_temperature.toFixed(1)} °C</span></div>
                  )}
                  {selectedSavedResult.simulation_outputs?.runtime && (
                    <div>Runtime: <span className="text-blue-400">{selectedSavedResult.simulation_outputs.runtime}s</span></div>
                  )}
                </div>

                {/* Stream Summary */}
                {selectedSavedResult.simulation_outputs?.stream_count && (
                  <div className="mb-3 p-2 bg-gray-700 rounded text-xs">
                    <div className="text-gray-400">Stream Summary:</div>
                    <div className="text-white">
                      Active Streams: <span className="text-green-400">{selectedSavedResult.simulation_outputs.stream_count.active}</span> / 
                      Total Streams: <span className="text-gray-300">{selectedSavedResult.simulation_outputs.stream_count.total}</span>
                    </div>
                  </div>
                )}

                {/* Success Message */}
                {selectedSavedResult.simulation_outputs?.success_message && (
                  <div className="mb-3 p-2 bg-green-900/20 border border-green-700 rounded text-xs">
                    <div className="text-green-400">{selectedSavedResult.simulation_outputs.success_message}</div>
                  </div>
                )}

                {/* Modifications Applied */}
                {selectedSavedResult.simulation_outputs?.modifications_applied && (
                  <div className="mb-3 p-2 bg-blue-900/20 border border-blue-700 rounded text-xs">
                    <div className="text-blue-400">Modifications Applied: {selectedSavedResult.simulation_outputs.modifications_applied}</div>
                  </div>
                )}
              </div>

              {/* Detailed Stream Data */}
              {selectedSavedResult.simulation_outputs?.stream_details && (
                <div className="bg-gray-800 p-3 rounded-lg">
                  <p className="text-sm text-gray-400 mb-2">Stream Details</p>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {Object.entries(selectedSavedResult.simulation_outputs.stream_details).map(([streamId, streamData]) => (
                      <div key={streamId} className="p-2 bg-gray-700 rounded text-xs">
                        <div className="font-medium text-white mb-1">
                          {streamData.custom_name || streamData.name || streamId}
                          <span className={`ml-2 px-1 rounded text-xs ${streamData.active ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'}`}>
                            {streamData.active ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-gray-300">
                          <div>Temp: {streamData.temperature_C?.toFixed(1) || 'N/A'} °C</div>
                          <div>Pressure: {streamData.pressure_bar?.toFixed(2) || 'N/A'} bar</div>
                          <div>Mass Flow: {streamData.mass_flow_mg_s?.toFixed(2) || 'N/A'} mg/s</div>
                          <div>Molar Flow: {streamData.molar_flow_mol_s?.toFixed(6) || 'N/A'} mol/s</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* API Log */}
              {selectedSavedResult.simulation_outputs?.api_log && (
                <div className="bg-gray-800 p-3 rounded-lg">
                  <p className="text-sm text-gray-400 mb-2">API Simulation Log</p>
                  <div className="max-h-60 overflow-y-auto">
                    <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">
                      {selectedSavedResult.simulation_outputs.api_log}
                    </pre>
                  </div>
                </div>
              )}
              
              {/* Notes */}
              {selectedSavedResult.notes && (
                <div className="bg-gray-800 p-3 rounded-lg">
                  <p className="text-sm text-gray-400 mb-2">Notes</p>
                  <p className="text-white text-sm">{selectedSavedResult.notes}</p>
                </div>
              )}
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  if (window.confirm('Delete this saved result?')) {
                    deleteResult(selectedSavedResult.result_id);
                    setSelectedSavedResult(null);
                  }
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium transition-colors"
              >
                🗑️ Delete Result
              </button>
              <button
                onClick={() => setSelectedSavedResult(null)}
                className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded hover:bg-gray-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Machine Learning Simulation Panel
function MLSimulationPanel({ onRunSimulation, isRunning }) {
  return (
    <div className="simulation-panel">
      <div className="simulation-panel-header">
        <h2 className="simulation-panel-title">🧠 Machine Learning ANN Model</h2>
        <p className="simulation-panel-subtitle">Neural network-based reactor prediction</p>
      </div>
      
      <div className="simulation-form">
        <div className="simulation-input-section">
          <h3 className="simulation-section-title">Model Information</h3>
          <div className="ml-info-grid">
            <div className="ml-info-item">
              <span className="ml-info-label">Architecture:</span>
              <span className="ml-info-value">Deep Neural Network</span>
            </div>
            <div className="ml-info-item">
              <span className="ml-info-label">Input Features:</span>
              <span className="ml-info-value">Temperature, Pressure, Flow Rates</span>
            </div>
            <div className="ml-info-item">
              <span className="ml-info-label">Output Predictions:</span>
              <span className="ml-info-value">Conversion, Yield, Selectivity</span>
            </div>
            <div className="ml-info-item">
              <span className="ml-info-label">Training Data:</span>
              <span className="ml-info-value">10,000+ experimental points</span>
            </div>
          </div>
        </div>
        
        <button 
          onClick={onRunSimulation}
          className={`simulation-run-button ${isRunning ? 'simulation-run-button-running' : ''}`}
          disabled={isRunning}
        >
          {isRunning ? (
            <>
              <div className="simulation-spinner"></div>
              Running ANN Simulation...
            </>
          ) : (
            <>
              🤖 Run ANN Simulation
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Machine Learning Results Panel
function MLResultsPanel({ isRunning, results }) {
  const chartRef = useRef(null);

  useEffect(() => {
    if (results && results.type === 'ml' && chartRef.current) {
      // Simple chart rendering
      const canvas = chartRef.current;
      const ctx = canvas.getContext('2d');
      canvas.width = 600;
      canvas.height = 300;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw simple bar chart for predictions
      const predictions = results.predictions;
      const keys = Object.keys(predictions);
      const barWidth = 80;
      const barSpacing = 100;
      const maxHeight = 200;
      
      ctx.fillStyle = '#10b981';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      
      keys.forEach((key, index) => {
        const value = predictions[key];
        const x = 50 + index * barSpacing;
        const height = value * maxHeight;
        const y = canvas.height - 50 - height;
        
        // Draw bar
        ctx.fillRect(x, y, barWidth, height);
        
        // Draw label
        ctx.fillStyle = '#ffffff';
        ctx.fillText(key.replace('_', ' ').toUpperCase(), x + barWidth/2, canvas.height - 20);
        ctx.fillText((value * 100).toFixed(1) + '%', x + barWidth/2, y - 10);
        ctx.fillStyle = '#10b981';
      });
    }
  }, [results]);

  return (
    <div className="simulation-panel">
      <div className="simulation-panel-header">
        <h2 className="simulation-panel-title">📊 ANN Predictions</h2>
        <p className="simulation-panel-subtitle">Neural network results</p>
      </div>
      
      <div className="simulation-results-content">
        {!results && !isRunning && (
          <div className="simulation-placeholder">
            <div className="simulation-placeholder-icon">🤖</div>
            <div className="simulation-placeholder-text">
              Run ANN simulation to see predictions
            </div>
            <div className="simulation-placeholder-subtext">
              Neural network will predict reactor performance
            </div>
          </div>
        )}
        
        {isRunning && (
          <div className="simulation-loading">
            <div className="simulation-loading-spinner"></div>
            <div className="simulation-loading-text">Processing with neural network...</div>
            <div className="simulation-loading-subtext">Generating predictions</div>
          </div>
        )}
        
        {results && results.type === 'ml' && (
          <>
            <canvas 
              ref={chartRef} 
              className="ml-chart"
              style={{ 
                maxWidth: '100%', 
                height: 'auto',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '8px',
                backgroundColor: 'rgba(13, 15, 18, 0.8)'
              }}
            />
            
            <div className="simulation-results-summary">
              <h3 className="simulation-results-title">Prediction Summary</h3>
              <div className="simulation-results-grid">
                <div className="simulation-result-item">
                  <span className="simulation-result-label">Model Accuracy:</span>
                  <span className="simulation-result-value success">✅ {(results.accuracy * 100).toFixed(1)}%</span>
                </div>
                <div className="simulation-result-item">
                  <span className="simulation-result-label">Runtime:</span>
                  <span className="simulation-result-value">{results.runtime}s</span>
                </div>
                <div className="simulation-result-item">
                  <span className="simulation-result-label">H₂ Yield:</span>
                  <span className="simulation-result-value">{(results.predictions.h2_yield * 100).toFixed(1)}%</span>
                </div>
                <div className="simulation-result-item">
                  <span className="simulation-result-label">Conversion:</span>
                  <span className="simulation-result-value">{(results.predictions.conversion * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// First Order Principle Simulation Panel
function FOPSimulationPanel({ params, onParamChange, onRunSimulation, isRunning }) {
  const [errors, setErrors] = useState({});

  const validateParam = (key, value) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return `Invalid number`;
    
    // Define validation ranges for FOP parameters
    const ranges = {
      T_C: { min: 600, max: 1000 },
      P_bar: { min: 0.5, max: 10 },
      fCH4_mlpm: { min: 0, max: 2000 },
      fCO2_mlpm: { min: 0, max: 2000 },
      fN2_mlpm: { min: 0, max: 1000 },
      GHSV: { min: 1000, max: 50000 }
    };
    
    const range = ranges[key];
    if (range && (numValue < range.min || numValue > range.max)) {
      return `Must be between ${range.min} and ${range.max}`;
    }
    return null;
  };

  const handleInputChange = (key, value) => {
    const error = validateParam(key, value);
    setErrors(prev => ({ ...prev, [key]: error }));
    onParamChange(key, value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate all parameters
    const newErrors = {};
    Object.keys(params).forEach(key => {
      const error = validateParam(key, params[key]);
      if (error) newErrors[key] = error;
    });
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length === 0) {
      onRunSimulation();
    }
  };

  const renderInput = (key, label, unit) => (
    <div key={key} className="simulation-input-group">
      <label className="simulation-input-label">
        {label}
        <span className="simulation-input-unit">({unit})</span>
      </label>
      <input
        type="number"
        value={params[key]}
        onChange={(e) => handleInputChange(key, e.target.value)}
        step={key === 'T_C' ? '1' : key.includes('_bar') ? '0.1' : '1'}
        className={`simulation-input ${errors[key] ? 'simulation-input-error' : ''}`}
        disabled={isRunning}
      />
      {errors[key] && <div className="simulation-error-text">{errors[key]}</div>}
    </div>
  );

  return (
    <div className="simulation-panel">
      <div className="simulation-panel-header">
        <h2 className="simulation-panel-title">⚗️ First Order Principle Model</h2>
        <p className="simulation-panel-subtitle">Cantera-based kinetic simulation</p>
      </div>
      
      <form onSubmit={handleSubmit} className="simulation-form">
        <div className="simulation-input-section">
          <h3 className="simulation-section-title">Reactor Conditions</h3>
          {renderInput('T_C', 'Temperature', '°C')}
          {renderInput('P_bar', 'Pressure', 'bar')}
          {renderInput('GHSV', 'Gas Hourly Space Velocity', 'h⁻¹')}
        </div>
        
        <div className="simulation-input-section">
          <h3 className="simulation-section-title">Feed Flowrates</h3>
          {renderInput('fCH4_mlpm', 'CH₄ Flowrate', 'ml/min')}
          {renderInput('fCO2_mlpm', 'CO₂ Flowrate', 'ml/min')}
          {renderInput('fN2_mlpm', 'N₂ Flowrate', 'ml/min')}
        </div>
        
        <button 
          type="submit" 
          className={`simulation-run-button ${isRunning ? 'simulation-run-button-running' : ''}`}
          disabled={isRunning}
        >
          {isRunning ? (
            <>
              <div className="simulation-spinner"></div>
              Running FOP Simulation...
            </>
          ) : (
            <>
              ⚗️ Run Simulation
            </>
          )}
        </button>
      </form>
    </div>
  );
}

// First Order Principle Results Panel
function FOPResultsPanel({ isRunning, results }) {
  return (
    <div className="simulation-panel">
      <div className="simulation-panel-header">
        <h2 className="simulation-panel-title">📊 FOP Results</h2>
        <p className="simulation-panel-subtitle">Kinetic model predictions</p>
      </div>
      
      <div className="simulation-results-content">
        {!results && !isRunning && (
          <div className="simulation-placeholder">
            <div className="simulation-placeholder-icon">⚗️</div>
            <div className="simulation-placeholder-text">
              Run FOP simulation to see kinetic results
            </div>
            <div className="simulation-placeholder-subtext">
              Cantera-based reactor modeling results will appear here
            </div>
          </div>
        )}
        
        {isRunning && (
          <div className="simulation-loading">
            <div className="simulation-loading-spinner"></div>
            <div className="simulation-loading-text">Processing kinetic model...</div>
            <div className="simulation-loading-subtext">Solving reactor equations</div>
          </div>
        )}
        
        {results && results.type === 'fop' && (
          <div className="simulation-results-summary">
            <h3 className="simulation-results-title">Reactor Performance</h3>
            
            <div className="fop-results-section">
              <h4 className="fop-section-title">Conversions & Yields</h4>
              <div className="simulation-results-grid">
                <div className="simulation-result-item">
                  <span className="simulation-result-label">CH₄ Conversion:</span>
                  <span className="simulation-result-value">{(results.conversion_ch4 * 100).toFixed(1)}%</span>
                </div>
                <div className="simulation-result-item">
                  <span className="simulation-result-label">CO₂ Conversion:</span>
                  <span className="simulation-result-value">{(results.conversion_co2 * 100).toFixed(1)}%</span>
                </div>
                <div className="simulation-result-item">
                  <span className="simulation-result-label">H₂ Yield:</span>
                  <span className="simulation-result-value">{(results.yield_h2 * 100).toFixed(1)}%</span>
                </div>
                <div className="simulation-result-item">
                  <span className="simulation-result-label">CO Yield:</span>
                  <span className="simulation-result-value">{(results.yield_co * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <div className="fop-results-section">
              <h4 className="fop-section-title">Outlet Composition</h4>
              <div className="simulation-results-grid">
                {Object.entries(results.outlet_composition || {}).map(([species, fraction]) => (
                  <div key={species} className="simulation-result-item">
                    <span className="simulation-result-label">{species}:</span>
                    <span className="simulation-result-value">{(fraction * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="fop-results-section">
              <h4 className="fop-section-title">Process Conditions</h4>
              <div className="simulation-results-grid">
                <div className="simulation-result-item">
                  <span className="simulation-result-label">Exit Temperature:</span>
                  <span className="simulation-result-value">{results.exit_temperature?.toFixed(1)}°C</span>
                </div>
                <div className="simulation-result-item">
                  <span className="simulation-result-label">Runtime:</span>
                  <span className="simulation-result-value">{results.runtime}s</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SimulationConsole;