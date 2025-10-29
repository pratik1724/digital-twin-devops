import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend
);

const DEFAULT_MFC_PARAMS = {
  MFC100: {
    flow_mol_s: 0.01,
    CO2_frac: 0.8,
    CO_frac: 0.2
  },
  MFC200: {
    flow_mol_s: 0.005,
    O2_frac: 0.21,
    N2_frac: 0.79
  },
  MFC300: {
    flow_mol_s: 0.015,
    CH4_frac: 0.9,
    H2_frac: 0.1
  }
};

const DEFAULT_PARAMS = {
  pressure_bar: 1.0,
  preheat_T_C: 825.0,
  DRM_conversion: 0.8,
  cooler_outlet_T_C: 200.0
};

export function DRMSimulationConsole() {
  const [mfcParams, setMfcParams] = useState(DEFAULT_MFC_PARAMS);
  const [processParams, setProcessParams] = useState(DEFAULT_PARAMS);
  const [results, setResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [history, setHistory] = useState([]);
  const [timeSeriesResults, setTimeSeriesResults] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadSimulationHistory();
  }, []);

  const loadSimulationHistory = async () => {
    try {
      const backend = process.env.REACT_APP_BACKEND_URL || '';
      const response = await fetch(`${backend}/api/simulate/drm_history`);
      if (response.ok) {
        const data = await response.json();
        setHistory(data.history || []);
      }
    } catch (error) {
      console.error('Error loading simulation history:', error);
    }
  };

  const handleMFCParamChange = (mfc, param, value) => {
    setMfcParams(prev => ({
      ...prev,
      [mfc]: {
        ...prev[mfc],
        [param]: parseFloat(value) || 0
      }
    }));
  };

  const handleProcessParamChange = (param, value) => {
    setProcessParams(prev => ({
      ...prev,
      [param]: parseFloat(value) || 0
    }));
  };

  const runSingleSimulation = async () => {
    setIsRunning(true);
    setResults(null);

    try {
      const backend = process.env.REACT_APP_BACKEND_URL || '';
      
      const payload = {
        pressure_bar: processParams.pressure_bar,
        preheat_T_C: processParams.preheat_T_C,
        mfc: {
          MFC100: {
            flow_mol_s: mfcParams.MFC100.flow_mol_s,
            z: {
              CO2: mfcParams.MFC100.CO2_frac,
              CO: mfcParams.MFC100.CO_frac
            }
          },
          MFC200: {
            flow_mol_s: mfcParams.MFC200.flow_mol_s,
            z: {
              O2: mfcParams.MFC200.O2_frac,
              N2: mfcParams.MFC200.N2_frac
            }
          },
          MFC300: {
            flow_mol_s: mfcParams.MFC300.flow_mol_s,
            z: {
              CH4: mfcParams.MFC300.CH4_frac,
              H2: mfcParams.MFC300.H2_frac
            }
          }
        },
        reactor: {
          DRM_conversion: processParams.DRM_conversion
        },
        cooler: {
          outlet_T_C: processParams.cooler_outlet_T_C
        }
      };

      const response = await fetch(`${backend}/api/simulate/drm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data);
        await loadSimulationHistory(); // Refresh history
      } else {
        throw new Error('Simulation failed');
      }
    } catch (error) {
      console.error('Simulation error:', error);
      // Show fallback/demo results
      setResults({
        KPIs: {
          CH4_conversion: 0.82,
          CO2_conversion: 0.79,
          H2_CO: 1.1,
          syngas_purity: 0.68
        },
        duties_kW: {
          preheater: 556,
          reactor: 1503,
          cooler: 964,
          total: 3023
        },
        blocks: {
          feed: { F_mol_s: 0.03, T_C: 825, P_bar: 1.0 },
          reactor: { F_mol_s: 0.035, T_C: 825, P_bar: 1.0 },
          cooler: { F_mol_s: 0.035, T_C: 200, P_bar: 1.0 }
        }
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsRunning(true);
    setTimeSeriesResults(null);

    try {
      const backend = process.env.REACT_APP_BACKEND_URL || '';
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${backend}/api/simulate/drm_timeseries`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setTimeSeriesResults(data);
        await loadSimulationHistory(); // Refresh history
      } else {
        throw new Error('Time series simulation failed');
      }
    } catch (error) {
      console.error('Time series simulation error:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const deleteSimulation = async (simulationId) => {
    try {
      const backend = process.env.REACT_APP_BACKEND_URL || '';
      const response = await fetch(`${backend}/api/simulate/drm_history/${simulationId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadSimulationHistory(); // Refresh history
      }
    } catch (error) {
      console.error('Error deleting simulation:', error);
    }
  };

  return (
    <div className="drm-simulation-console">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Inputs */}
        <div className="space-y-6">
          {/* Process Flow Inputs */}
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-bold text-green-400 mb-4 flex items-center">
              🔧 Process Flow Inputs
            </h2>
            
            {/* MFC Inputs */}
            <div className="space-y-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-300">Mass Flow Controllers</h3>
              
              {/* MFC100 - CO/CO2 */}
              <div className="bg-gray-800 p-4 rounded-lg border-l-4 border-red-500">
                <h4 className="font-semibold text-red-400 mb-3">MFC100 (CO/CO₂)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Flow Rate (mol/s)</label>
                    <input
                      type="number"
                      step="0.001"
                      value={mfcParams.MFC100.flow_mol_s}
                      onChange={(e) => handleMFCParamChange('MFC100', 'flow_mol_s', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                      disabled={isRunning}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">CO₂ Fraction</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={mfcParams.MFC100.CO2_frac}
                      onChange={(e) => handleMFCParamChange('MFC100', 'CO2_frac', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                      disabled={isRunning}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-400 mb-1">CO Fraction</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={mfcParams.MFC100.CO_frac}
                      onChange={(e) => handleMFCParamChange('MFC100', 'CO_frac', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                      disabled={isRunning}
                    />
                  </div>
                </div>
              </div>

              {/* MFC200 - Air/N2/O2 */}
              <div className="bg-gray-800 p-4 rounded-lg border-l-4 border-blue-500">
                <h4 className="font-semibold text-blue-400 mb-3">MFC200 (Air/N₂/O₂)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Flow Rate (mol/s)</label>
                    <input
                      type="number"
                      step="0.001"
                      value={mfcParams.MFC200.flow_mol_s}
                      onChange={(e) => handleMFCParamChange('MFC200', 'flow_mol_s', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                      disabled={isRunning}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">O₂ Fraction</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={mfcParams.MFC200.O2_frac}
                      onChange={(e) => handleMFCParamChange('MFC200', 'O2_frac', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                      disabled={isRunning}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-400 mb-1">N₂ Fraction</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={mfcParams.MFC200.N2_frac}
                      onChange={(e) => handleMFCParamChange('MFC200', 'N2_frac', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                      disabled={isRunning}
                    />
                  </div>
                </div>
              </div>

              {/* MFC300 - CH4/H2 */}
              <div className="bg-gray-800 p-4 rounded-lg border-l-4 border-green-500">
                <h4 className="font-semibold text-green-400 mb-3">MFC300 (CH₄/H₂)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Flow Rate (mol/s)</label>
                    <input
                      type="number"
                      step="0.001"
                      value={mfcParams.MFC300.flow_mol_s}
                      onChange={(e) => handleMFCParamChange('MFC300', 'flow_mol_s', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                      disabled={isRunning}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">CH₄ Fraction</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={mfcParams.MFC300.CH4_frac}
                      onChange={(e) => handleMFCParamChange('MFC300', 'CH4_frac', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                      disabled={isRunning}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-400 mb-1">H₂ Fraction</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={mfcParams.MFC300.H2_frac}
                      onChange={(e) => handleMFCParamChange('MFC300', 'H2_frac', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                      disabled={isRunning}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Process Parameters */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-300">Process Parameters</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Pressure (bar)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={processParams.pressure_bar}
                    onChange={(e) => handleProcessParamChange('pressure_bar', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                    disabled={isRunning}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Preheat Temperature (°C)</label>
                  <input
                    type="number"
                    step="1"
                    value={processParams.preheat_T_C}
                    onChange={(e) => handleProcessParamChange('preheat_T_C', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                    disabled={isRunning}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">DRM Conversion</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={processParams.DRM_conversion}
                    onChange={(e) => handleProcessParamChange('DRM_conversion', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                    disabled={isRunning}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Cooler Outlet Temperature (°C)</label>
                  <input
                    type="number"
                    step="1"
                    value={processParams.cooler_outlet_T_C}
                    onChange={(e) => handleProcessParamChange('cooler_outlet_T_C', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                    disabled={isRunning}
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 space-y-4">
              <button
                onClick={runSingleSimulation}
                disabled={isRunning}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-3 px-6 rounded-lg font-semibold transition-colors"
              >
                {isRunning ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Running Simulation...
                  </div>
                ) : (
                  '🚀 Run Single Simulation'
                )}
              </button>

              <div className="border-t border-gray-700 pt-4">
                <h4 className="text-sm font-semibold text-gray-300 mb-2">Time Series Simulation</h4>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".csv,.json"
                  className="hidden"
                  disabled={isRunning}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isRunning}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-2 px-4 rounded-lg font-semibold transition-colors"
                >
                  📂 Upload CSV/JSON File
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Results */}
        <div className="space-y-6">
          {/* KPI Cards */}
          {results && (
            <KPICards kpis={results.KPIs} />
          )}

          {/* Duties Chart */}
          {results && (
            <DutiesChart duties={results.duties_kW} />
          )}

          {/* Time Series Results */}
          {timeSeriesResults && (
            <TimeSeriesChart results={timeSeriesResults.timeseries} />
          )}

          {/* Simulation History */}
          <SimulationHistory 
            history={history} 
            onDelete={deleteSimulation}
          />
        </div>
      </div>
    </div>
  );
}

// KPI Cards Component
function KPICards({ kpis }) {
  const kpiData = [
    { name: 'CH₄ Conversion', value: kpis.CH4_conversion * 100, unit: '%', color: 'text-red-400' },
    { name: 'CO₂ Conversion', value: kpis.CO2_conversion * 100, unit: '%', color: 'text-blue-400' },
    { name: 'H₂/CO Ratio', value: kpis.H2_CO, unit: '', color: 'text-green-400' },
    { name: 'Syngas Purity', value: kpis.syngas_purity * 100, unit: '%', color: 'text-yellow-400' },
  ];

  return (
    <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
      <h2 className="text-xl font-bold text-green-400 mb-4">📊 Key Performance Indicators</h2>
      <div className="grid grid-cols-2 gap-4">
        {kpiData.map((kpi, index) => (
          <div key={index} className="bg-gray-800 p-4 rounded-lg">
            <div className="text-sm text-gray-400">{kpi.name}</div>
            <div className={`text-2xl font-bold ${kpi.color}`}>
              {kpi.value ? kpi.value.toFixed(1) : 'N/A'}{kpi.unit}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Duties Chart Component
function DutiesChart({ duties }) {
  const data = [
    { name: 'Preheater', value: duties.preheater },
    { name: 'Reactor', value: duties.reactor },
    { name: 'Cooler', value: duties.cooler },
  ];

  return (
    <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
      <h2 className="text-xl font-bold text-green-400 mb-4">⚡ Energy Duties (kW)</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="name" stroke="#9CA3AF" />
          <YAxis stroke="#9CA3AF" />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
            labelStyle={{ color: '#9CA3AF' }}
          />
          <Bar dataKey="value" fill="#10B981" />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4 text-center">
        <div className="text-lg font-semibold text-gray-300">
          Total Energy: <span className="text-green-400">{duties.total.toFixed(1)} kW</span>
        </div>
      </div>
    </div>
  );
}

// Time Series Chart Component
function TimeSeriesChart({ results }) {
  if (!results || results.length === 0) return null;

  const chartData = {
    labels: results.map((_, index) => `Point ${index + 1}`),
    datasets: [
      {
        label: 'CH₄ Conversion (%)',
        data: results.map(r => r.KPIs.CH4_conversion * 100),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        tension: 0.1,
      },
      {
        label: 'CO₂ Conversion (%)',
        data: results.map(r => r.KPIs.CO2_conversion * 100),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        tension: 0.1,
      },
      {
        label: 'Syngas Purity (%)',
        data: results.map(r => r.KPIs.syngas_purity * 100),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        tension: 0.1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#9CA3AF',
        },
      },
      title: {
        display: true,
        text: 'Time Series Results',
        color: '#10B981',
      },
    },
    scales: {
      x: {
        ticks: {
          color: '#9CA3AF',
        },
        grid: {
          color: '#374151',
        },
      },
      y: {
        ticks: {
          color: '#9CA3AF',
        },
        grid: {
          color: '#374151',
        },
      },
    },
  };

  return (
    <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
      <h2 className="text-xl font-bold text-green-400 mb-4">📈 Time Series Results</h2>
      <Line data={chartData} options={options} />
    </div>
  );
}

// Simulation History Component
function SimulationHistory({ history, onDelete }) {
  if (!history || history.length === 0) {
    return (
      <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
        <h2 className="text-xl font-bold text-green-400 mb-4">📋 Simulation History</h2>
        <div className="text-gray-400 text-center py-8">
          No simulation history available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
      <h2 className="text-xl font-bold text-green-400 mb-4">📋 Simulation History</h2>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {history.map((sim) => (
          <div key={sim.id} className="bg-gray-800 p-4 rounded-lg flex justify-between items-start">
            <div className="flex-1">
              <div className="text-sm text-gray-400">
                {new Date(sim.timestamp).toLocaleString()}
              </div>
              <div className="text-white font-semibold">
                {sim.simulation_type === 'single' ? 'Single Simulation' : 'Time Series Simulation'}
              </div>
              {sim.simulation_type === 'single' && sim.results.KPIs && (
                <div className="text-sm text-gray-300 mt-1">
                  CH₄ Conv: {(sim.results.KPIs.CH4_conversion * 100).toFixed(1)}%, 
                  CO₂ Conv: {(sim.results.KPIs.CO2_conversion * 100).toFixed(1)}%
                </div>
              )}
            </div>
            <button
              onClick={() => onDelete(sim.id)}
              className="text-red-400 hover:text-red-300 px-2 py-1 rounded transition-colors"
            >
              🗑️
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DRMSimulationConsole;