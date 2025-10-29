import React, { useMemo, useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import "./App.css";
import { Toaster } from "./components/ui/sonner.jsx";
import { Button } from "./components/ui/button.jsx";
import { ProcessTree } from "./components/process/ProcessTree.jsx";
import { InteractiveProcessFlow } from "./components/process/InteractiveProcessFlow.jsx";
import { KPIGrid } from "./components/metrics/KPIGrid.jsx";
import { metrics as DMR_METRICS } from "./config/dmr-map.js";
import Scene3D from "./components/scene/Scene3D.jsx";
import { DMRExpert } from "./components/expert/DMRExpert.jsx";
import { LoginForm } from "./components/auth/LoginForm.jsx";
import { ProtectedRoute } from "./components/auth/ProtectedRoute.jsx";
import { SimulationConsole } from "./pages/SimulationConsole.jsx";
import { DigitalTwinsLanding } from "./pages/DigitalTwinsLanding.jsx";
import { GrafanaMetrics } from "./pages/GrafanaMetrics.jsx";
import { Alerts } from "./pages/Alerts.jsx";
import { GrafanaMetricsPanel } from "./components/grafana/GrafanaMetricsPanel.jsx";
import { EnhancedMetricsDashboard } from "./components/grafana/EnhancedMetricsDashboard.jsx";
import { csvReader } from "./lib/sitewise.js";

const DEV_MODE = (import.meta?.env?.REACT_APP_DEV_MODE ?? process.env.REACT_APP_DEV_MODE ?? "true") === "true";
const BRAND = import.meta?.env?.VITE_BRAND_NAME ?? "AnukaranAI";
const BRAND_LOGO = import.meta?.env?.REACT_APP_BRAND_LOGO ?? process.env.REACT_APP_BRAND_LOGO ?? "/brand.png";

function Shell({ children, currentUser }) {
  const navigate = useNavigate();
  
  const handleLogout = () => {
    localStorage.removeItem('dmr_authenticated');
    localStorage.removeItem('dmr_user');
    localStorage.removeItem('dmr_user_data');
    // Clean up old SMR keys for migration
    localStorage.removeItem('smr_authenticated');
    localStorage.removeItem('smr_user');
    localStorage.removeItem('smr_user_data');
    navigate('/');
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand" aria-label={BRAND}>
          <img src={BRAND_LOGO} alt="brand" className="brand-logo" onError={(e)=>{e.currentTarget.style.display='none'}} />
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/metrics')}
            style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.3) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              borderRadius: '6px',
              padding: '8px 16px',
              color: '#10b981',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              backdropFilter: 'blur(10px)',
              textDecoration: 'none'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.3) 0%, rgba(5, 150, 105, 0.4) 100%)';
              e.target.style.boxShadow = '0 0 20px rgba(16, 185, 129, 0.3)';
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.3) 100%)';
              e.target.style.boxShadow = 'none';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            DMR Metrics Dashboard
          </button>
          <button
            onClick={() => navigate('/enhanced-metrics')}
            style={{
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(8, 145, 178, 0.3) 100%)',
              border: '1px solid rgba(6, 182, 212, 0.4)',
              borderRadius: '6px',
              padding: '8px 16px',
              color: '#06b6d4',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              backdropFilter: 'blur(10px)',
              textDecoration: 'none'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'linear-gradient(135deg, rgba(6, 182, 212, 0.3) 0%, rgba(8, 145, 178, 0.4) 100%)';
              e.target.style.boxShadow = '0 0 20px rgba(6, 182, 212, 0.3)';
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(8, 145, 178, 0.3) 100%)';
              e.target.style.boxShadow = 'none';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            📊 Enhanced Metrics
          </button>
          <button
            onClick={() => navigate('/alerts')}
            style={{
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.3) 100%)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '6px',
              padding: '8px 16px',
              color: '#ef4444',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              backdropFilter: 'blur(10px)',
              textDecoration: 'none',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.3) 0%, rgba(220, 38, 38, 0.4) 100%)';
              e.target.style.boxShadow = '0 0 20px rgba(239, 68, 68, 0.3)';
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.3) 100%)';
              e.target.style.boxShadow = 'none';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            🚨 Alerts
            <span style={{
              background: '#ef4444',
              color: '#ffffff',
              borderRadius: '10px',
              padding: '2px 6px',
              fontSize: '11px',
              fontWeight: '600',
              minWidth: '16px',
              textAlign: 'center',
              boxShadow: '0 0 8px rgba(239, 68, 68, 0.4)'
            }}>
              6
            </span>
          </button>
          {isAdmin && <a className="btn-outline" href="/simulation">Simulation Console</a>}
          <DMRExpert />
          <button className="btn-outline" onClick={handleLogout}>Logout</button>
        </div>
      </header>
      {children}
    </div>
  );
}

function Landing() {
  const heroImg = useMemo(() => "https://images.unsplash.com/photo-1635336969658-03690a37b8e5?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1ODF8MHwxfHNlYXJjaHw0fHxmdXR1cmlzdGljJTIwZGlnaXRhbHxlbnwwfHx8fDE3NTc0Mjg2OTR8MA&ixlib=rb-4.1.0&q=85&w=1600", []);
  
  return (
    <div className="hero">
      <div className="hero-card">
        <div className="hero-media">
          <img alt="Digital twin visualization" src={heroImg} />
        </div>
        <div className="hero-content">
          <img src={BRAND_LOGO} alt="AnukaranAI" className="hero-logo" onError={(e)=>{e.currentTarget.style.display='none'}} />
          <div className="hero-title">Digital Twin Platform</div>
          <div className="hero-sub">AnukaranAI provides advanced digital twin services, combining real-time data, simulations, and AI-powered insights to help industries monitor, predict, and optimize performance.</div>
          <div className="login-section">
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState("h2_inlet_pv");
  const [selectedProcessId, setSelectedProcessId] = useState("inlets");
  const [currentUser, setCurrentUser] = useState(null);

  // Load user info from localStorage
  useEffect(() => {
    const userData = localStorage.getItem('dmr_user_data') || localStorage.getItem('smr_user_data');
    if (userData) {
      try {
        setCurrentUser(JSON.parse(userData));
      } catch (e) {
        console.error('Failed to parse user data:', e);
      }
    }
  }, []);

  // Handle tag selection from 3D scene
  const handleTagSelect = (processId) => {
    setSelectedProcessId(processId);
    // Map process ID to corresponding metric
    const processToMetricMap = {
      "inlets": "h2_inlet_pv",
      "mfc": "h2_inlet_pv", 
      "preheaters": "preheater1_pv",
      "reactor": "furnace1_temp_pv",
      "condenser": "water_outlet_pv",
      "glc": "co_outlet_pv",
      "flowmeter": "ch4_outlet_pv",
      "outlet": "h2_outlet_pv"
    };
    const metricId = processToMetricMap[processId];
    if (metricId) {
      setSelected(metricId);
    }
  };

  // Handle process selection from Process Flow
  const handleProcessSelect = (metricId) => {
    setSelected(metricId);
    // Map metric ID to corresponding process
    const metricToProcessMap = {
      "h2_inlet_pv": "inlets",
      "ch4_inlet_pv": "inlets",
      "co2_inlet_pv": "inlets", 
      "n_inlet_pv": "inlets",
      "air_inlet_pv": "inlets",
      "preheater1_pv": "preheaters",
      "preheater2_pv": "preheaters",
      "preheater3_pv": "preheaters",
      "preheater4_pv": "preheaters",
      "furnace1_temp_pv": "reactor",
      "furnace2_temp_pv": "reactor",
      "furnace3_temp_pv": "reactor",
      "water_outlet_pv": "condenser",
      "co_outlet_pv": "glc",
      "ch4_outlet_pv": "flowmeter",
      "h2_outlet_pv": "outlet"
    };
    const processId = metricToProcessMap[metricId] || "inlets";
    setSelectedProcessId(processId);
  };

  return (
    <Shell currentUser={currentUser}>
      <aside className="left-pane">
        <InteractiveProcessFlow onSelect={handleProcessSelect} selectedId={selected} />
      </aside>
      <main className="center-pane">
        <div style={{height:'100%'}}>
          <Scene3D 
            selectedProcessId={selectedProcessId}
            onTagSelect={handleTagSelect}
          />
        </div>
      </main>
      <aside className="right-pane">
        <div style={{ height: 'calc(100vh - 80px)', overflow: 'auto', paddingRight: 6 }}>
          <GrafanaMetricsPanel 
            compact={true} 
            showModal={true} 
            maxMetrics={12}
            showHeader={true}
          />
        </div>
      </aside>
    </Shell>
  );
}

function Metrics() {
  return <GrafanaMetrics />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/digital-twins" element={
          <ProtectedRoute>
            <DigitalTwinsLanding />
          </ProtectedRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/metrics" element={
          <ProtectedRoute>
            <Metrics />
          </ProtectedRoute>
        } />
        <Route path="/simulation" element={
          <ProtectedRoute>
            <SimulationConsole />
          </ProtectedRoute>
        } />
        <Route path="/alerts" element={
          <ProtectedRoute>
            <Alerts />
          </ProtectedRoute>
        } />
        <Route path="/enhanced-metrics" element={
          <ProtectedRoute>
            <EnhancedMetricsDashboard />
          </ProtectedRoute>
        } />
      </Routes>
      <Toaster richColors position="top-right" />
    </BrowserRouter>
  );
}