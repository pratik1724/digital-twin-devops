import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// API Configuration
const DEFAULT_API_BASE_URL = "http://localhost:5000/api";

// Available gases for selection
const AVAILABLE_GASES = ["CO2", "CO", "O2", "N2", "CH4", "H2", "Ar", "He"];

// Updated Process Configuration - Professional PFD Layout
const processConfig = {
  units: [
    { id: "InletStream1", type: "StreamController", x: 50, y: 60, width: 200, height: 100 },   // CO2 - Top inlet
    { id: "InletStream2", type: "StreamController", x: 50, y: 240, width: 200, height: 100 },  // CH4 - Bottom inlet
    { id: "Mixer", type: "Mixer", x: 320, y: 140, width: 60, height: 60 },                     // Centered between inlets
    { id: "Reactor", type: "Reactor", x: 450, y: 110, width: 120, height: 120 },               // Horizontally aligned
    { id: "Condenser", type: "Condenser", x: 620, y: 125, width: 100, height: 90 },            // Horizontally aligned  
    { id: "Flowmeters", type: "FlowmeterGroup", x: 770, y: 120, width: 80, height: 100 },     // Horizontally aligned
  ],
  connections: [
    { 
      from: "InletStream1", 
      to: "Mixer", 
      color: "#3b82f6", 
      width: 3, 
      label: "CO₂ Feed",
      type: "diagonal-to-center"
    },
    { 
      from: "InletStream2", 
      to: "Mixer", 
      color: "#10b981", 
      width: 3, 
      label: "CH₄ Feed",
      type: "diagonal-to-center" 
    },
    { 
      from: "Mixer", 
      to: "Reactor", 
      color: "#14b8a6", 
      width: 4, 
      label: "Mixed Feed",
      type: "horizontal"
    },
    { 
      from: "Reactor", 
      to: "Condenser", 
      color: "#f59e0b", 
      width: 4, 
      label: "Hot Effluent",
      type: "horizontal"
    },
    { 
      from: "Condenser", 
      to: "Flowmeters", 
      color: "#10b981", 
      width: 3, 
      label: "Products",
      type: "horizontal"
    },
  ],
};

// Mock data for demonstration - Updated to match inlet streams
const mockStreamData = {
  InletStream1: {
    pv: 30.0, // mg/s
    temperature: 25,
    pressure: 1.0,
    gases: [{ name: "CO2", z: 1.0 }],
  },
  InletStream2: {
    pv: 11.0, // mg/s
    temperature: 25,
    pressure: 1.0,
    gases: [{ name: "CH4", z: 1.0 }],
  },
};

const mockKPIData = {
  ch4_conversion: 82.5,
  co2_conversion: 79.2,
  h2_co_ratio: 1.1,
  syngas_purity: 68.3,
};

const mockTimeSeriesData = [
  { time: 0, ch4_conv: 75, co2_conv: 72, h2_co: 1.0 },
  { time: 60, ch4_conv: 78, co2_conv: 75, h2_co: 1.05 },
  { time: 120, ch4_conv: 82, co2_conv: 79, h2_co: 1.1 },
  { time: 180, ch4_conv: 85, co2_conv: 82, h2_co: 1.15 },
  { time: 240, ch4_conv: 82, co2_conv: 79, h2_co: 1.1 },
];

export default function IndustrialDRMSimulation() {
  const [apiBaseUrl, setApiBaseUrl] = useState(DEFAULT_API_BASE_URL);
  const [isRunning, setIsRunning] = useState(false);
  const [simulationData, setSimulationData] = useState(null);
  const [streamData, setStreamData] = useState(mockStreamData);
  const [activeTab, setActiveTab] = useState('process');
  const [apiConnected, setApiConnected] = useState(false);

  // Stream conditions for API - Updated to match backend expectations
  const [streamConditions, setStreamConditions] = useState({
    stream_1: { temperature_C: 850, pressure_bar: 1.0 }, // Reactor conditions
    stream_3: { temperature_C: 25, pressure_bar: 1.0, mass_flow_mg_s: 30 }, // CO2 feed
    stream_4: { temperature_C: 25, pressure_bar: 1.0, mass_flow_mg_s: 11 }, // CH4 feed
  });

  // Check API health on component mount
  useEffect(() => {
    checkApiHealth();
  }, [apiBaseUrl]);

  const checkApiHealth = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/health`);
      if (response.ok) {
        setApiConnected(true);
        console.log("API connected successfully");
      } else {
        setApiConnected(false);
      }
    } catch (error) {
      setApiConnected(false);
      console.error("API connection failed:", error);
    }
  };

  const handleRunSimulation = async () => {
    if (!apiConnected) {
      alert("API not connected. Please check the API URL and ensure the Flask server is running.");
      return;
    }

    setIsRunning(true);
    
    try {
      // Build the exact payload format expected by Flask API
      const payload = {
        inlet_modifications: {
          stream_1: {
            temperature_C: streamConditions.stream_1.temperature_C,
            pressure_bar: streamConditions.stream_1.pressure_bar
          },
          stream_3: {
            temperature_C: streamData.InletStream1.temperature,
            pressure_bar: streamData.InletStream1.pressure,
            mass_flow_mg_s: streamData.InletStream1.pv
          },
          stream_4: {
            temperature_C: streamData.InletStream2.temperature,
            pressure_bar: streamData.InletStream2.pressure,
            mass_flow_mg_s: streamData.InletStream2.pv
          }
        },
        output_streams: [1, 2, 6, 7], // Request key streams including hot effluent
        include_all_streams: true     // Get complete simulation data for analysis
      };

      console.log("Sending payload to Flask API:", JSON.stringify(payload, null, 2));

      const response = await fetch(`${apiBaseUrl}/simulation/run`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Flask API Response:", data);

        // Process the response data
        const processedData = {
          success: data.success,
          timestamp: new Date().toLocaleString(),
          modifications_applied: data.modifications_applied || [],
          output_streams: data.output_streams || {},
          all_streams: data.all_streams || {},
          summary: data.summary || {},
          flowsheet_name: data.flowsheet_name || "Unknown",
          // Calculate KPIs from stream data if available
          kpis: calculateKPIs(data.output_streams, data.all_streams),
          raw_response: data // Store full response for logs
        };

        setSimulationData(processedData);

      } else {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(`API returned ${response.status}: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      console.error("Simulation error:", error);
      alert(`Simulation failed: ${error.message}`);
      setSimulationData({
        success: false,
        error: error.message,
        timestamp: new Date().toLocaleString()
      });
    }
    
    setIsRunning(false);
  };

  // Calculate process KPIs from simulation results
  const calculateKPIs = (outputStreams, allStreams) => {
    try {
      // Default KPIs - in real implementation these would be calculated from stream compositions
      const kpis = {
        ch4_conversion: 0,
        co2_conversion: 0,
        h2_co_ratio: 0,
        syngas_purity: 0,
        reactor_temp: 0,
        total_syngas_flow: 0
      };

      // Extract reactor temperature from stream 1 if available
      if (outputStreams?.stream_1?.temperature_C) {
        kpis.reactor_temp = outputStreams.stream_1.temperature_C;
      }

      // Extract syngas flow from stream 6 if available  
      if (outputStreams?.stream_6?.mass_flow_mg_s) {
        kpis.total_syngas_flow = outputStreams.stream_6.mass_flow_mg_s;
      }

      // Mock conversion calculations (would need composition data from DWSIM for real calculations)
      const reactorTemp = kpis.reactor_temp;
      if (reactorTemp > 800) {
        kpis.ch4_conversion = Math.min(95, 60 + (reactorTemp - 800) * 0.1);
        kpis.co2_conversion = Math.min(90, 55 + (reactorTemp - 800) * 0.08);
        kpis.h2_co_ratio = 0.9 + (reactorTemp - 800) * 0.0005;
        kpis.syngas_purity = Math.min(85, 50 + (reactorTemp - 800) * 0.08);
      }

      return kpis;
    } catch (error) {
      console.error("Error calculating KPIs:", error);
      return {
        ch4_conversion: 0,
        co2_conversion: 0, 
        h2_co_ratio: 0,
        syngas_purity: 0,
        reactor_temp: 0,
        total_syngas_flow: 0
      };
    }
  };

  const updateStreamFlow = (streamId, value) => {
    setStreamData((prev) => ({
      ...prev,
      [streamId]: {
        ...prev[streamId],
        pv: parseFloat(value) || 0,
      },
    }));
  };

  const updateStreamProperty = (streamId, property, value) => {
    setStreamData((prev) => ({
      ...prev,
      [streamId]: {
        ...prev[streamId],
        [property]: parseFloat(value) || 0,
      },
    }));
  };

  const updateStreamCondition = (streamId, parameter, value) => {
    setStreamConditions(prev => ({
      ...prev,
      [streamId]: {
        ...prev[streamId],
        [parameter]: parseFloat(value) || 0
      }
    }));
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white font-mono">
      {/* API Configuration Panel */}
      <div className="bg-gray-800 px-4 py-2 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium">API URL:</label>
          <input
            type="text"
            value={apiBaseUrl}
            onChange={(e) => setApiBaseUrl(e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-sm w-64 focus:border-teal-500 focus:outline-none"
            placeholder="http://your-aws-instance:5000/api"
          />
          <button
            onClick={checkApiHealth}
            className="bg-teal-600 hover:bg-teal-700 px-3 py-1 rounded text-sm"
          >
            Test Connection
          </button>
        </div>
      </div>

      <div className="flex h-screen">
        {/* Main Process Display */}
        <div className="flex-1 p-4">
          <div className="bg-gray-800 rounded-lg h-full relative overflow-auto border-2 border-gray-700">
            <div className="absolute top-4 left-4 text-sm font-medium text-teal-400">
              DRM Process Flow Diagram
            </div>
            
            {/* Process Diagram */}
            <div className="min-w-[1000px] min-h-[600px] h-full relative pt-12">
              <ProcessSchematicDiagram 
                config={processConfig} 
                isRunning={isRunning}
                streamData={streamData}
                simulationData={simulationData}
                onStreamFlowChange={updateStreamFlow}
                onStreamPropertyChange={updateStreamProperty}
              />
              
              {/* KPI Dashboard Overlay */}
              {simulationData?.success && (
                <div className="absolute top-16 right-4">
                  <KPIDashboard kpis={simulationData.kpis} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
          
          {/* Navigation Tabs */}
          <div className="bg-gray-700 border-b border-gray-700">
            <div className="flex">
              {[
                { id: 'process', label: 'Process' },
                { id: 'trends', label: 'Trends' },
                { id: 'results', label: 'Results' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 text-sm font-medium border-r border-gray-700 ${
                    activeTab === tab.id 
                      ? 'bg-teal-600 text-white' 
                      : 'text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'process' && (
              <ProcessControlPanel 
                streamConditions={streamConditions}
                onStreamChange={updateStreamCondition}
                streamData={streamData}
                onStreamDataChange={updateStreamProperty}
              />
            )}
            
            {activeTab === 'trends' && <TrendsPanel />}
            {activeTab === 'results' && (
              <ResultsPanel 
                simulationData={simulationData}
                isRunning={isRunning}
              />
            )}
          </div>

          {/* Run Simulation Button */}
          <div className="p-4 border-t border-gray-700">
            <button
              onClick={handleRunSimulation}
              disabled={isRunning || !apiConnected}
              className={`w-full py-3 px-4 rounded font-bold text-white ${
                isRunning 
                  ? 'bg-orange-500 cursor-not-allowed' 
                  : apiConnected
                  ? 'bg-emerald-600 hover:bg-emerald-700' 
                  : 'bg-gray-600 cursor-not-allowed'
              }`}
            >
              {isRunning ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>RUNNING...</span>
                </div>
              ) : (
                'RUN SIMULATION'
              )}
            </button>
            
            {simulationData && (
              <div className="mt-2 text-xs text-emerald-400">
                Last run: {simulationData.timestamp}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-gray-800 px-4 py-1 border-t border-gray-700 flex justify-between items-center text-xs">
        <div className="flex space-x-6">
          <span className={`${isRunning ? 'text-orange-400' : 'text-green-400'}`}>
            System: {isRunning ? 'RUNNING' : 'READY'}
          </span>
          <span>Reactor: {streamConditions.stream_1.temperature_C}°C, {streamConditions.stream_1.pressure_bar} bar</span>
          <span>CO₂: {streamData.InletStream1.pv} mg/s</span>
          <span>CH₄: {streamData.InletStream2.pv} mg/s</span>
          {simulationData?.success && (
            <span className="text-teal-400">
              Last: {simulationData.kpis?.ch4_conversion?.toFixed(1) || 0}% CH₄ conv
            </span>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <div className={`${apiConnected ? 'text-green-400' : 'text-red-400'}`}>
            API: {apiConnected ? 'Connected' : 'Disconnected'}
          </div>
          {simulationData?.flowsheet_name && (
            <div className="text-gray-400">
              Model: {simulationData.flowsheet_name}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Process Schematic Diagram Component
function ProcessSchematicDiagram({
  config,
  isRunning,
  streamData,
  simulationData,
  onStreamFlowChange,
  onStreamPropertyChange,
}) {
  const getUnitById = (id) => config.units.find((unit) => unit.id === id);

  const getConnectionPoint = (unitId, side = "center") => {
    const unit = getUnitById(unitId);
    if (!unit) return { x: 0, y: 0 };

    const centerX = unit.x + unit.width / 2;
    const centerY = unit.y + unit.height / 2;

    switch (side) {
      case "right":
        return { x: unit.x + unit.width, y: centerY };
      case "left":
        return { x: unit.x, y: centerY };
      case "top":
        return { x: centerX, y: unit.y };
      case "bottom":
        return { x: centerX, y: unit.y + unit.height };
      default:
        return { x: centerX, y: centerY };
    }
  };

  const generateConnectionLines = () => {
    return config.connections.map((conn, index) => {
      const fromUnit = getUnitById(conn.from);
      const toUnit = getUnitById(conn.to);

      if (!fromUnit || !toUnit) return null;

      const fromCenter = getConnectionPoint(conn.from, "center");
      const toCenter = getConnectionPoint(conn.to, "center");
      
      let pathData = "";
      let fromPoint, toPoint;

      switch (conn.type) {
        case "diagonal-to-center":
          // Clean diagonal lines from inlet streams to mixer center
          if (conn.from === "InletStream1") {
            // Top inlet: exit from right-center, connect to top of mixer
            fromPoint = { x: fromUnit.x + fromUnit.width, y: fromUnit.y + fromUnit.height/2 };
            toPoint = { x: toUnit.x + toUnit.width/2, y: toUnit.y + toUnit.height/2 };
          } else if (conn.from === "InletStream2") {
            // Bottom inlet: exit from right-center, connect to bottom of mixer  
            fromPoint = { x: fromUnit.x + fromUnit.width, y: fromUnit.y + fromUnit.height/2 };
            toPoint = { x: toUnit.x + toUnit.width/2, y: toUnit.y + toUnit.height/2 };
          }
          
          // Create smooth diagonal path
          pathData = `M ${fromPoint.x} ${fromPoint.y} L ${toPoint.x} ${toPoint.y}`;
          break;

        case "horizontal":
          // Clean horizontal connections for main process flow
          fromPoint = { x: fromUnit.x + fromUnit.width, y: fromCenter.y };
          toPoint = { x: toUnit.x, y: toCenter.y };
          
          // Create horizontal path with slight curve if heights differ
          const heightDiff = Math.abs(fromPoint.y - toPoint.y);
          if (heightDiff < 5) {
            // Straight horizontal line
            pathData = `M ${fromPoint.x} ${fromPoint.y} L ${toPoint.x} ${toPoint.y}`;
          } else {
            // Smooth horizontal connection with vertical adjustment
            const midX = (fromPoint.x + toPoint.x) / 2;
            pathData = `M ${fromPoint.x} ${fromPoint.y} 
                       C ${midX} ${fromPoint.y}, ${midX} ${toPoint.y}, ${toPoint.x} ${toPoint.y}`;
          }
          break;

        default:
          // Fallback to simple line
          fromPoint = getConnectionPoint(conn.from, "right");
          toPoint = getConnectionPoint(conn.to, "left");
          pathData = `M ${fromPoint.x} ${fromPoint.y} L ${toPoint.x} ${toPoint.y}`;
      }

      const labelX = (fromPoint.x + toPoint.x) / 2;
      const labelY = (fromPoint.y + toPoint.y) / 2 - 12;

      return (
        <g key={`connection-${index}`}>
          {/* Outer glow effect */}
          <path
            d={pathData}
            fill="none"
            stroke={conn.color}
            strokeWidth={conn.width + 2}
            opacity="0.3"
            filter="url(#pipeGlow)"
          />
          
          {/* Main pipe */}
          <path
            d={pathData}
            fill="none"
            stroke={conn.color}
            strokeWidth={conn.width}
            opacity="0.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Arrow head */}
          <polygon
            points={`${toPoint.x - 8},${toPoint.y - 4} ${toPoint.x - 8},${toPoint.y + 4} ${toPoint.x - 2},${toPoint.y}`}
            fill={conn.color}
            opacity="0.9"
          />
          
          {/* Pipe Label */}
          <text
            x={labelX}
            y={labelY}
            fill={conn.color}
            fontSize="11"
            fontWeight="600"
            textAnchor="middle"
            className="font-mono drop-shadow-sm"
          >
            {conn.label}
          </text>
        </g>
      );
    }).filter(Boolean);
  };

  return (
    <div className="w-full h-full relative">
      {/* Process Units */}
      {config.units.map((unit) => (
        <div
          key={unit.id}
          className="absolute"
          style={{
            left: `${unit.x}px`,
            top: `${unit.y}px`,
          }}
        >
          <ProcessUnit
            unit={unit}
            isRunning={isRunning}
            streamData={streamData}
            onStreamFlowChange={onStreamFlowChange}
            onStreamPropertyChange={onStreamPropertyChange}
            simulationData={simulationData}
          />
        </div>
      ))}

      {/* Connection Lines */}
      <svg
        className="absolute top-0 left-0 w-full h-full pointer-events-none z-10"
      >
        <defs>
          {/* Enhanced glow effects for professional look */}
          <filter id="pipeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        {generateConnectionLines()}
      </svg>
    </div>
  );
}

// Process Unit Component
function ProcessUnit({
  unit,
  isRunning,
  streamData,
  onStreamFlowChange,
  onStreamPropertyChange,
  simulationData,
}) {
  switch (unit.type) {
    case "StreamController":
      return (
        <StreamControllerUnit
          id={unit.id}
          data={streamData[unit.id]}
          onFlowChange={(value) => onStreamFlowChange(unit.id, value)}
          onPropertyChange={(property, value) => onStreamPropertyChange(unit.id, property, value)}
        />
      );

    case "Mixer":
      return <MixerUnit unit={unit} />;

    case "Reactor":
      return <ReactorUnit unit={unit} isRunning={isRunning} />;

    case "Condenser":
      return <CondenserUnit unit={unit} />;

    case "FlowmeterGroup":
      return <FlowmeterGroupUnit unit={unit} simulationData={simulationData} />;

    default:
      return <div>Unknown unit type: {unit.type}</div>;
  }
}

// Stream Controller Unit Component
function StreamControllerUnit({ id, data, onFlowChange, onPropertyChange }) {
  const streamInfo = {
    InletStream1: { label: "CO₂ Feed Stream", color: "bg-blue-500/20 border-blue-400", number: "3" },
    InletStream2: { label: "CH₄ Feed Stream", color: "bg-green-500/20 border-green-400", number: "4" },
  };

  const info = streamInfo[id] || { label: "Inlet Stream", color: "bg-gray-500/20 border-gray-400", number: "?" };

  return (
    <div className={`${info.color} border-2 rounded-xl p-3 shadow-xl backdrop-blur-sm`}
         style={{ width: '200px' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-white font-bold text-sm">Inlet Stream {info.number === "3" ? "1" : "2"}</div>
        <div className="text-xs text-gray-300">DWSIM S{info.number}</div>
      </div>
      
      <div className="text-xs text-center text-white font-medium mb-2">{info.label}</div>

      <div className="space-y-2">
        <div className="flex items-center space-x-1">
          <label className="text-gray-300 text-xs w-12">Flow:</label>
          <input
            type="number"
            step="0.1"
            value={data.pv}
            onChange={(e) => onFlowChange(e.target.value)}
            className="bg-gray-700/60 border border-gray-500 rounded px-2 py-1 text-white text-xs flex-1 focus:border-teal-400 focus:outline-none"
          />
          <span className="text-gray-400 text-xs">mg/s</span>
        </div>

        <div className="flex items-center space-x-1">
          <label className="text-gray-300 text-xs w-12">Temp:</label>
          <input
            type="number"
            value={data.temperature}
            onChange={(e) => onPropertyChange('temperature', e.target.value)}
            className="bg-gray-700/60 border border-gray-500 rounded px-2 py-1 text-white text-xs flex-1 focus:border-teal-400 focus:outline-none"
          />
          <span className="text-gray-400 text-xs">°C</span>
        </div>

        <div className="flex items-center space-x-1">
          <label className="text-gray-300 text-xs w-12">Press:</label>
          <input
            type="number"
            step="0.1"
            value={data.pressure}
            onChange={(e) => onPropertyChange('pressure', e.target.value)}
            className="bg-gray-700/60 border border-gray-500 rounded px-2 py-1 text-white text-xs flex-1 focus:border-teal-400 focus:outline-none"
          />
          <span className="text-gray-400 text-xs">bar</span>
        </div>

        <div className="text-center text-xs text-gray-400 mt-1">
          {data.gases?.[0]?.name || "N/A"}
        </div>
      </div>
    </div>
  );
}

// Mixer Unit Component - Professional design
function MixerUnit({ unit }) {
  return (
    <div
      className="relative flex items-center justify-center"
      style={{
        width: `${unit.width}px`,
        height: `${unit.height}px`,
      }}
    >
      {/* Main mixer body */}
      <div className="bg-purple-600/30 border-2 border-purple-400 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/30 relative w-full h-full">
        {/* Mixer symbol */}
        <div className="text-purple-200 text-2xl font-bold">⊕</div>
        
        {/* Inner mixing element */}
        <div className="absolute inset-2 border border-purple-400/40 rounded-full bg-purple-500/10"></div>
      </div>
      
      {/* Label */}
      <div className="absolute -bottom-10 text-xs text-purple-300 font-semibold whitespace-nowrap bg-gray-800/80 px-2 py-1 rounded">
        MIXER
      </div>
    </div>
  );
}

// Reactor Unit Component - Improved alignment and proportions
function ReactorUnit({ unit, isRunning }) {
  return (
    <div
      className="relative"
      style={{
        width: `${unit.width}px`,
        height: `${unit.height}px`,
      }}
    >
      <div
        className={`w-full h-full border-2 rounded-lg flex items-center justify-center relative transition-all duration-500 shadow-lg ${
          isRunning
            ? 'bg-gradient-to-b from-orange-500/40 to-red-500/40 border-orange-400 shadow-orange-500/40'
            : 'bg-gradient-to-b from-gray-600/40 to-gray-700/40 border-teal-400 shadow-teal-500/25'
        }`}
      >
        <div className="absolute top-2 text-xs font-bold text-white bg-black/40 px-2 py-1 rounded">
          DRM REACTOR
        </div>

        {/* Reactor internals visualization */}
        <div className="w-4/5 h-3/5 bg-white/10 rounded border border-white/20 relative overflow-hidden">
          <div className="absolute inset-1 bg-repeat opacity-60" 
               style={{
                 backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.1), rgba(255,255,255,0.1) 2px, transparent 2px, transparent 6px)'
               }}>
          </div>
          {/* Catalyst bed representation */}
          <div className="absolute bottom-1 left-1 right-1 h-2 bg-gradient-to-r from-gray-400/30 to-gray-500/30 rounded-sm"></div>
        </div>

        <div className="absolute bottom-2 text-xs text-white opacity-80">
          CH₄ + CO₂ → H₂ + CO
        </div>
      </div>
    </div>
  );
}

// Condenser Unit Component - Aligned and compact
function CondenserUnit({ unit }) {
  return (
    <div
      className="bg-cyan-500/20 border-2 border-cyan-400 rounded-lg flex flex-col items-center justify-center relative shadow-lg shadow-cyan-500/25"
      style={{
        width: `${unit.width}px`,
        height: `${unit.height}px`,
      }}
    >
      <div className="absolute top-1 text-xs font-bold text-cyan-300">
        CONDENSER
      </div>

      {/* Cooling coils visualization */}
      <div className="w-4/5 h-3/5 rounded bg-repeat flex items-center justify-center"
           style={{
             backgroundImage: 'repeating-linear-gradient(90deg, rgba(6, 182, 212, 0.2), rgba(6, 182, 212, 0.2) 2px, transparent 2px, transparent 6px)'
           }}>
        {/* Central cooling element */}
        <div className="w-1/2 h-1/2 border border-cyan-400/40 rounded bg-cyan-500/10"></div>
      </div>

      <div className="absolute bottom-1 text-xs text-cyan-300 opacity-80">
        Cooling
      </div>
    </div>
  );
}

// Flowmeter Group Unit Component - Professional alignment
function FlowmeterGroupUnit({ unit, simulationData }) {
  const flowmeters = [
    { id: "FM01", label: "S1", desc: "Hot Effluent", color: "bg-orange-500/20 border-orange-400 text-orange-300" },
    { id: "FM02", label: "S2", desc: "Cold Outlet", color: "bg-blue-500/20 border-blue-400 text-blue-300" },
    { id: "FM03", label: "S6", desc: "Syngas", color: "bg-green-500/20 border-green-400 text-green-300" },
  ];

  return (
    <div
      className="flex flex-col justify-center space-y-2"
      style={{
        width: `${unit.width}px`,
        height: `${unit.height}px`,
      }}
    >
      <div className="text-xs font-bold text-emerald-300 text-center mb-1">
        FLOWMETERS
      </div>
      {flowmeters.map((fm, index) => (
        <div
          key={fm.id}
          className={`${fm.color} border rounded p-1 text-center shadow-md transition-all duration-200 hover:shadow-lg`}
        >
          <div className="text-xs font-bold">{fm.id}</div>
          <div className="text-xs opacity-90">{fm.label}</div>
          <div className="text-xs opacity-70">{fm.desc}</div>
        </div>
      ))}
    </div>
  );
}

// Process Control Panel Component
function ProcessControlPanel({ streamConditions, onStreamChange, streamData, onStreamDataChange }) {
  return (
    <div className="p-4 space-y-4">
      <h3 className="text-lg font-bold text-teal-400">Process Control</h3>
      
      <div className="space-y-3">
        <h4 className="font-semibold text-gray-300">Reactor Conditions (Stream 1)</h4>
        
        <div className="bg-gray-700 p-3 rounded">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-400">Temperature (°C)</label>
              <input
                type="number"
                value={streamConditions.stream_1.temperature_C}
                onChange={(e) => onStreamChange('stream_1', 'temperature_C', e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm focus:border-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">Pressure (bar)</label>
              <input
                type="number"
                step="0.1"
                value={streamConditions.stream_1.pressure_bar}
                onChange={(e) => onStreamChange('stream_1', 'pressure_bar', e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm focus:border-teal-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <h4 className="font-semibold text-gray-300 mt-4">Feed Streams</h4>
        
        <div className="bg-gray-700 p-3 rounded">
          <div className="text-sm font-medium mb-2">Inlet Stream 1 - CO₂ Feed (DWSIM Stream 3)</div>
          <div className="text-xs text-gray-400 mb-1">
            Flow: {streamData.InletStream1?.pv || 0} mg/s | 
            Temp: {streamData.InletStream1?.temperature || 25}°C | 
            Press: {streamData.InletStream1?.pressure || 1.0} bar
          </div>
        </div>

        <div className="bg-gray-700 p-3 rounded">
          <div className="text-sm font-medium mb-2">Inlet Stream 2 - CH₄ Feed (DWSIM Stream 4)</div>
          <div className="text-xs text-gray-400 mb-1">
            Flow: {streamData.InletStream2?.pv || 0} mg/s | 
            Temp: {streamData.InletStream2?.temperature || 25}°C | 
            Press: {streamData.InletStream2?.pressure || 1.0} bar
          </div>
        </div>
      </div>
    </div>
  );
}

// Trends Panel Component
function TrendsPanel() {
  return (
    <div className="p-4">
      <h3 className="text-lg font-bold text-emerald-400 mb-4">Process Trends</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={mockTimeSeriesData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="time" stroke="#14b8a6" fontSize={10} />
            <YAxis stroke="#14b8a6" fontSize={10} />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '4px',
                fontSize: '12px'
              }}
            />
            <Line type="monotone" dataKey="ch4_conv" stroke="#10b981" strokeWidth={2} name="CH₄ Conversion (%)" />
            <Line type="monotone" dataKey="co2_conv" stroke="#14b8a6" strokeWidth={2} name="CO₂ Conversion (%)" />
            <Line type="monotone" dataKey="h2_co" stroke="#06d6a0" strokeWidth={2} name="H₂/CO Ratio" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// KPI Dashboard Component - Real-time process metrics
function KPIDashboard({ kpis }) {
  if (!kpis) return null;

  const kpiItems = [
    { label: "CH₄ Conv.", value: kpis.ch4_conversion, unit: "%", color: "text-green-400", threshold: 75 },
    { label: "CO₂ Conv.", value: kpis.co2_conversion, unit: "%", color: "text-blue-400", threshold: 70 },
    { label: "H₂/CO", value: kpis.h2_co_ratio, unit: "", color: "text-purple-400", decimals: 2, threshold: 0.8 },
    { label: "Purity", value: kpis.syngas_purity, unit: "%", color: "text-orange-400", threshold: 60 }
  ];

  return (
    <div className="bg-gray-800/95 backdrop-blur-sm border border-gray-600 rounded-lg p-4 shadow-xl">
      <div className="text-sm font-bold text-teal-300 mb-3 text-center">PROCESS KPIs</div>
      <div className="grid grid-cols-2 gap-3">
        {kpiItems.map((kpi, index) => (
          <div key={index} className="bg-gray-700/50 border border-gray-600 rounded p-2 text-center">
            <div className="text-xs text-gray-300 mb-1">{kpi.label}</div>
            <div className={`text-lg font-bold ${kpi.color}`}>
              {kpi.value.toFixed(kpi.decimals || 1)}{kpi.unit}
            </div>
            <div className="w-full bg-gray-600 rounded-full h-1 mt-1">
              <div 
                className={`h-1 rounded-full transition-all duration-500 ${
                  kpi.value >= kpi.threshold ? 'bg-green-500' : 'bg-orange-500'
                }`}
                style={{ width: `${Math.min(100, (kpi.value / (kpi.threshold * 1.5)) * 100)}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Results Panel Component - Enhanced with full API response
function ResultsPanel({ simulationData, isRunning }) {
  const [showLogs, setShowLogs] = useState(false);

  if (isRunning) {
    return (
      <div className="p-4 flex flex-col items-center justify-center h-48">
        <div className="w-12 h-12 border-4 border-teal-400 border-t-transparent rounded-full animate-spin mb-4"></div>
        <div className="text-teal-400 font-medium">Running Simulation...</div>
        <div className="text-xs text-gray-400 mt-2">Processing DWSIM model</div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-lg font-bold text-purple-400">Simulation Results</h3>
      
      {simulationData ? (
        <div className="space-y-3">
          {/* Status */}
          <div className="bg-gray-700 p-3 rounded">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-white">Status</div>
              <div className={`text-xs px-2 py-1 rounded ${
                simulationData.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {simulationData.success ? 'SUCCESS' : 'FAILED'}
              </div>
            </div>
            <div className="text-xs text-gray-300">{simulationData.timestamp}</div>
            {simulationData.flowsheet_name && (
              <div className="text-xs text-gray-400 mt-1">Model: {simulationData.flowsheet_name}</div>
            )}
          </div>

          {/* KPIs Summary */}
          {simulationData.kpis && (
            <div className="bg-gray-700 p-3 rounded">
              <div className="text-sm font-medium text-blue-400 mb-2">Performance Metrics</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-gray-300">
                  <span className="text-gray-400">CH₄ Conv:</span> {simulationData.kpis.ch4_conversion?.toFixed(1)}%
                </div>
                <div className="text-gray-300">
                  <span className="text-gray-400">CO₂ Conv:</span> {simulationData.kpis.co2_conversion?.toFixed(1)}%
                </div>
                <div className="text-gray-300">
                  <span className="text-gray-400">H₂/CO:</span> {simulationData.kpis.h2_co_ratio?.toFixed(2)}
                </div>
                <div className="text-gray-300">
                  <span className="text-gray-400">Purity:</span> {simulationData.kpis.syngas_purity?.toFixed(1)}%
                </div>
              </div>
            </div>
          )}

          {/* Output Streams */}
          {simulationData.output_streams && Object.keys(simulationData.output_streams).length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-teal-400">Key Output Streams</div>
              {Object.entries(simulationData.output_streams).map(([streamKey, streamInfo]) => (
                <div key={streamKey} className="bg-gray-700 p-2 rounded text-xs">
                  <div className="font-medium text-white mb-1">
                    {streamKey.replace('_', ' ').toUpperCase()}
                  </div>
                  {streamInfo.error ? (
                    <div className="text-red-400">{streamInfo.error}</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-gray-300">
                      <div>T: {streamInfo.temperature_C?.toFixed(1)}°C</div>
                      <div>P: {streamInfo.pressure_bar?.toFixed(2)} bar</div>
                      <div>Flow: {streamInfo.mass_flow_mg_s?.toFixed(2)} mg/s</div>
                      <div className={`${streamInfo.active ? 'text-green-400' : 'text-red-400'}`}>
                        {streamInfo.active ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Modifications Applied */}
          {simulationData.modifications_applied && simulationData.modifications_applied.length > 0 && (
            <div className="bg-gray-700 p-3 rounded">
              <div className="text-sm font-medium text-yellow-400 mb-2">Modifications Applied</div>
              <div className="space-y-1 max-h-20 overflow-y-auto">
                {simulationData.modifications_applied.map((mod, index) => (
                  <div key={index} className="text-xs text-gray-300">{mod}</div>
                ))}
              </div>
            </div>
          )}

          {/* Logs Section */}
          <div className="bg-gray-700 p-3 rounded">
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="w-full flex items-center justify-between text-sm font-medium text-cyan-400 hover:text-cyan-300"
            >
              <span>Full API Response</span>
              <span className="text-xs">{showLogs ? '▼' : '▶'}</span>
            </button>
            
            {showLogs && (
              <div className="mt-3 bg-gray-800 p-3 rounded text-xs font-mono text-gray-300 max-h-60 overflow-y-auto">
                <pre>{JSON.stringify(simulationData.raw_response, null, 2)}</pre>
              </div>
            )}
          </div>

          {/* Error Display */}
          {simulationData.error && (
            <div className="bg-red-500/20 border border-red-500/30 p-3 rounded">
              <div className="text-sm font-medium text-red-400 mb-1">Error</div>
              <div className="text-xs text-red-300">{simulationData.error}</div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center text-gray-400 py-8">
          <div className="text-4xl mb-2">⚗️</div>
          <div>No simulation results yet</div>
          <div className="text-xs mt-2">Configure parameters and run simulation</div>
        </div>
      )}
    </div>
  );
}

export { IndustrialDRMSimulation };