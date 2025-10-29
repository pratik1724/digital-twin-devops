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
      minHeight: '200vh', // Ensure enough height for scrolling
      backgroundColor: '#0a0a0a', // Black background
      color: '#ffffff',
      fontFamily: 'Inter, Arial, sans-serif',
      padding: '20px',
      paddingBottom: '150px',
      background: 'radial-gradient(ellipse at center, #0a0a0a 0%, #000000 100%)'
    }}>
      {/* Main Process Flow Area */}
      <div style={{
        backgroundColor: 'rgba(10, 10, 10, 0.95)',
        border: '2px solid #00ffff', // Cyan border
        borderRadius: '12px',
        padding: '40px',
        position: 'relative',
        overflow: 'visible',
        boxShadow: '0 0 30px rgba(0, 255, 255, 0.3), inset 0 0 20px rgba(0, 255, 255, 0.1)',
        marginRight: '350px',
        minHeight: '800px',
        marginBottom: '30px'
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

      {/* Right Side Panel - Trends */}
      <div style={{
        position: 'absolute',
        right: '20px',
        top: '20px',
        width: '320px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <TrendsPanel />
      </div>

      {/* Process Parameters Section - Below main diagram */}
      <div style={{
        backgroundColor: 'rgba(10, 10, 10, 0.95)',
        border: '2px solid #00ff00', // Green border
        borderRadius: '12px',
        padding: '25px',
        marginRight: '350px',
        marginBottom: '30px',
        boxShadow: '0 0 25px rgba(0, 255, 0, 0.3), inset 0 0 15px rgba(0, 255, 0, 0.1)'
      }}>
        <ProcessParametersPanel 
          processParams={processParams}
          setProcessParams={setProcessParams}
        />
      </div>

      {/* Simulation Results Section - Below parameters */}
      {simulationData && (
        <div style={{
          backgroundColor: 'rgba(10, 10, 10, 0.95)',
          border: '2px solid #ff00ff', // Magenta border
          borderRadius: '12px',
          padding: '25px',
          marginRight: '350px',
          marginBottom: '30px',
          boxShadow: '0 0 25px rgba(255, 0, 255, 0.3), inset 0 0 15px rgba(255, 0, 255, 0.1)'
        }}>
          <SimulationResultsPanel simulationData={simulationData} />
        </div>
      )}

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
            backgroundColor: isRunning ? '#ff6600' : '#00ff00', // Orange when running, green when ready
            color: '#000000',
            border: '2px solid #ffffff',
            padding: '16px 40px',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '700',
            cursor: isRunning ? 'not-allowed' : 'pointer',
            opacity: isRunning ? 0.8 : 1,
            boxShadow: isRunning 
              ? '0 0 30px rgba(255, 102, 0, 0.6), 0 4px 15px rgba(0,0,0,0.3)' 
              : '0 0 30px rgba(0, 255, 0, 0.6), 0 4px 15px rgba(0,0,0,0.3)',
            transition: 'all 0.3s ease',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            textShadow: '0 0 10px rgba(255, 255, 255, 0.8)'
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
      height: '750px',
      position: 'relative',
      backgroundColor: 'transparent'
    }}>
      {/* Title */}
      <div style={{
        position: 'absolute',
        left: '50px',
        top: '10px',
        color: '#00ffff',
        fontSize: '18px',
        fontWeight: '700',
        textShadow: '0 0 15px rgba(0, 255, 255, 0.8)',
        letterSpacing: '1px'
      }}>
        FIRST ORDER PRINCIPLE SIMULATION - P&ID DIAGRAM
      </div>

      {/* Left Side - MFC Section */}
      <div style={{
        position: 'absolute',
        left: '50px',
        top: '60px',
        display: 'flex',
        flexDirection: 'column',
        gap: '25px'
      }}>
        <div style={{
          color: '#00ff00',
          fontSize: '16px',
          fontWeight: '700',
          marginBottom: '15px',
          textShadow: '0 0 15px rgba(0, 255, 0, 0.8)',
          letterSpacing: '1px'
        }}>
          MASS FLOW CONTROLLERS
        </div>
        
        {Object.entries(mfcData).map(([mfcId, data], index) => (
          <NeonMFCUnit 
            key={mfcId}
            id={mfcId} 
            data={data}
            yPos={60 + index * 120}
            onFlowChange={(value) => onMFCFlowChange(mfcId, value)}
            onGasChange={(gasIndex, field, value) => onMFCGasChange(mfcId, gasIndex, field, value)}
            onAddGas={() => onAddGas(mfcId)}
            onRemoveGas={(gasIndex) => onRemoveGas(mfcId, gasIndex)}
          />
        ))}
      </div>

      {/* Mixing Junction */}
      <div style={{
        position: 'absolute',
        left: '420px',
        top: '200px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          backgroundColor: '#ff00ff',
          border: '3px solid #ffffff',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 25px rgba(255, 0, 255, 0.8)',
          position: 'relative'
        }}>
          <div style={{
            fontSize: '18px',
            color: '#ffffff',
            fontWeight: '700',
            textShadow: '0 0 10px rgba(255, 255, 255, 0.8)'
          }}>⊕</div>
          <div style={{
            position: 'absolute',
            bottom: '-25px',
            fontSize: '10px',
            color: '#ff00ff',
            fontWeight: '600',
            textShadow: '0 0 10px rgba(255, 0, 255, 0.8)',
            whiteSpace: 'nowrap'
          }}>MIXING</div>
        </div>
      </div>

      {/* Preheater FH500 */}
      <div style={{
        position: 'absolute',
        left: '550px',
        top: '150px'
      }}>
        {/* TIC Controllers above preheater */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '25px',
          marginLeft: '20px'
        }}>
          <NeonTICUnit id="TIC600" pv="24" sv="0" />
          <NeonTICUnit id="TIC601" pv="24" sv="0" />
          <NeonTICUnit id="TIC602" pv="24" sv="0" />
          <NeonTICUnit id="TIC603" pv="24" sv="0" />
        </div>
        
        {/* Preheater FH500 */}
        <div style={{
          width: '120px',
          height: '160px',
          backgroundColor: '#ff6600',
          border: '3px solid #ffffff',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          boxShadow: '0 0 30px rgba(255, 102, 0, 0.8)',
          background: 'linear-gradient(135deg, #ff6600 0%, #ff8800 50%, #ff6600 100%)'
        }}>
          <div style={{ 
            fontSize: '28px', 
            marginBottom: '15px',
            color: '#ffffff',
            textShadow: '0 0 15px rgba(255, 255, 255, 0.8)'
          }}>⚡</div>
          <div style={{ 
            fontSize: '14px', 
            fontWeight: '700',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: '#ffffff',
            padding: '8px 12px',
            borderRadius: '6px',
            textShadow: '0 0 10px rgba(255, 255, 255, 0.8)',
            letterSpacing: '1px'
          }}>FH500</div>
          <div style={{ 
            fontSize: '11px', 
            fontWeight: '600',
            color: '#ffffff',
            marginTop: '5px',
            textShadow: '0 0 10px rgba(255, 255, 255, 0.8)'
          }}>PREHEATER</div>
        </div>
      </div>

      {/* Additional Preheater Block */}
      <div style={{
        position: 'absolute',
        left: '720px',
        top: '180px'
      }}>
        <div style={{
          width: '100px',
          height: '100px',
          backgroundColor: '#ff4400',
          border: '3px solid #ffffff',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          boxShadow: '0 0 25px rgba(255, 68, 0, 0.8)'
        }}>
          <div style={{ 
            fontSize: '20px', 
            marginBottom: '8px',
            color: '#ffffff',
            textShadow: '0 0 15px rgba(255, 255, 255, 0.8)'
          }}>🔥</div>
          <div style={{ 
            fontSize: '10px', 
            fontWeight: '700',
            color: '#ffffff',
            textShadow: '0 0 10px rgba(255, 255, 255, 0.8)',
            textAlign: 'center'
          }}>HEAT EXCHANGER</div>
        </div>
      </div>

      {/* Reactor Section */}
      <div style={{
        position: 'absolute',
        left: '880px',
        top: '120px'
      }}>
        {/* Sensor Tags on the left */}
        <div style={{
          position: 'absolute',
          left: '-80px',
          top: '60px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <NeonSensorTag id="TSS500" />
          <NeonSensorTag id="TSS501" />
          <NeonSensorTag id="TSS502" />
          <NeonSensorTag id="TI500" />
        </div>
        
        {/* Reactor Vessel */}
        <div style={{
          width: '100px',
          height: '220px',
          background: isRunning 
            ? 'linear-gradient(180deg, #ff00ff 0%, #ff6600 30%, #ffff00 50%, #ff6600 70%, #ff00ff 100%)'
            : 'linear-gradient(180deg, #333333 0%, #555555 30%, #666666 50%, #555555 70%, #333333 100%)',
          border: '3px solid #ffffff',
          borderRadius: '15px',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isRunning 
            ? '0 0 40px rgba(255, 0, 255, 0.8), 0 0 80px rgba(255, 102, 0, 0.4)' 
            : '0 0 20px rgba(255, 255, 255, 0.3)',
          transition: 'all 0.5s ease'
        }}>
          <div style={{
            position: 'absolute',
            bottom: '20px',
            fontSize: '14px',
            fontWeight: '700',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: '#ffffff',
            padding: '8px 12px',
            borderRadius: '6px',
            textShadow: '0 0 10px rgba(255, 255, 255, 0.8)',
            letterSpacing: '1px'
          }}>REACTOR</div>
          
          {/* Reactor internals - catalyst bed pattern */}
          <div style={{
            width: '85%',
            height: '85%',
            background: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.2), rgba(255,255,255,0.2) 4px, transparent 4px, transparent 12px)',
            borderRadius: '8px',
            border: '2px solid rgba(255,255,255,0.4)'
          }}></div>
        </div>

        {/* Right side TIC controllers */}
        <div style={{
          position: 'absolute',
          right: '-100px',
          top: '80px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <NeonTICUnit id="TIC500" pv="25" sv="0" />
          <NeonTICUnit id="TIC501" pv="25" sv="0" />
          <NeonTICUnit id="TIC502" pv="25" sv="0" />
        </div>
      </div>

      {/* Process Flow Lines with Neon Effects */}
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
          <marker id="neon-arrowhead" markerWidth="12" markerHeight="10" 
                  refX="12" refY="5" orient="auto">
            <polygon points="0 0, 12 5, 0 10" fill="#00ffff" stroke="#ffffff" strokeWidth="1" />
          </marker>
          <filter id="neonGlow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Three separate MFC outlet lines to mixing junction */}
        <line x1="300" y1="120" x2="420" y2="200" stroke="#00ff00" strokeWidth="4" markerEnd="url(#neon-arrowhead)" filter="url(#neonGlow)" />
        <line x1="300" y1="200" x2="420" y2="210" stroke="#00ff00" strokeWidth="4" markerEnd="url(#neon-arrowhead)" filter="url(#neonGlow)" />
        <line x1="300" y1="280" x2="420" y2="220" stroke="#00ff00" strokeWidth="4" markerEnd="url(#neon-arrowhead)" filter="url(#neonGlow)" />
        
        {/* Main process line from mixing to FH500 preheater */}
        <line x1="460" y1="220" x2="550" y2="220" stroke="#00ffff" strokeWidth="6" markerEnd="url(#neon-arrowhead)" filter="url(#neonGlow)" />
        
        {/* FH500 to additional preheater */}
        <line x1="670" y1="230" x2="720" y2="230" stroke="#ff6600" strokeWidth="5" markerEnd="url(#neon-arrowhead)" filter="url(#neonGlow)" />
        
        {/* Preheater to reactor */}
        <line x1="820" y1="230" x2="880" y2="230" stroke="#ff00ff" strokeWidth="6" markerEnd="url(#neon-arrowhead)" filter="url(#neonGlow)" />
      </svg>
    </div>
  );
}

// Neon MFC Unit Component
function NeonMFCUnit({ id, data, yPos, onFlowChange, onGasChange, onAddGas, onRemoveGas }) {
  const totalZ = data.gases.reduce((sum, gas) => sum + gas.z, 0);
  const isNormalized = Math.abs(totalZ - 1.0) < 0.01;

  return (
    <div style={{
      backgroundColor: 'rgba(0, 255, 0, 0.1)',
      border: '2px solid #00ff00',
      borderRadius: '12px',
      padding: '15px',
      width: '240px',
      boxShadow: '0 0 20px rgba(0, 255, 0, 0.5), inset 0 0 10px rgba(0, 255, 0, 0.1)'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px'
      }}>
        <div style={{
          fontSize: '16px',
          fontWeight: '700',
          color: '#00ff00',
          textShadow: '0 0 15px rgba(0, 255, 0, 0.8)',
          letterSpacing: '1px'
        }}>
          {id}
        </div>
        <div style={{
          fontSize: '11px',
          color: isNormalized ? '#00ff00' : '#ff6600',
          backgroundColor: isNormalized ? 'rgba(0, 255, 0, 0.2)' : 'rgba(255, 102, 0, 0.2)',
          padding: '4px 8px',
          borderRadius: '6px',
          fontWeight: '600',
          border: `1px solid ${isNormalized ? '#00ff00' : '#ff6600'}`,
          textShadow: `0 0 10px ${isNormalized ? 'rgba(0, 255, 0, 0.8)' : 'rgba(255, 102, 0, 0.8)'}`
        }}>
          Σz = {totalZ.toFixed(3)}
        </div>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '12px'
      }}>
        <label style={{ fontSize: '12px', color: '#00ffff', minWidth: '65px', fontWeight: '600', textShadow: '0 0 10px rgba(0, 255, 255, 0.8)' }}>Flow Rate</label>
        <input
          type="number"
          step="0.001"
          value={data.pv}
          onChange={(e) => onFlowChange(e.target.value)}
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            border: '1px solid #00ffff',
            borderRadius: '6px',
            padding: '6px 10px',
            color: '#ffffff',
            fontSize: '12px',
            width: '80px',
            fontWeight: '600',
            boxShadow: '0 0 10px rgba(0, 255, 255, 0.3)'
          }}
        />
        <span style={{ fontSize: '11px', color: '#ffffff', fontWeight: '600', textShadow: '0 0 10px rgba(255, 255, 255, 0.8)' }}>L/h</span>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px'
        }}>
          <label style={{ fontSize: '12px', color: '#ff00ff', fontWeight: '600', textShadow: '0 0 10px rgba(255, 0, 255, 0.8)' }}>Gas Composition</label>
          <button 
            onClick={onAddGas}
            style={{
              backgroundColor: '#ff00ff',
              border: '2px solid #ffffff',
              borderRadius: '6px',
              color: '#000000',
              fontSize: '12px',
              padding: '4px 10px',
              cursor: 'pointer',
              fontWeight: '700',
              boxShadow: '0 0 15px rgba(255, 0, 255, 0.6)'
            }}
          >
            +
          </button>
        </div>
        
        {data.gases.map((gas, index) => (
          <div key={index} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '6px'
          }}>
            <select
              value={gas.name}
              onChange={(e) => onGasChange(index, 'name', e.target.value)}
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                border: '1px solid #00ffff',
                borderRadius: '4px',
                padding: '4px 6px',
                color: '#ffffff',
                fontSize: '11px',
                width: '60px',
                fontWeight: '600'
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
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                border: '1px solid #00ffff',
                borderRadius: '4px',
                padding: '4px 6px',
                color: '#ffffff',
                fontSize: '11px',
                width: '60px',
                fontWeight: '600'
              }}
            />
            
            {data.gases.length > 1 && (
              <button 
                onClick={() => onRemoveGas(index)}
                style={{
                  backgroundColor: '#ff0000',
                  border: '1px solid #ffffff',
                  borderRadius: '4px',
                  color: '#ffffff',
                  fontSize: '11px',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  fontWeight: '700',
                  boxShadow: '0 0 10px rgba(255, 0, 0, 0.6)'
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

// Neon TIC Unit Component
function NeonTICUnit({ id, pv, sv }) {
  return (
    <div style={{
      backgroundColor: 'rgba(0, 255, 255, 0.2)',
      border: '2px solid #00ffff',
      borderRadius: '8px',
      padding: '8px 10px',
      fontSize: '10px',
      color: '#ffffff',
      textAlign: 'center',
      minWidth: '55px',
      boxShadow: '0 0 15px rgba(0, 255, 255, 0.6)',
      fontWeight: '600'
    }}>
      <div style={{ fontWeight: '700', marginBottom: '4px', textShadow: '0 0 10px rgba(255, 255, 255, 0.8)' }}>{id}</div>
      <div>PV {pv}</div>
      <div>SV {sv}</div>
    </div>
  );
}

// Neon Sensor Tag Component
function NeonSensorTag({ id }) {
  return (
    <div style={{
      backgroundColor: 'rgba(0, 255, 0, 0.3)',
      color: '#ffffff',
      padding: '6px 12px',
      borderRadius: '8px',
      fontSize: '10px',
      fontWeight: '700',
      boxShadow: '0 0 15px rgba(0, 255, 0, 0.6)',
      border: '2px solid #00ff00',
      textShadow: '0 0 10px rgba(255, 255, 255, 0.8)'
    }}>
      {id}
    </div>
  );
}

// Process Parameters Panel Component
function ProcessParametersPanel({ processParams, setProcessParams }) {
  return (
    <div>
      <div style={{
        color: '#00ff00',
        fontSize: '18px',
        fontWeight: '700',
        marginBottom: '20px',
        textShadow: '0 0 15px rgba(0, 255, 0, 0.8)',
        letterSpacing: '1px'
      }}>
        PROCESS PARAMETERS
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '25px',
        fontSize: '14px'
      }}>
        <ProcessParam 
          label="Pressure" 
          value={processParams.pressure_bar} 
          unit="bar"
          onChange={(value) => setProcessParams(prev => ({ ...prev, pressure_bar: parseFloat(value) || 0 }))}
        />
        <ProcessParam 
          label="Preheat Temp" 
          value={processParams.preheat_T_C} 
          unit="°C"
          onChange={(value) => setProcessParams(prev => ({ ...prev, preheat_T_C: parseFloat(value) || 0 }))}
        />
        <ProcessParam 
          label="DRM Conversion" 
          value={processParams.DRM_conversion} 
          unit=""
          onChange={(value) => setProcessParams(prev => ({ ...prev, DRM_conversion: parseFloat(value) || 0 }))}
        />
        <ProcessParam 
          label="Cooler Outlet" 
          value={processParams.cooler_outlet_T_C} 
          unit="°C"
          onChange={(value) => setProcessParams(prev => ({ ...prev, cooler_outlet_T_C: parseFloat(value) || 0 }))}
        />
      </div>
    </div>
  );
}

// Process Parameter Component
function ProcessParam({ label, value, unit, onChange }) {
  return (
    <div>
      <label style={{ color: '#00ffff', fontSize: '14px', display: 'block', marginBottom: '8px', fontWeight: '600', textShadow: '0 0 10px rgba(0, 255, 255, 0.8)' }}>
        {label}
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input
          type="number"
          step="0.1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            border: '2px solid #00ffff',
            borderRadius: '6px',
            padding: '8px 12px',
            color: '#ffffff',
            fontSize: '14px',
            width: '100px',
            fontWeight: '600',
            boxShadow: '0 0 10px rgba(0, 255, 255, 0.3)'
          }}
        />
        {unit && <span style={{ fontSize: '12px', color: '#ffffff', fontWeight: '600', textShadow: '0 0 10px rgba(255, 255, 255, 0.8)' }}>{unit}</span>}
      </div>
    </div>
  );
}

// Simulation Results Panel Component
function SimulationResultsPanel({ simulationData }) {
  return (
    <div>
      <div style={{
        color: '#ff00ff',
        fontSize: '18px',
        fontWeight: '700',
        marginBottom: '20px',
        textShadow: '0 0 15px rgba(255, 0, 255, 0.8)',
        letterSpacing: '1px'
      }}>
        SIMULATION RESULTS
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '25px',
        fontSize: '14px'
      }}>
        <div>
          <div style={{ color: '#00ffff', marginBottom: '8px', fontWeight: '600', textShadow: '0 0 10px rgba(0, 255, 255, 0.8)' }}>CH₄ Conversion</div>
          <div style={{ color: '#ffffff', fontWeight: '700', fontSize: '18px', textShadow: '0 0 15px rgba(255, 255, 255, 0.8)' }}>{simulationData.ch4_conversion}%</div>
        </div>
        <div>
          <div style={{ color: '#00ffff', marginBottom: '8px', fontWeight: '600', textShadow: '0 0 10px rgba(0, 255, 255, 0.8)' }}>CO₂ Conversion</div>
          <div style={{ color: '#ffffff', fontWeight: '700', fontSize: '18px', textShadow: '0 0 15px rgba(255, 255, 255, 0.8)' }}>{simulationData.co2_conversion}%</div>
        </div>
        <div>
          <div style={{ color: '#00ffff', marginBottom: '8px', fontWeight: '600', textShadow: '0 0 10px rgba(0, 255, 255, 0.8)' }}>H₂/CO Ratio</div>
          <div style={{ color: '#ffffff', fontWeight: '700', fontSize: '18px', textShadow: '0 0 15px rgba(255, 255, 255, 0.8)' }}>{simulationData.h2_co_ratio}</div>
        </div>
        <div>
          <div style={{ color: '#00ffff', marginBottom: '8px', fontWeight: '600', textShadow: '0 0 10px rgba(0, 255, 255, 0.8)' }}>Syngas Purity</div>
          <div style={{ color: '#ffffff', fontWeight: '700', fontSize: '18px', textShadow: '0 0 15px rgba(255, 255, 255, 0.8)' }}>{simulationData.syngas_purity}%</div>
        </div>
      </div>
      <div style={{
        marginTop: '15px',
        fontSize: '12px',
        color: '#00ff00',
        textShadow: '0 0 10px rgba(0, 255, 0, 0.8)'
      }}>
        Completed at: {simulationData.timestamp}
      </div>
    </div>
  );
}

// Trends Panel Component  
function TrendsPanel() {
  return (
    <div style={{
      backgroundColor: 'rgba(10, 10, 10, 0.95)',
      border: '2px solid #00ffff',
      borderRadius: '12px',
      padding: '20px',
      height: '350px',
      boxShadow: '0 0 25px rgba(0, 255, 255, 0.4), inset 0 0 15px rgba(0, 255, 255, 0.1)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{
        backgroundColor: 'rgba(0, 255, 255, 0.2)',
        color: '#ffffff',
        padding: '10px 15px',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: '15px',
        border: '1px solid #00ffff',
        textShadow: '0 0 10px rgba(255, 255, 255, 0.8)',
        letterSpacing: '1px'
      }}>
        ONLINE TRENDS
      </div>
      
      <div style={{ flex: 1, minHeight: '250px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={mockTimeSeriesData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333333" />
            <XAxis dataKey="time" stroke="#00ffff" fontSize={11} />
            <YAxis stroke="#00ffff" fontSize={11} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.9)', 
                border: '2px solid #00ffff',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#ffffff',
                fontWeight: '600',
                boxShadow: '0 0 20px rgba(0, 255, 255, 0.5)'
              }}
            />
            <Line type="monotone" dataKey="ch4_conv" stroke="#00ff00" strokeWidth={3} dot={false} name="CH₄ Conv %" filter="url(#neonGlow)" />
            <Line type="monotone" dataKey="co2_conv" stroke="#ff00ff" strokeWidth={3} dot={false} name="CO₂ Conv %" filter="url(#neonGlow)" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default IndustrialDRMSimulation;