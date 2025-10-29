import React, { useState, useEffect } from 'react';
import { 
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

// Available gases for selection
const AVAILABLE_GASES = ['CO2', 'CO', 'O2', 'N2', 'CH4', 'H2', 'Ar', 'He'];

// Mock data for demonstration
const mockMFCData = {
  MFC100: { pv: 0.1, sv: 0.0, gases: [{ name: 'CO2', z: 0.8 }, { name: 'CO', z: 0.2 }] },
  MFC200: { pv: 0.1, sv: 0.0, gases: [{ name: 'O2', z: 0.21 }, { name: 'N2', z: 0.79 }] },
  MFC300: { pv: 10.0, sv: 0.0, gases: [{ name: 'CH4', z: 0.9 }, { name: 'H2', z: 0.1 }] }
};

const mockKPIData = {
  ch4_conversion: 82.5,
  co2_conversion: 79.2,
  h2_co_ratio: 1.1,
  syngas_purity: 68.3
};

const mockTimeSeriesData = [
  { time: 0, ch4_conv: 75, co2_conv: 72, h2_co: 1.0 },
  { time: 60, ch4_conv: 78, co2_conv: 75, h2_co: 1.05 },
  { time: 120, ch4_conv: 82, co2_conv: 79, h2_co: 1.1 },
  { time: 180, ch4_conv: 85, co2_conv: 82, h2_co: 1.15 },
  { time: 240, ch4_conv: 82, co2_conv: 79, h2_co: 1.1 },
];

export function IndustrialDRMSimulation() {
  const [isRunning, setIsRunning] = useState(false);
  const [simulationData, setSimulationData] = useState(null);
  const [mfcData, setMfcData] = useState(mockMFCData);
  const [processParams, setProcessParams] = useState({
    pressure_bar: 1.0,
    preheat_T_C: 825.0,
    DRM_conversion: 0.8,
    cooler_outlet_T_C: 200.0
  });

  const handleRunSimulation = () => {
    setIsRunning(true);
    // Simulate processing time
    setTimeout(() => {
      setSimulationData({
        ...mockKPIData,
        timestamp: new Date().toLocaleString()
      });
      setIsRunning(false);
    }, 3000);
  };

  const updateMFCFlow = (mfcId, value) => {
    setMfcData(prev => ({
      ...prev,
      [mfcId]: {
        ...prev[mfcId],
        pv: parseFloat(value) || 0
      }
    }));
  };

  const updateMFCGas = (mfcId, gasIndex, field, value) => {
    setMfcData(prev => {
      const newGases = [...prev[mfcId].gases];
      if (field === 'name') {
        newGases[gasIndex] = { ...newGases[gasIndex], name: value };
      } else if (field === 'z') {
        newGases[gasIndex] = { ...newGases[gasIndex], z: parseFloat(value) || 0 };
      }
      
      return {
        ...prev,
        [mfcId]: {
          ...prev[mfcId],
          gases: newGases
        }
      };
    });
  };

  const addGasToMFC = (mfcId) => {
    setMfcData(prev => ({
      ...prev,
      [mfcId]: {
        ...prev[mfcId],
        gases: [...prev[mfcId].gases, { name: 'CO2', z: 0.0 }]
      }
    }));
  };

  const removeGasFromMFC = (mfcId, gasIndex) => {
    if (mfcData[mfcId].gases.length <= 1) return;
    
    setMfcData(prev => ({
      ...prev,
      [mfcId]: {
        ...prev[mfcId],
        gases: prev[mfcId].gases.filter((_, index) => index !== gasIndex)
      }
    }));
  };

  return (
    <div style={{
      width: '100%',
      minHeight: '150vh', // Increased to ensure content extends beyond viewport
      backgroundColor: '#f5f7fa',
      color: '#2c3e50',
      fontFamily: 'Inter, Arial, sans-serif',
      padding: '20px',
      paddingBottom: '100px' // Add extra padding at bottom for scrolling
    }}>
      {/* Main P&ID Diagram Area */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e1e5e9',
        borderRadius: '8px',
        padding: '30px',
        position: 'relative',
        overflow: 'visible',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        marginRight: '320px',
        minHeight: '1200px' // Increased height to ensure scrollable content
      }}>
        <ProcessSchematicDiagram 
          isRunning={isRunning} 
          mfcData={mfcData}
          simulationData={simulationData}
          onMFCFlowChange={updateMFCFlow}
          onMFCGasChange={updateMFCGas}
          onAddGas={addGasToMFC}
          onRemoveGas={removeGasFromMFC}
          processParams={processParams}
          setProcessParams={setProcessParams}
        />
      </div>

      {/* Right Side Panel - Only Trends */}
      <div style={{
        position: 'absolute',
        right: '20px',
        top: '20px',
        width: '280px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <TrendsPanel />
      </div>

      {/* Run Simulation Button */}
      <div style={{
        position: 'fixed',
        bottom: '30px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000
      }}>
        <button 
          style={{
            backgroundColor: isRunning ? '#f39c12' : '#27ae60',
            color: 'white',
            border: 'none',
            padding: '14px 32px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: isRunning ? 'not-allowed' : 'pointer',
            opacity: isRunning ? 0.8 : 1,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            transition: 'all 0.2s ease'
          }}
          onClick={handleRunSimulation}
          disabled={isRunning}
        >
          {isRunning ? 'RUNNING SIMULATION...' : 'RUN SIMULATION'}
        </button>
      </div>
    </div>
  );
}

// Process Schematic Diagram Component
function ProcessSchematicDiagram({ isRunning, mfcData, simulationData, onMFCFlowChange, onMFCGasChange, onAddGas, onRemoveGas, processParams, setProcessParams }) {
  return (
    <div style={{
      width: '100%',
      height: '1200px', // Increased height significantly to enable scrolling
      position: 'relative',
      backgroundColor: '#f5f7fa'
    }}>
      {/* Left Side - Compact MFC Section */}
      <div style={{
        position: 'absolute',
        left: '40px',
        top: '40px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{
          color: '#0891b2',
          fontSize: '16px',
          fontWeight: '600',
          marginBottom: '12px'
        }}>
          Mass Flow Controllers
        </div>
        
        {Object.entries(mfcData).map(([mfcId, data], index) => (
          <CompactMFCUnit 
            key={mfcId}
            id={mfcId} 
            data={data}
            yPos={60 + index * 100}
            onFlowChange={(value) => onMFCFlowChange(mfcId, value)}
            onGasChange={(gasIndex, field, value) => onMFCGasChange(mfcId, gasIndex, field, value)}
            onAddGas={() => onAddGas(mfcId)}
            onRemoveGas={(gasIndex) => onRemoveGas(mfcId, gasIndex)}
          />
        ))}
      </div>

      {/* Preheater Section */}
      <div style={{
        position: 'absolute',
        left: '400px',
        top: '120px'
      }}>
        {/* TIC Controllers above preheater */}
        <div style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '20px',
          marginLeft: '15px'
        }}>
          <TICUnit id="TIC600" pv="24" sv="0" />
          <TICUnit id="TIC601" pv="24" sv="0" />
          <TICUnit id="TIC602" pv="24" sv="0" />
          <TICUnit id="TIC603" pv="24" sv="0" />
        </div>
        
        {/* Preheater Unit */}
        <div style={{
          width: '110px',
          height: '140px',
          backgroundColor: '#e74c3c',
          border: '2px solid #2c3e50',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <div style={{ 
            fontSize: '24px', 
            marginBottom: '12px',
            color: 'white'
          }}>⚡</div>
          <div style={{ 
            fontSize: '12px', 
            fontWeight: '600',
            backgroundColor: '#2c3e50',
            color: 'white',
            padding: '6px 12px',
            borderRadius: '4px'
          }}>Preheater</div>
        </div>
      </div>

      {/* Reactor Section */}
      <div style={{
        position: 'absolute',
        left: '580px',
        top: '100px'
      }}>
        {/* Sensor Tags on the left */}
        <div style={{
          position: 'absolute',
          left: '-70px',
          top: '50px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px'
        }}>
          <SensorTag id="TSS500" />
          <SensorTag id="TSS501" />
          <SensorTag id="TSS502" />
          <SensorTag id="TI500" />
        </div>
        
        {/* Reactor Vessel */}
        <div style={{
          width: '90px',
          height: '180px',
          background: isRunning 
            ? 'linear-gradient(180deg, #ff6b47 0%, #ff8c00 30%, #ff4500 70%, #ff6b47 100%)'
            : 'linear-gradient(180deg, #94a3b8 0%, #cbd5e1 30%, #e2e8f0 70%, #94a3b8 100%)',
          border: '2px solid #2c3e50',
          borderRadius: '12px',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isRunning ? '0 0 20px rgba(255,107,71,0.4)' : '0 4px 12px rgba(0,0,0,0.1)',
          transition: 'all 0.3s ease'
        }}>
          <div style={{
            position: 'absolute',
            bottom: '15px',
            fontSize: '12px',
            fontWeight: '600',
            backgroundColor: '#2c3e50',
            color: 'white',
            padding: '6px 12px',
            borderRadius: '4px'
          }}>Reactor</div>
          
          {/* Reactor internals - catalyst bed pattern */}
          <div style={{
            width: '85%',
            height: '85%',
            background: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.2), rgba(255,255,255,0.2) 3px, transparent 3px, transparent 8px)',
            borderRadius: '6px',
            border: '1px solid rgba(255,255,255,0.3)'
          }}></div>
        </div>

        {/* Right side TIC controllers */}
        <div style={{
          position: 'absolute',
          right: '-90px',
          top: '70px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px'
        }}>
          <TICUnit id="TIC500" pv="25" sv="0" />
          <TICUnit id="TIC501" pv="25" sv="0" />
          <TICUnit id="TIC502" pv="25" sv="0" />
        </div>
      </div>

      {/* Additional sections to create scrollable content */}
      <div style={{
        position: 'absolute',
        left: '40px',
        bottom: '300px', // Moved higher to ensure it's within the container
        right: '340px'
      }}>
        <div style={{
          backgroundColor: 'rgba(255,255,255,0.9)',
          border: '1px solid #0891b2',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <h3 style={{ color: '#0891b2', marginBottom: '15px' }}>Process Parameters</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', color: '#2c3e50', fontSize: '12px' }}>Pressure (bar)</label>
              <input type="number" value={processParams.pressure_bar} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #e1e5e9' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', color: '#2c3e50', fontSize: '12px' }}>Temperature (°C)</label>
              <input type="number" value={processParams.preheat_T_C} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #e1e5e9' }} />
            </div>
          </div>
        </div>

        {/* Simulation Results Section */}
        {simulationData && (
          <div style={{
            backgroundColor: 'rgba(255,255,255,0.95)',
            border: '1px solid #27ae60',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <h3 style={{ color: '#27ae60', marginBottom: '15px' }}>Simulation Results</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
              <div>
                <div style={{ color: '#64748b', fontSize: '12px' }}>CH₄ Conversion</div>
                <div style={{ color: '#2c3e50', fontWeight: '600' }}>{simulationData.ch4_conversion}%</div>
              </div>
              <div>
                <div style={{ color: '#64748b', fontSize: '12px' }}>CO₂ Conversion</div>
                <div style={{ color: '#2c3e50', fontWeight: '600' }}>{simulationData.co2_conversion}%</div>
              </div>
            </div>
            <div style={{ marginTop: '10px', fontSize: '11px', color: '#64748b' }}>
              Completed at: {simulationData.timestamp}
            </div>
          </div>
        )}
        
        {/* Extra content to ensure scrolling */}
        <div style={{
          backgroundColor: 'rgba(255,255,255,0.9)',
          border: '1px solid #64748b',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <h3 style={{ color: '#64748b', marginBottom: '15px' }}>Process Information</h3>
          <p style={{ fontSize: '12px', color: '#2c3e50', lineHeight: '1.5' }}>
            This is a first-principles simulation console for dry methane reforming processes. 
            The interface allows for precise control of mass flow controllers, monitoring of process conditions, 
            and real-time visualization of reactor performance.
          </p>
        </div>
        
        <div style={{
          backgroundColor: 'rgba(255,255,255,0.9)',
          border: '1px solid #64748b',
          borderRadius: '8px',
          padding: '20px'
        }}>
          <h3 style={{ color: '#64748b', marginBottom: '15px' }}>Equipment Status</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '4px' }}>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Preheater</div>
              <div style={{ fontSize: '12px', color: '#27ae60', fontWeight: '600' }}>Online</div>
            </div>
            <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '4px' }}>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Reactor</div>
              <div style={{ fontSize: '12px', color: '#27ae60', fontWeight: '600' }}>Online</div>
            </div>
            <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '4px' }}>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Controller</div>
              <div style={{ fontSize: '12px', color: '#27ae60', fontWeight: '600' }}>Ready</div>
            </div>
          </div>
        </div>
      </div>

      {/* Process Flow Lines */}
      <svg style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1
      }}>
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="8" 
                  refX="10" refY="4" orient="auto">
            <polygon points="0 0, 10 4, 0 8" fill="#2c3e50" />
          </marker>
        </defs>
        
        {/* Three separate MFC outlet lines */}
        <line x1="320" y1="80" x2="380" y2="140" stroke="#2c3e50" strokeWidth="3" markerEnd="url(#arrowhead)" />
        <line x1="320" y1="150" x2="380" y2="160" stroke="#2c3e50" strokeWidth="3" markerEnd="url(#arrowhead)" />
        <line x1="320" y1="220" x2="380" y2="180" stroke="#2c3e50" strokeWidth="3" markerEnd="url(#arrowhead)" />
        
        {/* Mixing junction before preheater */}
        <circle cx="390" cy="160" r="10" fill="#2c3e50" stroke="none" />
        
        {/* Main process line from mixing to preheater */}
        <line x1="400" y1="160" x2="400" y2="190" stroke="#2c3e50" strokeWidth="4" markerEnd="url(#arrowhead)" />
        
        {/* Preheater to reactor */}
        <line x1="510" y1="190" x2="580" y2="190" stroke="#2c3e50" strokeWidth="4" markerEnd="url(#arrowhead)" />
      </svg>
    </div>
  );
}

// Compact MFC Unit Component
function CompactMFCUnit({ id, data, yPos, onFlowChange, onGasChange, onAddGas, onRemoveGas }) {
  const totalZ = data.gases.reduce((sum, gas) => sum + gas.z, 0);
  const isNormalized = Math.abs(totalZ - 1.0) < 0.01;

  return (
    <div style={{
      backgroundColor: '#ffffff',
      border: '2px solid #0891b2',
      borderRadius: '8px',
      padding: '12px',
      width: '220px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '10px'
      }}>
        <div style={{
          fontSize: '14px',
          fontWeight: '600',
          color: '#0891b2'
        }}>
          {id}
        </div>
        <div style={{
          fontSize: '10px',
          color: isNormalized ? '#10b981' : '#f59e0b',
          backgroundColor: isNormalized ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
          padding: '2px 6px',
          borderRadius: '4px',
          fontWeight: '500'
        }}>
          Σz = {totalZ.toFixed(3)}
        </div>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '10px'
      }}>
        <label style={{ fontSize: '11px', color: '#0891b2', minWidth: '55px', fontWeight: '500' }}>Flow Rate</label>
        <input
          type="number"
          step="0.001"
          value={data.pv}
          onChange={(e) => onFlowChange(e.target.value)}
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #0891b2',
            borderRadius: '4px',
            padding: '4px 8px',
            color: '#2c3e50',
            fontSize: '11px',
            width: '70px',
            fontWeight: '500'
          }}
        />
        <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '500' }}>L/h</span>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '6px'
        }}>
          <label style={{ fontSize: '11px', color: '#0891b2', fontWeight: '500' }}>Gas Composition</label>
          <button 
            onClick={onAddGas}
            style={{
              backgroundColor: '#0891b2',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              fontSize: '10px',
              padding: '3px 8px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            +
          </button>
        </div>
        
        {data.gases.map((gas, index) => (
          <div key={index} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '4px'
          }}>
            <select
              value={gas.name}
              onChange={(e) => onGasChange(index, 'name', e.target.value)}
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #0891b2',
                borderRadius: '4px',
                padding: '3px 6px',
                color: '#2c3e50',
                fontSize: '10px',
                width: '55px',
                fontWeight: '500'
              }}
            >
              {AVAILABLE_GASES.map(gasName => (
                <option key={gasName} value={gasName}>{gasName}</option>
              ))}
            </select>
            
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={gas.z}
              onChange={(e) => onGasChange(index, 'z', e.target.value)}
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #0891b2',
                borderRadius: '4px',
                padding: '3px 6px',
                color: '#2c3e50',
                fontSize: '10px',
                width: '55px',
                fontWeight: '500'
              }}
            />
            
            {data.gases.length > 1 && (
              <button 
                onClick={() => onRemoveGas(index)}
                style={{
                  backgroundColor: '#e74c3c',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'white',
                  fontSize: '10px',
                  padding: '3px 6px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// TIC Unit Component
function TICUnit({ id, pv, sv }) {
  return (
    <div style={{
      backgroundColor: '#3498db',
      border: '1px solid #2c3e50',
      borderRadius: '6px',
      padding: '6px 8px',
      fontSize: '9px',
      color: 'white',
      textAlign: 'center',
      minWidth: '50px',
      boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
      fontWeight: '500'
    }}>
      <div style={{ fontWeight: '600', marginBottom: '3px' }}>{id}</div>
      <div>PV {pv}</div>
      <div>SV {sv}</div>
    </div>
  );
}

// Sensor Tag Component
function SensorTag({ id }) {
  return (
    <div style={{
      backgroundColor: '#0891b2', // Changed from purple to blue to match the theme
      color: 'white',
      padding: '4px 10px',
      borderRadius: '6px',
      fontSize: '9px',
      fontWeight: '600',
      boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
      border: '1px solid #2c3e50'
    }}>
      {id}
    </div>
  );
}

// Trends Panel Component  
function TrendsPanel() {
  return (
    <div style={{
      backgroundColor: '#ffffff',
      border: '1px solid #e1e5e9',
      borderRadius: '8px',
      padding: '16px',
      height: '300px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{
        backgroundColor: '#0891b2',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: '12px'
      }}>
        Online Trends
      </div>
      
      <div style={{ flex: 1, minHeight: '200px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={mockTimeSeriesData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e1e5e9" />
            <XAxis dataKey="time" stroke="#64748b" fontSize={10} />
            <YAxis stroke="#64748b" fontSize={10} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#ffffff', 
                border: '1px solid #e1e5e9',
                borderRadius: '6px',
                fontSize: '11px',
                color: '#2c3e50',
                fontWeight: '500'
              }}
            />
            <Line type="monotone" dataKey="ch4_conv" stroke="#e74c3c" strokeWidth={2} dot={false} name="CH₄ Conv %" />
            <Line type="monotone" dataKey="co2_conv" stroke="#3498db" strokeWidth={2} dot={false} name="CO₂ Conv %" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default IndustrialDRMSimulation;