import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getLiveValue, getAggregates } from '../../lib/sitewise';
import { inletMetrics, outletMetrics } from '../../config/dmr-map.js';

// Process flow configuration
const PROCESS_COMPONENTS = [
  {
    id: 'mfc',
    type: 'controller',
    label: 'MFC',
    sublabel: 'Mass Flow Controller',
    position: { x: 150, y: 80 },
    color: '#10b981', // Green for consistency
    metrics: ['Air_Inlet_Flowrate_Process_value'] // Representative metric
  },
  {
    id: 'inlets',
    type: 'inlets',
    label: 'Inlets',
    position: { x: 150, y: 230 }, // Increased spacing: 150px gap
    color: '#10b981', // Green for consistency
    subComponents: [
      { id: 'h2_inlet', label: 'H₂', metrics: ['H2_Inlet_Flowrate_Process_value'] },
      { id: 'ch4_inlet', label: 'CH₄', metrics: ['CH4_Inlet_Flowrate_Process_value'] },
      { id: 'co2_inlet', label: 'CO₂', metrics: ['CO2_Inlet_Flowrate_Process_value'] },
      { id: 'n2_inlet', label: 'N₂', metrics: ['N2_Inlet_Flowrate_Process_value'] },
      { id: 'air_inlet', label: 'Air', metrics: ['Air_Inlet_Flowrate_Process_value'] }
    ]
  },
  {
    id: 'preheaters',
    type: 'heater',
    label: 'Heaters',
    position: { x: 150, y: 380 }, // Increased spacing: 150px gap
    color: '#10b981', // Green for consistency
    expandable: true,
    subComponents: [
      { id: 'preheater1', label: 'PH1', metrics: ['Temp_preheater_1_Process_value'] },
      { id: 'preheater2', label: 'PH2', metrics: ['Temp_preheater_2_Process_value'] },
      { id: 'preheater3', label: 'PH3', metrics: ['Temp_preheater_3_Process_value'] },
      { id: 'preheater4', label: 'PH4', metrics: ['Temp_preheater_4_Process_value'] }
    ]
  },
  {
    id: 'reactor',
    type: 'reactor',
    label: 'Reactor',
    position: { x: 150, y: 530 }, // Increased spacing: 150px gap
    color: '#10b981', // Green for consistency
    metrics: ['Temp_reactor_furnace_1_Process_value', 'Temp_reactor_furnace_2_Process_value', 'Temp_reactor_furnace_3_Process_value']
  },
  {
    id: 'pressure_sensor',
    type: 'sensor',
    label: 'Pressure',
    sublabel: 'Sensor',
    position: { x: 250, y: 530 }, // Same level as reactor, increased spacing
    color: '#10b981', // Green for consistency
    metrics: ['Pressure_reactor_Process_value']
  },
  {
    id: 'condenser',
    type: 'separator',
    label: 'Condenser',
    position: { x: 150, y: 680 }, // Increased spacing: 150px gap
    color: '#10b981', // Green for consistency
    metrics: ['Water_outlet_Flowrate_Process_value']
  },
  {
    id: 'glc',
    type: 'separator',
    label: 'Separator',
    sublabel: 'GLC',
    position: { x: 150, y: 830 }, // Increased spacing: 150px gap
    color: '#10b981', // Green for consistency
    metrics: ['CO_outlet_Flowrate_Process_value']
  },
  {
    id: 'flowmeter',
    type: 'sensor',
    label: 'Flow Meter',
    position: { x: 150, y: 980 }, // Increased spacing: 150px gap
    color: '#10b981', // Green for consistency
    metrics: ['H2_outlet_Flowrate_Process_value', 'N2_outlet_Flowrate_Process_value', 'CH4_outlet_Flowrate_Process_value', 'CO2_outlet_Flowrate_Process_value']
  },
  {
    id: 'outlet',
    type: 'outlet',
    label: 'Outlet',
    position: { x: 150, y: 1130 }, // Increased spacing: 150px gap
    color: '#10b981', // Green for consistency
    metrics: ['H2_outlet_Flowrate_Process_value', 'CH4_outlet_Flowrate_Process_value']
  }
];

// Connection paths for arrows (vertical flow) - Updated for improved spacing
const CONNECTIONS = [
  { from: 'mfc', to: 'inlets', path: 'M 150 110 L 150 200' }, // MFC (y:80+30) to Inlets (y:230-30)
  { from: 'inlets', to: 'preheaters', path: 'M 150 260 L 150 350' }, // Inlets (y:230+30) to Heaters (y:380-30)
  { from: 'preheaters', to: 'reactor', path: 'M 150 410 L 150 500' }, // Heaters (y:380+30) to Reactor (y:530-30)
  { from: 'reactor', to: 'pressure_sensor', path: 'M 180 530 L 220 530', type: 'branch' }, // Branch to Pressure sensor
  { from: 'reactor', to: 'condenser', path: 'M 150 560 L 150 650' }, // Reactor (y:530+30) to Condenser (y:680-30)
  { from: 'condenser', to: 'glc', path: 'M 150 710 L 150 800' }, // Condenser (y:680+30) to Separator (y:830-30)
  { from: 'glc', to: 'flowmeter', path: 'M 150 860 L 150 950' }, // Separator (y:830+30) to Flow Meter (y:980-30)
  { from: 'flowmeter', to: 'outlet', path: 'M 150 1010 L 150 1100' } // Flow Meter (y:980+30) to Outlet (y:1130-30)
];

function ProcessComponent({ 
  component, 
  liveData, 
  onHover, 
  onLeave, 
  onClick, 
  isExpanded,
  isMobile = false 
}) {
  const [isHovered, setIsHovered] = useState(false);
  
  // Get quality status from metrics
  const getQualityStatus = () => {
    if (!component.metrics || component.metrics.length === 0) return 'good';
    
    // Check quality of primary metric
    const primaryMetric = component.metrics[0];
    const data = liveData[primaryMetric];
    if (!data) return 'unknown';
    
    const quality = data.quality?.toUpperCase();
    if (quality === 'GOOD') return 'good';
    if (quality === 'WARN') return 'warning';  
    if (quality === 'BAD') return 'critical';
    return 'unknown';
  };

  const status = getQualityStatus();
  const statusColors = {
    good: '#10b981',
    warning: '#f59e0b', 
    critical: '#ef4444',
    unknown: '#6b7280'
  };

  const componentSize = isMobile ? 60 : 80;
  const fontSize = isMobile ? '10px' : '12px';
  const nameSize = isMobile ? '10px' : '12px';

  // Create gradient IDs
  const gradientId = `gradient-${component.id}`;
  const glowId = `glow-${component.id}`;

  return (
    <g
      onMouseEnter={() => {
        setIsHovered(true);
        onHover && onHover(component);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        onLeave && onLeave();
      }}
      onClick={() => onClick && onClick(component)}
      style={{ cursor: 'pointer' }}
    >
      {/* Define gradients for this component */}
      <defs>
        <radialGradient id={gradientId} cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor={`${component.color}40`} />
          <stop offset="70%" stopColor={component.color} />
          <stop offset="100%" stopColor={`${component.color}80`} />
        </radialGradient>
        <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* Star-like glow effect border */}
      <circle
        cx={component.position.x}
        cy={component.position.y}
        r={componentSize / 2 + (isHovered ? 8 : 4)}
        fill="none"
        stroke={component.color}
        strokeWidth={isHovered ? "3" : "2"}
        opacity={isHovered ? "0.8" : "0.4"}
        filter={`url(#${glowId})`}
        style={{
          transition: 'all 0.3s ease'
        }}
      />

      {/* Main component circle with gradient */}
      <circle
        cx={component.position.x}
        cy={component.position.y}
        r={componentSize / 2}
        fill={`url(#${gradientId})`}
        stroke={component.color}
        strokeWidth="2"
        style={{
          transition: 'all 0.3s ease',
          transform: isHovered ? 'scale(1.05)' : 'scale(1)',
          transformOrigin: `${component.position.x}px ${component.position.y}px`
        }}
      />
      
      {/* Component name inside circle */}
      <text
        x={component.position.x}
        y={component.position.y}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={nameSize}
        fontWeight="700"
        fill="#ffffff"
        style={{
          textShadow: '0 1px 3px rgba(0,0,0,0.8)',
          userSelect: 'none'
        }}
      >
        {component.label}
      </text>
      
      {/* Status LED */}
      <circle
        cx={component.position.x + (componentSize / 2) - 8}
        cy={component.position.y - (componentSize / 2) + 8}
        r="4"
        fill={statusColors[status]}
        stroke="#000"
        strokeWidth="1"
      >
        <animate
          attributeName="opacity"
          values="1;0.3;1"
          dur="2s"
          repeatCount="indefinite"
        />
      </circle>
      
      {/* Sublabel below circle if exists */}
      {component.sublabel && (
        <text
          x={component.position.x}
          y={component.position.y + (componentSize / 2) + 15}
          textAnchor="middle"
          fill="#9ca3af"
          fontSize={isMobile ? '8px' : '10px'}
          fontWeight="500"
        >
          {component.sublabel}
        </text>
      )}
      
      {/* Expandable indicator */}
      {component.expandable && (
        <circle
          cx={component.position.x + (componentSize / 2) - 8}
          cy={component.position.y + (componentSize / 2) - 8}
          r="6"
          fill="#3b82f6"
          stroke="#ffffff"
          strokeWidth="1"
        />
      )}
      
      {/* Expanded subcomponents */}
      {isExpanded && component.subComponents && (
        <g>
          {component.subComponents.map((sub, index) => (
            <g key={sub.id}>
              <circle
                cx={component.position.x + (index - 1) * 40}
                cy={component.position.y + 80}
                r="20"
                fill={`${component.color}40`}
                stroke={component.color}
                strokeWidth="1"
              />
              <text
                x={component.position.x + (index - 1) * 40}
                y={component.position.y + 80}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#ffffff"
                fontSize="8px"
                fontWeight="500"
              >
                {sub.label}
              </text>
            </g>
          ))}
        </g>
      )}
    </g>
  );
}

function AnimatedConnection({ connection, flowRate = 1, isActive = true }) {
  const animationSpeed = Math.max(0.5, Math.min(3, flowRate));
  const strokeWidth = Math.max(4, Math.min(8, 4 + (flowRate * 0.8))); // Thicker arrows
  
  // Bright cyan/neon blue colors for enhanced visibility
  const primaryColor = '#00ffff'; // Bright cyan
  const secondaryColor = '#00d4ff'; // Slightly darker cyan
  const branchColor = '#4fd1c7'; // Cyan for branch connections
  
  return (
    <g>
      {/* Base connection line with enhanced styling */}
      <path
        d={connection.path}
        stroke={connection.type === 'branch' ? branchColor : primaryColor}
        strokeWidth={strokeWidth}
        fill="none"
        opacity="0.8"
        style={{
          filter: 'drop-shadow(0 0 4px rgba(0, 255, 255, 0.5))', // Subtle glow effect
        }}
      />
      
      {/* Animated flow particles with enhanced colors */}
      {isActive && (
        <>
          <circle r="4" fill={primaryColor} opacity="0.9">
            <animateMotion
              dur={`${3.5 / animationSpeed}s`}
              repeatCount="indefinite"
              path={connection.path}
            />
          </circle>
          <circle r="3" fill={secondaryColor} opacity="0.7">
            <animateMotion
              dur={`${3.5 / animationSpeed}s`}
              repeatCount="indefinite"
              path={connection.path}
              begin="0.6s"
            />
          </circle>
          <circle r="2" fill="#66d9ef" opacity="0.5">
            <animateMotion
              dur={`${3.5 / animationSpeed}s`}
              repeatCount="indefinite"
              path={connection.path}
              begin="1.2s"
            />
          </circle>
        </>
      )}
      
      {/* Enhanced arrow marker - larger and more prominent */}
      <defs>
        <marker
          id="arrowhead-enhanced"
          markerWidth="16"
          markerHeight="12"
          refX="14"
          refY="6"
          orient="auto"
        >
          <polygon
            points="0 0, 16 6, 0 12"
            fill={connection.type === 'branch' ? branchColor : primaryColor}
            style={{
              filter: 'drop-shadow(0 0 2px rgba(0, 255, 255, 0.3))',
            }}
          />
        </marker>
      </defs>
      <path
        d={connection.path}
        stroke="transparent"
        strokeWidth="2"
        fill="none"
        markerEnd="url(#arrowhead-enhanced)"
      />
    </g>
  );
}

function CondenserMetricsWindow({ liveData, mousePosition, svgDimensions, isVisible, opacity, onClose, onMouseEnter, onMouseLeave, isMobile }) {
  const windowWidth = isMobile ? 320 : 420;
  const windowHeight = isMobile ? 160 : 200;
  
  // Get viewport dimensions for proper positioning
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // Calculate absolute position based on mouse position and container offset
  const container = document.querySelector('.interactive-process-flow');
  const containerRect = container ? container.getBoundingClientRect() : { left: 0, top: 0 };
  
  // Fixed positioning relative to viewport (not inside SVG)
  let absoluteX = containerRect.left + mousePosition.x + 20; // Default right offset
  let absoluteY = containerRect.top + mousePosition.y - windowHeight / 2;
  
  // Enhanced viewport-based positioning - default right
  if (absoluteX + windowWidth > viewportWidth - 20) {
    // Try left side of node if right doesn't fit
    absoluteX = containerRect.left + mousePosition.x - windowWidth - 20;
    
    // If still doesn't fit, position at far right with margin
    if (absoluteX < 20) {
      absoluteX = viewportWidth - windowWidth - 20;
    }
  }
  
  // Vertical positioning with viewport bounds - auto-adjust to stay in viewport
  if (absoluteY < 20) {
    absoluteY = 20;
  } else if (absoluteY + windowHeight > viewportHeight - 20) {
    absoluteY = viewportHeight - windowHeight - 20;
  }

  // Render window as a positioned div
  return (
    <div
      style={{
        position: 'fixed',
        left: absoluteX,
        top: absoluteY,
        width: windowWidth,
        height: windowHeight,
        background: 'rgba(17, 24, 39, 0.98)',
        border: '3px solid rgba(16, 185, 129, 0.7)',
        borderRadius: '20px',
        padding: '20px',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 12px 48px rgba(0, 0, 0, 0.6), 0 8px 24px rgba(0, 0, 0, 0.4)',
        zIndex: 10001,
        opacity: opacity,
        transition: 'opacity 0.3s ease-in-out',
        pointerEvents: isVisible ? 'all' : 'none',
        color: '#ffffff',
        fontSize: isMobile ? '12px' : '14px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Header */}
      <div style={{
        fontSize: isMobile ? '15px' : '18px',
        fontWeight: '700',
        marginBottom: '8px',
        color: '#ffffff',
        textAlign: 'center'
      }}>
        Condenser
      </div>
      
      {/* Placeholder content */}
      <div style={{
        fontSize: isMobile ? '13px' : '15px',
        color: '#9ca3af',
        textAlign: 'center',
        fontStyle: 'italic'
      }}>
        No metrics available for Condenser
      </div>
      
      {/* Interaction hint */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: '12px',
        color: 'rgba(16, 185, 129, 0.7)'
      }}>
        Hover to keep open
      </div>
    </div>
  );
}

function SeparatorMetricsWindow({ liveData, mousePosition, svgDimensions, isVisible, opacity, onClose, onMouseEnter, onMouseLeave, isMobile }) {
  const windowWidth = isMobile ? 320 : 420;
  const windowHeight = isMobile ? 160 : 200;
  
  // Get viewport dimensions for proper positioning
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // Calculate absolute position based on mouse position and container offset
  const container = document.querySelector('.interactive-process-flow');
  const containerRect = container ? container.getBoundingClientRect() : { left: 0, top: 0 };
  
  // Fixed positioning relative to viewport (not inside SVG)
  let absoluteX = containerRect.left + mousePosition.x + 20; // Default right offset
  let absoluteY = containerRect.top + mousePosition.y - windowHeight / 2;
  
  // Enhanced viewport-based positioning - default right
  if (absoluteX + windowWidth > viewportWidth - 20) {
    // Try left side of node if right doesn't fit
    absoluteX = containerRect.left + mousePosition.x - windowWidth - 20;
    
    // If still doesn't fit, position at far right with margin
    if (absoluteX < 20) {
      absoluteX = viewportWidth - windowWidth - 20;
    }
  }
  
  // Vertical positioning with viewport bounds - auto-adjust to stay in viewport
  if (absoluteY < 20) {
    absoluteY = 20;
  } else if (absoluteY + windowHeight > viewportHeight - 20) {
    absoluteY = viewportHeight - windowHeight - 20;
  }

  // Render window as a positioned div
  return (
    <div
      style={{
        position: 'fixed',
        left: absoluteX,
        top: absoluteY,
        width: windowWidth,
        height: windowHeight,
        background: 'rgba(17, 24, 39, 0.98)',
        border: '3px solid rgba(16, 185, 129, 0.7)',
        borderRadius: '20px',
        padding: '20px',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 12px 48px rgba(0, 0, 0, 0.6), 0 8px 24px rgba(0, 0, 0, 0.4)',
        zIndex: 10001,
        opacity: opacity,
        transition: 'opacity 0.3s ease-in-out',
        pointerEvents: isVisible ? 'all' : 'none',
        color: '#ffffff',
        fontSize: isMobile ? '12px' : '14px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Header */}
      <div style={{
        fontSize: isMobile ? '15px' : '18px',
        fontWeight: '700',
        marginBottom: '8px',
        color: '#ffffff',
        textAlign: 'center'
      }}>
        Separator
      </div>
      
      {/* Placeholder content */}
      <div style={{
        fontSize: isMobile ? '13px' : '15px',
        color: '#9ca3af',
        textAlign: 'center',
        fontStyle: 'italic'
      }}>
        No metrics available for Separator
      </div>
      
      {/* Interaction hint */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: '12px',
        color: 'rgba(16, 185, 129, 0.7)'
      }}>
        Hover to keep open
      </div>
    </div>
  );
}
function PressureMetricsWindow({ liveData, mousePosition, svgDimensions, isVisible, opacity, onClose, onMouseEnter, onMouseLeave, isMobile }) {
  const windowWidth = isMobile ? 350 : 450;
  const windowHeight = isMobile ? 220 : 280;
  
  // Get viewport dimensions for proper positioning
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // Calculate absolute position based on mouse position and container offset
  const container = document.querySelector('.interactive-process-flow');
  const containerRect = container ? container.getBoundingClientRect() : { left: 0, top: 0 };
  
  // Fixed positioning relative to viewport (not inside SVG)
  let absoluteX = containerRect.left + mousePosition.x + 20; // Default right offset
  let absoluteY = containerRect.top + mousePosition.y - windowHeight / 2;
  
  // Enhanced viewport-based positioning - default right
  if (absoluteX + windowWidth > viewportWidth - 20) {
    // Try left side of node if right doesn't fit
    absoluteX = containerRect.left + mousePosition.x - windowWidth - 20;
    
    // If still doesn't fit, position at far right with margin
    if (absoluteX < 20) {
      absoluteX = viewportWidth - windowWidth - 20;
    }
  }
  
  // Vertical positioning with viewport bounds - auto-adjust to stay in viewport
  if (absoluteY < 20) {
    absoluteY = 20;
  } else if (absoluteY + windowHeight > viewportHeight - 20) {
    absoluteY = viewportHeight - windowHeight - 20;
  }
  
  const getMetricData = (metricKey) => {
    const data = liveData[metricKey];
    if (!data) return { value: '—', unit: '', quality: 'UNKNOWN' };
    return {
      value: data.value != null ? Number(data.value).toFixed(2) : '—', // 2 decimals for pressure
      unit: data.unit || 'bar',
      quality: data.quality || 'UNKNOWN'
    };
  };

  const getQualityColor = (quality) => {
    switch (quality?.toUpperCase()) {
      case 'GOOD': return '#10b981';
      case 'WARN': return '#f59e0b';
      case 'BAD': return '#ef4444';
      default: return '#6b7280';
    }
  };

  // Calculate status - placeholder logic for now
  const getPressureStatus = (sv, pv) => {
    // Placeholder status logic - user requested placeholder
    return {
      status: 'GOOD', // Placeholder - always show GOOD for now
      color: '#10b981' // Green
    };
  };

  // Get pressure data
  const svData = getMetricData('Pressure_reactor_Set_value');
  const pvData = getMetricData('Pressure_reactor_Process_value');
  const qualityColor = getQualityColor(pvData.quality);
  const pressureStatus = getPressureStatus(svData.value, pvData.value);

  // Render pressure window content
  return (
    <div
      style={{
        position: 'fixed',
        left: absoluteX,
        top: absoluteY,
        width: windowWidth,
        height: windowHeight,
        background: 'rgba(17, 24, 39, 0.98)',
        border: '3px solid rgba(16, 185, 129, 0.7)',
        borderRadius: '20px',
        padding: '20px',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 12px 48px rgba(0, 0, 0, 0.6), 0 8px 24px rgba(0, 0, 0, 0.4)',
        zIndex: 10001,
        opacity: opacity,
        transition: 'opacity 0.3s ease-in-out',
        pointerEvents: isVisible ? 'all' : 'none',
        color: '#ffffff',
        fontSize: isMobile ? '12px' : '14px',
        overflow: 'hidden'
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Header */}
      <div style={{
        fontSize: isMobile ? '16px' : '18px',
        fontWeight: '700',
        marginBottom: '8px',
        color: '#ffffff'
      }}>
        Reactor Pressure Controller
      </div>
      
      <div style={{
        fontSize: isMobile ? '12px' : '14px',
        color: '#10b981',
        fontWeight: '500',
        marginBottom: '16px'
      }}>
        DMR Reactor Pressure Control
      </div>
      
      {/* PIC 101 Section */}
      <div style={{
        background: 'rgba(16, 185, 129, 0.08)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        borderRadius: '12px',
        padding: '16px'
      }}>
        {/* Controller Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px'
        }}>
          <div>
            <div style={{
              fontSize: isMobile ? '14px' : '16px',
              fontWeight: '700',
              color: '#10b981',
              marginBottom: '2px'
            }}>
              PIC 101
            </div>
            <div style={{
              fontSize: isMobile ? '11px' : '12px',
              color: '#9ca3af'
            }}>
              Reactor Pressure Controller
            </div>
            <div style={{
              fontSize: isMobile ? '10px' : '11px',
              color: '#6b7280',
              fontStyle: 'italic'
            }}>
              Metric: Reactor Pressure
            </div>
          </div>
          
          {/* Status Badge - Placeholder */}
          <div style={{
            fontSize: isMobile ? '10px' : '11px',
            color: '#ffffff',
            background: pressureStatus.color,
            padding: '4px 8px',
            borderRadius: '6px',
            fontWeight: '600',
            boxShadow: `0 0 8px ${pressureStatus.color}40`
          }}>
            {pressureStatus.status}
          </div>
        </div>
        
        {/* Pressure Values Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 60px',
          gap: '12px',
          alignItems: 'center'
        }}>
          {/* Set Variable (SV) */}
          <div>
            <div style={{
              fontSize: isMobile ? '10px' : '11px',
              color: '#9ca3af',
              marginBottom: '4px'
            }}>
              Set Variable (SV)
            </div>
            <div style={{
              fontSize: isMobile ? '14px' : '16px',
              fontWeight: '600',
              color: '#ffffff'
            }}>
              {svData.value !== '—' ? `${svData.value} ${svData.unit}` : '—'}
            </div>
          </div>
          
          {/* Process Variable (PV) */}
          <div>
            <div style={{
              fontSize: isMobile ? '10px' : '11px',
              color: '#9ca3af',
              marginBottom: '4px'
            }}>
              Process Variable (PV)
            </div>
            <div style={{
              fontSize: isMobile ? '14px' : '16px',
              fontWeight: '600',
              color: '#10b981'
            }}>
              {pvData.value !== '—' ? `${pvData.value} ${pvData.unit}` : '—'}
            </div>
          </div>
          
          {/* Status indicator */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: qualityColor,
              border: '1px solid rgba(255,255,255,0.4)'
            }} />
            <span style={{
              fontSize: '9px',
              fontWeight: '600',
              color: qualityColor
            }}>
              {pvData.quality}
            </span>
          </div>
        </div>
      </div>
      
      {/* Interaction hint */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        left: '20px',
        fontSize: '12px',
        color: 'rgba(16, 185, 129, 0.7)'
      }}>
        Hover to keep open
      </div>
    </div>
  );
}

function InletsMetricsWindow({ liveData, mousePosition, svgDimensions, isVisible, opacity, onClose, onMouseEnter, onMouseLeave, isMobile }) {
  const windowWidth = isMobile ? 320 : 420;
  const windowHeight = isMobile ? 240 : 320;
  
  // Get viewport dimensions for proper positioning
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // Calculate absolute position based on mouse position and container offset
  const container = document.querySelector('.interactive-process-flow');
  const containerRect = container ? container.getBoundingClientRect() : { left: 0, top: 0 };
  
  // Fixed positioning relative to viewport (not inside SVG)
  let absoluteX = containerRect.left + mousePosition.x + 20; // Default right offset
  let absoluteY = containerRect.top + mousePosition.y - windowHeight / 2;
  
  // Enhanced viewport-based positioning - default right
  if (absoluteX + windowWidth > viewportWidth - 20) {
    // Try left side of node if right doesn't fit
    absoluteX = containerRect.left + mousePosition.x - windowWidth - 20;
    
    // If still doesn't fit, position at far right with margin
    if (absoluteX < 20) {
      absoluteX = viewportWidth - windowWidth - 20;
    }
  }
  
  // Vertical positioning with viewport bounds - auto-adjust to stay in viewport
  if (absoluteY < 20) {
    absoluteY = 20;
  } else if (absoluteY + windowHeight > viewportHeight - 20) {
    absoluteY = viewportHeight - windowHeight - 20;
  }
  
  const inletMetrics = [
    { label: 'H₂ Inlet', setKey: 'H2_Inlet_Flowrate_Set_value', pvKey: 'H2_Inlet_Flowrate_Process_value' },
    { label: 'CH₄ Inlet', setKey: 'CH4_Inlet_Flowrate_Set_value', pvKey: 'CH4_Inlet_Flowrate_Process_value' },
    { label: 'CO₂ Inlet', setKey: 'CO2_Inlet_Flowrate_Set_value', pvKey: 'CO2_Inlet_Flowrate_Process_value' },
    { label: 'N₂ Inlet', setKey: 'N2_Inlet_Flowrate_Set_value', pvKey: 'N2_Inlet_Flowrate_Process_value' },
    { label: 'Air Inlet', setKey: 'Air_Inlet_Flowrate_Set_value', pvKey: 'Air_Inlet_Flowrate_Process_value' }
  ];
  
  const getMetricData = (metricKey) => {
    const data = liveData[metricKey];
    if (!data) return { value: '—', unit: '', quality: 'UNKNOWN' };
    return {
      value: data.value != null ? Number(data.value).toFixed(1) : '—',
      unit: data.unit || 'ml/min',
      quality: data.quality || 'UNKNOWN'
    };
  };

  const getQualityColor = (quality) => {
    switch (quality?.toUpperCase()) {
      case 'GOOD': return '#10b981';
      case 'WARN': return '#f59e0b';
      case 'BAD': return '#ef4444';
      default: return '#6b7280';
    }
  };

  // Render window as a positioned div within the component
  return (
    <div
      style={{
        position: 'fixed',
        left: absoluteX,
        top: absoluteY,
        width: windowWidth,
        height: windowHeight,
        background: 'rgba(17, 24, 39, 0.98)',
        border: '3px solid rgba(16, 185, 129, 0.7)',
        borderRadius: '20px',
        padding: '20px',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 12px 48px rgba(0, 0, 0, 0.6), 0 8px 24px rgba(0, 0, 0, 0.4)',
        zIndex: 10001,
        opacity: opacity,
        transition: 'opacity 0.3s ease-in-out',
        pointerEvents: isVisible ? 'all' : 'none',
        color: '#ffffff',
        fontSize: isMobile ? '12px' : '14px',
        overflow: 'hidden'
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Header */}
      <div style={{
        fontSize: isMobile ? '15px' : '18px',
        fontWeight: '700',
        marginBottom: '8px',
        color: '#ffffff'
      }}>
        Inlet Metrics
      </div>
      
      <div style={{
        fontSize: isMobile ? '12px' : '14px',
        color: '#10b981',
        fontWeight: '500',
        marginBottom: '16px'
      }}>
        Live Process Data
      </div>
      
      {/* Table header */}
      <div style={{
        borderBottom: '2px solid rgba(16, 185, 129, 0.5)',
        paddingBottom: '8px',
        marginBottom: '12px'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '80px 80px 100px 80px',
          gap: '8px',
          fontSize: '12px',
          fontWeight: '600',
          color: '#9ca3af'
        }}>
          <div>Gas</div>
          <div>Setpoint</div>
          <div>Process</div>
          <div>Status</div>
        </div>
      </div>
      
      {/* Inlet metrics rows */}
      <div style={{ height: windowHeight - 120, overflowY: 'auto' }}>
        {inletMetrics.map((inlet, index) => {
          const setData = getMetricData(inlet.setKey);
          const pvData = getMetricData(inlet.pvKey);
          const qualityColor = getQualityColor(pvData.quality);
          
          return (
            <div key={inlet.label} style={{
              display: 'grid',
              gridTemplateColumns: '80px 80px 100px 80px',
              gap: '8px',
              alignItems: 'center',
              background: index % 2 === 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.04)',
              borderRadius: '8px',
              padding: '8px 6px',
              marginBottom: '6px'
            }}>
              {/* Gas name */}
              <div style={{
                fontSize: isMobile ? '12px' : '14px',
                fontWeight: '600',
                color: '#ffffff'
              }}>
                {inlet.label}
              </div>
              
              {/* Setpoint */}
              <div style={{
                fontSize: isMobile ? '11px' : '13px',
                color: '#9ca3af'
              }}>
                {setData.value}
              </div>
              
              {/* Process value */}
              <div style={{
                fontSize: isMobile ? '11px' : '13px',
                color: '#10b981',
                fontWeight: '600'
              }}>
                {pvData.value} {pvData.unit}
              </div>
              
              {/* Quality indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: qualityColor,
                  border: '1px solid rgba(255,255,255,0.4)'
                }} />
                <span style={{
                  fontSize: '11px',
                  fontWeight: '600',
                  color: qualityColor
                }}>
                  {pvData.quality}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Interaction hint */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        left: '20px',
        fontSize: '12px',
        color: 'rgba(16, 185, 129, 0.7)'
      }}>
        Hover to keep open
      </div>
    </div>
  );
}
function FlowmeterMetricsWindow({ liveData, mousePosition, svgDimensions, isVisible, opacity, onClose, onMouseEnter, onMouseLeave, isMobile }) {
  const windowWidth = isMobile ? 320 : 420;
  const windowHeight = isMobile ? 200 : 260;
  
  // Get viewport dimensions for proper positioning
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // Calculate absolute position based on mouse position and container offset
  const container = document.querySelector('.interactive-process-flow');
  const containerRect = container ? container.getBoundingClientRect() : { left: 0, top: 0 };
  
  // Fixed positioning relative to viewport (not inside SVG)
  let absoluteX = containerRect.left + mousePosition.x + 20; // Default right offset
  let absoluteY = containerRect.top + mousePosition.y - windowHeight / 2;
  
  // Enhanced viewport-based positioning - default right
  if (absoluteX + windowWidth > viewportWidth - 20) {
    // Try left side of node if right doesn't fit
    absoluteX = containerRect.left + mousePosition.x - windowWidth - 20;
    
    // If still doesn't fit, position at far right with margin
    if (absoluteX < 20) {
      absoluteX = viewportWidth - windowWidth - 20;
    }
  }
  
  // Vertical positioning with viewport bounds - auto-adjust to stay in viewport
  if (absoluteY < 20) {
    absoluteY = 20;
  } else if (absoluteY + windowHeight > viewportHeight - 20) {
    absoluteY = viewportHeight - windowHeight - 20;
  }
  
  const outletMetrics = [
    { label: 'H₂ Outlet Flowrate', pvKey: 'H2_outlet_Flowrate_Process_value' },
    { label: 'N₂ Outlet Flowrate', pvKey: 'N2_outlet_Flowrate_Process_value' },
    { label: 'CH₄ Outlet Flowrate', pvKey: 'CH4_outlet_Flowrate_Process_value' },
    { label: 'CO₂ Outlet Flowrate', pvKey: 'CO2_outlet_Flowrate_Process_value' }
  ];
  
  const getMetricData = (metricKey) => {
    const data = liveData[metricKey];
    if (!data) return { value: '—', unit: '', quality: 'UNKNOWN' };
    return {
      value: data.value != null ? Number(data.value).toFixed(1) : '—',
      unit: data.unit || 'ml/min',
      quality: data.quality || 'UNKNOWN'
    };
  };

  const getQualityColor = (quality) => {
    switch (quality?.toUpperCase()) {
      case 'GOOD': return '#10b981';
      case 'WARN': return '#f59e0b';
      case 'BAD': return '#ef4444';
      default: return '#6b7280';
    }
  };

  // Render window as a positioned div
  return (
    <div
      style={{
        position: 'fixed',
        left: absoluteX,
        top: absoluteY,
        width: windowWidth,
        height: windowHeight,
        background: 'rgba(17, 24, 39, 0.98)',
        border: '3px solid rgba(16, 185, 129, 0.7)',
        borderRadius: '20px',
        padding: '20px',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 12px 48px rgba(0, 0, 0, 0.6), 0 8px 24px rgba(0, 0, 0, 0.4)',
        zIndex: 10001,
        opacity: opacity,
        transition: 'opacity 0.3s ease-in-out',
        pointerEvents: isVisible ? 'all' : 'none',
        color: '#ffffff',
        fontSize: isMobile ? '12px' : '14px',
        overflow: 'hidden'
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Header */}
      <div style={{
        fontSize: isMobile ? '15px' : '18px',
        fontWeight: '700',
        marginBottom: '8px',
        color: '#ffffff'
      }}>
        Outlet Metrics
      </div>
      
      <div style={{
        fontSize: isMobile ? '12px' : '14px',
        color: '#10b981',
        fontWeight: '500',
        marginBottom: '16px'
      }}>
        Post-Reaction Flow Measurements
      </div>
      
      {/* Outlet metrics list */}
      <div style={{ height: windowHeight - 120, overflowY: 'auto' }}>
        {outletMetrics.map((outlet, index) => {
          const pvData = getMetricData(outlet.pvKey);
          const qualityColor = getQualityColor(pvData.quality);
          
          return (
            <div key={outlet.label} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: index % 2 === 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.04)',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '8px'
            }}>
              {/* Metric name */}
              <div style={{
                fontSize: isMobile ? '12px' : '14px',
                fontWeight: '600',
                color: '#ffffff',
                flex: 1
              }}>
                {outlet.label}
              </div>
              
              {/* Value and unit */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{
                  fontSize: isMobile ? '13px' : '15px',
                  color: '#10b981',
                  fontWeight: '600'
                }}>
                  {pvData.value} {pvData.unit}
                </div>
                
                {/* Quality indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: qualityColor,
                    border: '1px solid rgba(255,255,255,0.4)'
                  }} />
                  <span style={{
                    fontSize: '10px',
                    fontWeight: '600',
                    color: qualityColor
                  }}>
                    {pvData.quality}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Interaction hint */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        left: '20px',
        fontSize: '12px',
        color: 'rgba(16, 185, 129, 0.7)'
      }}>
        Hover to keep open
      </div>
    </div>
  );
}
function SmartTooltip({ component, liveData, mousePosition, svgDimensions, isVisible, opacity, onClose, isMobile, onMouseEnter, onMouseLeave }) {
  if (!component || !mousePosition) return null;
  
  // Debug logging
  console.log('SmartTooltip component:', component.id, component.label);
  
  // Special handling for MFC - show comprehensive MFC metrics window
  if (component.id === 'mfc') {
    console.log('Rendering MFC window');
    return (
      <MFCMetricsWindow 
        liveData={liveData} 
        mousePosition={mousePosition} 
        svgDimensions={svgDimensions}
        isVisible={isVisible}
        opacity={opacity}
        onClose={onClose}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        isMobile={isMobile}
      />
    );
  }
  
  // Special handling for Inlets - show all gas metrics
  if (component.id === 'inlets') {
    console.log('Rendering Inlets window');
    return (
      <InletsMetricsWindow 
        liveData={liveData} 
        mousePosition={mousePosition} 
        svgDimensions={svgDimensions}
        isVisible={isVisible}
        opacity={opacity}
        onClose={onClose}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        isMobile={isMobile}
      />
    );
  }
  
  // Special handling for Preheaters - show temperature controllers
  if (component.id === 'preheaters') {
    console.log('Rendering Heaters window');
    return (
      <HeatersMetricsWindow 
        liveData={liveData} 
        mousePosition={mousePosition} 
        svgDimensions={svgDimensions}
        isVisible={isVisible}
        opacity={opacity}
        onClose={onClose}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        isMobile={isMobile}
      />
    );
  }
  
  // Special handling for Reactor - show reactor furnace temperature controllers
  if (component.id === 'reactor') {
    console.log('Rendering Reactor window');
    return (
      <ReactorMetricsWindow 
        liveData={liveData} 
        mousePosition={mousePosition} 
        svgDimensions={svgDimensions}
        isVisible={isVisible}
        opacity={opacity}
        onClose={onClose}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        isMobile={isMobile}
      />
    );
  }
  
  // Special handling for Pressure Sensor - show reactor pressure controller
  if (component.id === 'pressure_sensor') {
    console.log('Rendering Pressure window');
    return (
      <PressureMetricsWindow 
        liveData={liveData} 
        mousePosition={mousePosition} 
        svgDimensions={svgDimensions}
        isVisible={isVisible}
        opacity={opacity}
        onClose={onClose}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        isMobile={isMobile}
      />
    );
  }
  
  // Special handling for Condenser - show placeholder
  if (component.id === 'condenser') {
    console.log('Rendering Condenser window');
    return (
      <CondenserMetricsWindow 
        liveData={liveData} 
        mousePosition={mousePosition} 
        svgDimensions={svgDimensions}
        isVisible={isVisible}
        opacity={opacity}
        onClose={onClose}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        isMobile={isMobile}
      />
    );
  }
  
  // Special handling for Separator (GLC) - show placeholder
  if (component.id === 'glc') {
    console.log('Rendering Separator window');
    return (
      <SeparatorMetricsWindow 
        liveData={liveData} 
        mousePosition={mousePosition} 
        svgDimensions={svgDimensions}
        isVisible={isVisible}
        opacity={opacity}
        onClose={onClose}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        isMobile={isMobile}
      />
    );
  }
  
  // Special handling for Flowmeter - show outlet metrics
  if (component.id === 'flowmeter') {
    console.log('Rendering Flowmeter window');
    return (
      <FlowmeterMetricsWindow 
        liveData={liveData} 
        mousePosition={mousePosition} 
        svgDimensions={svgDimensions}
        isVisible={isVisible}
        opacity={opacity}
        onClose={onClose}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        isMobile={isMobile}
      />
    );
  }
  
  console.log('Rendering regular tooltip for:', component.id);
  // Regular component tooltip
  const tooltipWidth = isMobile ? 240 : 300;
  const tooltipHeight = component.metrics ? Math.min(180, 100 + (component.metrics.length * 24)) : 140;
  
  // Get viewport dimensions for proper positioning
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // Calculate absolute position based on mouse position and container offset
  const container = document.querySelector('.interactive-process-flow');
  const containerRect = container ? container.getBoundingClientRect() : { left: 0, top: 0 };
  
  // Fixed positioning relative to viewport (not inside SVG)
  let absoluteX = containerRect.left + mousePosition.x + 20; // Default right offset
  let absoluteY = containerRect.top + mousePosition.y - tooltipHeight / 2;
  
  // Enhanced viewport-based positioning - default right
  if (absoluteX + tooltipWidth > viewportWidth - 20) {
    // Try left side of node if right doesn't fit
    absoluteX = containerRect.left + mousePosition.x - tooltipWidth - 20;
    
    // If still doesn't fit, position at far right with margin
    if (absoluteX < 20) {
      absoluteX = viewportWidth - tooltipWidth - 20;
    }
  }
  
  // Vertical positioning with viewport bounds - auto-adjust to stay in viewport
  if (absoluteY < 20) {
    absoluteY = 20;
  } else if (absoluteY + tooltipHeight > viewportHeight - 20) {
    absoluteY = viewportHeight - tooltipHeight - 20;
  }
  
  // Get metric data for tooltip
  const getMetricData = (metricKey) => {
    const data = liveData[metricKey];
    if (!data) return { value: '—', unit: '', quality: 'UNKNOWN' };
    return {
      value: data.value != null ? Number(data.value).toFixed(1) : '—',
      unit: data.unit || '',
      quality: data.quality || 'UNKNOWN'
    };
  };

  const getQualityColor = (quality) => {
    switch (quality?.toUpperCase()) {
      case 'GOOD': return '#10b981';
      case 'WARN': return '#f59e0b';
      case 'BAD': return '#ef4444';
      default: return '#6b7280';
    }
  };

  // Render tooltip as a positioned div within the component
  return (
    <div
      style={{
        position: 'fixed',
        left: absoluteX,
        top: absoluteY,
        width: tooltipWidth,
        height: tooltipHeight,
        background: 'rgba(17, 24, 39, 0.98)',
        border: '2px solid rgba(16, 185, 129, 0.6)',
        borderRadius: '16px',
        padding: '16px',
        backdropFilter: 'blur(15px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 4px 16px rgba(0, 0, 0, 0.3)',
        zIndex: 10001,
        opacity: opacity,
        transition: 'opacity 0.3s ease-in-out',
        pointerEvents: isVisible ? 'all' : 'none',
        color: '#ffffff',
        fontSize: isMobile ? '12px' : '14px'
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Header */}
      <div style={{
        fontSize: isMobile ? '14px' : '16px',
        fontWeight: '700',
        marginBottom: '8px',
        color: '#ffffff'
      }}>
        {component.label}
      </div>
      
      {component.sublabel && (
        <div style={{
          fontSize: isMobile ? '11px' : '12px',
          color: '#9ca3af',
          marginBottom: '12px'
        }}>
          {component.sublabel}
        </div>
      )}
      
      {/* Metrics */}
      {component.metrics && component.metrics.slice(0, 4).map((metricKey, index) => {
        const data = getMetricData(metricKey);
        const qualityColor = getQualityColor(data.quality);
        
        return (
          <div key={metricKey} style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: index % 2 === 0 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.03)',
            borderRadius: '6px',
            padding: '8px 12px',
            marginBottom: '4px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                color: '#9ca3af',
                fontSize: isMobile ? '11px' : '12px',
                fontWeight: '500'
              }}>
                {metricKey.includes('Set') ? 'SP:' : 'PV:'}
              </span>
              <span style={{
                color: '#10b981',
                fontSize: isMobile ? '12px' : '13px',
                fontWeight: '600'
              }}>
                {data.value} {data.unit}
              </span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: qualityColor,
                border: '1px solid rgba(255,255,255,0.3)'
              }} />
              <span style={{
                color: qualityColor,
                fontSize: isMobile ? '10px' : '11px',
                fontWeight: '600'
              }}>
                {data.quality}
              </span>
            </div>
          </div>
        );
      })}
      
      {/* Interaction hint */}
      <div style={{
        marginTop: '12px',
        fontSize: '11px',
        color: 'rgba(16, 185, 129, 0.7)',
        textAlign: 'center'
      }}>
        Hover to keep open
      </div>
    </div>
  );
}

function MFCMetricsWindow({ liveData, mousePosition, svgDimensions, isVisible, opacity, onClose, onMouseEnter, onMouseLeave, isMobile }) {
  const windowWidth = isMobile ? 380 : 500;
  const windowHeight = isMobile ? 400 : 480; // Reduced height after removing Air Calcination section
  
  // Get viewport dimensions for proper positioning
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // Calculate absolute position based on mouse position and container offset
  const container = document.querySelector('.interactive-process-flow');
  const containerRect = container ? container.getBoundingClientRect() : { left: 0, top: 0 };
  
  // Fixed positioning relative to viewport (not inside SVG)
  let absoluteX = containerRect.left + mousePosition.x + 20; // Default right offset
  let absoluteY = containerRect.top + mousePosition.y - windowHeight / 2;
  
  // Enhanced viewport-based positioning - default right
  if (absoluteX + windowWidth > viewportWidth - 20) {
    // Try left side of node if right doesn't fit
    absoluteX = containerRect.left + mousePosition.x - windowWidth - 20;
    
    // If still doesn't fit, position at far right with margin
    if (absoluteX < 20) {
      absoluteX = viewportWidth - windowWidth - 20;
    }
  }
  
  // Vertical positioning with viewport bounds - auto-adjust to stay in viewport
  if (absoluteY < 20) {
    absoluteY = 20;
  } else if (absoluteY + windowHeight > viewportHeight - 20) {
    absoluteY = viewportHeight - windowHeight - 20;
  }
  

  
  // MFC Controllers configuration
  const mfcControllers = [
    {
      id: 'MFC 101',
      description: 'Primary Gas Controller',
      gases: [
        { name: 'Air', svKey: 'Air_Inlet_Flowrate_Set_value', pvKey: 'Air_Inlet_Flowrate_Process_value' },
        { name: 'N₂', svKey: 'N2_Inlet_Flowrate_Set_value', pvKey: 'N2_Inlet_Flowrate_Process_value' },
        { name: 'CH₄', svKey: 'CH4_Inlet_Flowrate_Set_value', pvKey: 'CH4_Inlet_Flowrate_Process_value' }
      ]
    },
    {
      id: 'MFC 102',
      description: 'Secondary Gas Controller',
      gases: [
        { name: 'H₂', svKey: 'H2_Inlet_Flowrate_Set_value', pvKey: 'H2_Inlet_Flowrate_Process_value' },
        { name: 'CO₂', svKey: 'CO2_Inlet_Flowrate_Set_value', pvKey: 'CO2_Inlet_Flowrate_Process_value' }
      ]
    }
  ];
  
  const getMetricData = (metricKey) => {
    const data = liveData[metricKey];
    if (!data) return { value: '—', unit: '', quality: 'UNKNOWN' };
    return {
      value: data.value != null ? Number(data.value).toFixed(1) : '—',
      unit: data.unit || 'ml/min',
      quality: data.quality || 'UNKNOWN'
    };
  };

  const getQualityColor = (quality) => {
    switch (quality?.toUpperCase()) {
      case 'GOOD': return '#10b981';
      case 'WARN': return '#f59e0b';
      case 'BAD': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStepColor = (step) => {
    if (step === currentStep) return '#10b981'; // Active step - green
    return '#6b7280'; // Inactive step - gray
  };

  // Render MFC controller section
  const renderMFCSection = (controller, index) => (
    <div key={controller.id} style={{
      background: 'rgba(16, 185, 129, 0.08)',
      border: '1px solid rgba(16, 185, 129, 0.3)',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: index === 0 ? '16px' : '0'
    }}>
      {/* Controller Header */}
      <div style={{
        fontSize: isMobile ? '14px' : '16px',
        fontWeight: '700',
        color: '#10b981',
        marginBottom: '4px'
      }}>
        {controller.id}
      </div>
      
      <div style={{
        fontSize: isMobile ? '11px' : '12px',
        color: '#9ca3af',
        marginBottom: '12px'
      }}>
        {controller.description}
      </div>
      
      {/* Gas Table */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '60px 50px 50px 60px',
        gap: '8px',
        fontSize: '11px',
        fontWeight: '600',
        color: '#9ca3af',
        marginBottom: '8px',
        paddingBottom: '6px',
        borderBottom: '1px solid rgba(16, 185, 129, 0.3)'
      }}>
        <div>Gas</div>
        <div>SV</div>
        <div>PV</div>
        <div>Status</div>
      </div>
      
      {controller.gases.map((gas, gasIndex) => {
        const svData = getMetricData(gas.svKey);
        const pvData = getMetricData(gas.pvKey);
        const qualityColor = getQualityColor(pvData.quality);
        const isActive = false; // Removed Air Calcination SOP logic
        
        return (
          <div key={gas.name} style={{
            display: 'grid',
            gridTemplateColumns: '60px 50px 50px 60px',
            gap: '8px',
            alignItems: 'center',
            background: isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.04)',
            borderRadius: '6px',
            padding: '6px 4px',
            marginBottom: '4px',
            border: isActive ? '1px solid rgba(16, 185, 129, 0.5)' : 'none',
            boxShadow: isActive ? '0 0 8px rgba(16, 185, 129, 0.3)' : 'none'
          }}>
            {/* Gas name with active indicator */}
            <div style={{
              fontSize: isMobile ? '11px' : '12px',
              fontWeight: '600',
              color: isActive ? '#10b981' : '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              {isActive && (
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                  animation: 'pulse 2s infinite'
                }} />
              )}
              {gas.name}
            </div>
            
            {/* Setpoint */}
            <div style={{
              fontSize: isMobile ? '10px' : '11px',
              color: '#9ca3af'
            }}>
              {svData.value}
            </div>
            
            {/* Process value */}
            <div style={{
              fontSize: isMobile ? '10px' : '11px',
              color: isActive ? '#10b981' : '#ffffff',
              fontWeight: isActive ? '600' : '400'
            }}>
              {pvData.value}
            </div>
            
            {/* Quality indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <div style={{
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                backgroundColor: qualityColor,
                border: '1px solid rgba(255,255,255,0.4)'
              }} />
              <span style={{
                fontSize: '9px',
                fontWeight: '600',
                color: qualityColor
              }}>
                {pvData.quality}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );

  // Render window content
  return (
    <div
      style={{
        position: 'fixed',
        left: absoluteX,
        top: absoluteY,
        width: windowWidth,
        height: windowHeight,
        background: 'rgba(17, 24, 39, 0.98)',
        border: '3px solid rgba(16, 185, 129, 0.7)',
        borderRadius: '20px',
        padding: '20px',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 12px 48px rgba(0, 0, 0, 0.6), 0 8px 24px rgba(0, 0, 0, 0.4)',
        zIndex: 10001,
        opacity: opacity,
        transition: 'opacity 0.3s ease-in-out',
        pointerEvents: isVisible ? 'all' : 'none',
        color: '#ffffff',
        fontSize: isMobile ? '12px' : '14px',
        overflow: 'hidden'
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Header */}
      <div style={{
        fontSize: isMobile ? '16px' : '18px',
        fontWeight: '700',
        marginBottom: '8px',
        color: '#ffffff'
      }}>
        Mass Flow Controllers
      </div>
      

      
      {/* MFC Controllers Sections */}
      <div style={{ 
        height: windowHeight - 120, // Reduced from 200 since we removed the SOP section
        overflowY: 'auto',
        paddingRight: '4px'
      }}>
        {mfcControllers.map((controller, index) => renderMFCSection(controller, index))}
      </div>
      
      {/* SOP Steps Overview */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        left: '20px',
        right: '20px',
        fontSize: '10px',
        color: '#9ca3af',
        background: 'rgba(0, 0, 0, 0.3)',
        padding: '8px',
        borderRadius: '6px'
      }}>
        <div>Step 1: Air (6h) → N₂ purge (15m) | Step 2: H₂ (6h) → N₂ purge (15m)</div>
      </div>
      
      {/* Pulse animation keyframes */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>
    </div>
  );
}

function HeatersMetricsWindow({ liveData, mousePosition, svgDimensions, isVisible, opacity, onClose, onMouseEnter, onMouseLeave, isMobile }) {
  const windowWidth = isMobile ? 400 : 520;
  const windowHeight = isMobile ? 560 : 640;
  
  // Get viewport dimensions for proper positioning
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // Calculate absolute position based on mouse position and container offset
  const container = document.querySelector('.interactive-process-flow');
  const containerRect = container ? container.getBoundingClientRect() : { left: 0, top: 0 };
  
  // Fixed positioning relative to viewport (not inside SVG)
  let absoluteX = containerRect.left + mousePosition.x + 20; // Default right offset
  let absoluteY = containerRect.top + mousePosition.y - windowHeight / 2;
  
  // Enhanced viewport-based positioning - default right
  if (absoluteX + windowWidth > viewportWidth - 20) {
    // Try left side of node if right doesn't fit
    absoluteX = containerRect.left + mousePosition.x - windowWidth - 20;
    
    // If still doesn't fit, position at far right with margin
    if (absoluteX < 20) {
      absoluteX = viewportWidth - windowWidth - 20;
    }
  }
  
  // Vertical positioning with viewport bounds - auto-adjust to stay in viewport
  if (absoluteY < 20) {
    absoluteY = 20;
  } else if (absoluteY + windowHeight > viewportHeight - 20) {
    absoluteY = viewportHeight - windowHeight - 20;
  }
  
  // TIC Controllers configuration - for four heater sections
  const ticControllers = [
    {
      id: 'TIC 101',
      description: 'Primary Heater',
      svKey: 'Temp_preheater_1_Set_value', // Assuming setpoint exists
      pvKey: 'Temp_preheater_1_Process_value',
      targetTemp: 450 // Default target if no setpoint data
    },
    {
      id: 'TIC 102', 
      description: 'Secondary Heater',
      svKey: 'Temp_preheater_2_Set_value',
      pvKey: 'Temp_preheater_2_Process_value',
      targetTemp: 475
    },
    {
      id: 'TIC 103',
      description: 'Tertiary Heater', 
      svKey: 'Temp_preheater_3_Set_value',
      pvKey: 'Temp_preheater_3_Process_value',
      targetTemp: 500
    },
    {
      id: 'TIC 104',
      description: 'Quaternary Heater',
      svKey: 'Temp_preheater_4_Set_value', 
      pvKey: 'Temp_preheater_4_Process_value',
      targetTemp: 525
    }
  ];
  
  const getMetricData = (metricKey) => {
    const data = liveData[metricKey];
    if (!data) return { value: '—', unit: '', quality: 'UNKNOWN' };
    return {
      value: data.value != null ? Number(data.value).toFixed(1) : '—',
      unit: data.unit || '°C',
      quality: data.quality || 'UNKNOWN'
    };
  };

  const getQualityColor = (quality) => {
    switch (quality?.toUpperCase()) {
      case 'GOOD': return '#10b981';
      case 'WARN': return '#f59e0b';
      case 'BAD': return '#ef4444';
      default: return '#6b7280';
    }
  };

  // Calculate deviation and status
  const getHeaterStatus = (sv, pv) => {
    const setpoint = parseFloat(sv) || 0;
    const process = parseFloat(pv) || 0;
    const deviation = Math.abs(process - setpoint);
    const percentDeviation = setpoint > 0 ? (deviation / setpoint) * 100 : 0;
    
    if (percentDeviation > 5) {
      return {
        status: process > setpoint ? 'Overheating' : 'Heating',
        color: process > setpoint ? '#ef4444' : '#f59e0b',
        isDeviating: true
      };
    }
    return {
      status: 'Stable',
      color: '#10b981',
      isDeviating: false
    };
  };

  // Calculate progress percentage for gauge
  const getProgressPercentage = (sv, pv) => {
    const setpoint = parseFloat(sv) || 0;
    const process = parseFloat(pv) || 0;
    if (setpoint === 0) return 0;
    return Math.min(100, Math.max(0, (process / setpoint) * 100));
  };

  // Render TIC controller section
  const renderTICSection = (controller, index) => {
    const svData = getMetricData(controller.svKey);
    const pvData = getMetricData(controller.pvKey);
    const qualityColor = getQualityColor(pvData.quality);
    
    // Use actual setpoint or fallback to target
    const setpoint = svData.value !== '—' ? svData.value : controller.targetTemp;
    const process = pvData.value !== '—' ? pvData.value : '0';
    
    const heaterStatus = getHeaterStatus(setpoint, process);
    const progressPercentage = getProgressPercentage(setpoint, process);
    
    return (
      <div key={controller.id} style={{
        background: heaterStatus.isDeviating ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
        border: `1px solid ${heaterStatus.isDeviating ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
        borderRadius: '12px',
        padding: '16px',
        marginBottom: index < 3 ? '12px' : '0'
      }}>
        {/* Controller Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px'
        }}>
          <div>
            <div style={{
              fontSize: isMobile ? '14px' : '16px',
              fontWeight: '700',
              color: '#10b981',
              marginBottom: '2px'
            }}>
              {controller.id}
            </div>
            <div style={{
              fontSize: isMobile ? '11px' : '12px',
              color: '#9ca3af'
            }}>
              {controller.description}
            </div>
          </div>
          
          {/* Status Badge */}
          <div style={{
            fontSize: isMobile ? '10px' : '11px',
            color: '#ffffff',
            background: heaterStatus.color,
            padding: '4px 8px',
            borderRadius: '6px',
            fontWeight: '600',
            boxShadow: `0 0 8px ${heaterStatus.color}40`
          }}>
            {heaterStatus.status}
          </div>
        </div>
        
        {/* Temperature Values */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 60px',
          gap: '12px',
          alignItems: 'center',
          marginBottom: '12px'
        }}>
          {/* Setpoint */}
          <div>
            <div style={{
              fontSize: isMobile ? '10px' : '11px',
              color: '#9ca3af',
              marginBottom: '4px'
            }}>
              Target (SV)
            </div>
            <div style={{
              fontSize: isMobile ? '14px' : '16px',
              fontWeight: '600',
              color: '#ffffff'
            }}>
              {setpoint}°C
            </div>
          </div>
          
          {/* Process Value */}
          <div>
            <div style={{
              fontSize: isMobile ? '10px' : '11px',
              color: '#9ca3af',
              marginBottom: '4px'
            }}>
              Current (PV)
            </div>
            <div style={{
              fontSize: isMobile ? '14px' : '16px',
              fontWeight: '600',
              color: heaterStatus.isDeviating ? heaterStatus.color : '#10b981'
            }}>
              {process}°C
            </div>
          </div>
          
          {/* Quality indicator */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: qualityColor,
              border: '1px solid rgba(255,255,255,0.4)'
            }} />
            <span style={{
              fontSize: '9px',
              fontWeight: '600',
              color: qualityColor
            }}>
              {pvData.quality}
            </span>
          </div>
        </div>
        
        {/* Progress Bar/Gauge */}
        <div style={{
          marginBottom: '8px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '10px',
            color: '#9ca3af',
            marginBottom: '4px'
          }}>
            <span>Progress to Target</span>
            <span>{progressPercentage.toFixed(0)}%</span>
          </div>
          
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '6px',
            height: '8px',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <div style={{
              background: heaterStatus.isDeviating ? 
                `linear-gradient(90deg, ${heaterStatus.color}, ${heaterStatus.color}80)` :
                'linear-gradient(90deg, #10b981, #22c55e)',
              height: '100%',
              width: `${Math.min(100, progressPercentage)}%`,
              borderRadius: '6px',
              transition: 'width 0.5s ease',
              boxShadow: heaterStatus.isDeviating ? 
                `0 0 8px ${heaterStatus.color}60` :
                '0 0 8px rgba(16, 185, 129, 0.6)'
            }} />
            
            {/* Target line indicator */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: '100%',
              width: '2px',
              height: '100%',
              background: '#ffffff',
              opacity: 0.7,
              transform: 'translateX(-1px)'
            }} />
          </div>
        </div>
        
        {/* Deviation Warning */}
        {heaterStatus.isDeviating && (
          <div style={{
            fontSize: '10px',
            color: heaterStatus.color,
            textAlign: 'center',
            background: `${heaterStatus.color}20`,
            padding: '4px 8px',
            borderRadius: '4px',
            border: `1px solid ${heaterStatus.color}40`
          }}>
            ⚠ Deviation &gt;5% from target
          </div>
        )}
      </div>
    );
  };

  // Render heaters window content
  return (
    <div
      style={{
        position: 'fixed',
        left: absoluteX,
        top: absoluteY,
        width: windowWidth,
        height: windowHeight,
        background: 'rgba(17, 24, 39, 0.98)',
        border: '3px solid rgba(16, 185, 129, 0.7)',
        borderRadius: '20px',
        padding: '20px',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 12px 48px rgba(0, 0, 0, 0.6), 0 8px 24px rgba(0, 0, 0, 0.4)',
        zIndex: 10001,
        opacity: opacity,
        transition: 'opacity 0.3s ease-in-out',
        pointerEvents: isVisible ? 'all' : 'none',
        color: '#ffffff',
        fontSize: isMobile ? '12px' : '14px',
        overflow: 'hidden'
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Header */}
      <div style={{
        fontSize: isMobile ? '16px' : '18px',
        fontWeight: '700',
        marginBottom: '8px',
        color: '#ffffff'
      }}>
        Temperature Controllers
      </div>
      
      <div style={{
        fontSize: isMobile ? '12px' : '14px',
        color: '#10b981',
        fontWeight: '500',
        marginBottom: '16px'
      }}>
        Preheater Temperature Control
      </div>
      
      {/* TIC Controllers Sections */}
      <div style={{ 
        height: windowHeight - 120, 
        overflowY: 'auto',
        paddingRight: '4px'
      }}>
        {ticControllers.map((controller, index) => renderTICSection(controller, index))}
      </div>
      
      {/* Interaction hint */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        left: '20px',
        fontSize: '12px',
        color: 'rgba(16, 185, 129, 0.7)'
      }}>
        Hover to keep open
      </div>
    </div>
  );
}

function ReactorMetricsWindow({ liveData, mousePosition, svgDimensions, isVisible, opacity, onClose, onMouseEnter, onMouseLeave, isMobile }) {
  const windowWidth = isMobile ? 400 : 540;
  const windowHeight = isMobile ? 580 : 660;
  
  // Get viewport dimensions for proper positioning
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // Calculate absolute position based on mouse position and container offset
  const container = document.querySelector('.interactive-process-flow');
  const containerRect = container ? container.getBoundingClientRect() : { left: 0, top: 0 };
  
  // Fixed positioning relative to viewport (not inside SVG)
  let absoluteX = containerRect.left + mousePosition.x + 20; // Default right offset
  let absoluteY = containerRect.top + mousePosition.y - windowHeight / 2;
  
  // Enhanced viewport-based positioning - default right
  if (absoluteX + windowWidth > viewportWidth - 20) {
    // Try left side of node if right doesn't fit
    absoluteX = containerRect.left + mousePosition.x - windowWidth - 20;
    
    // If still doesn't fit, position at far right with margin
    if (absoluteX < 20) {
      absoluteX = viewportWidth - windowWidth - 20;
    }
  }
  
  // Vertical positioning with viewport bounds - auto-adjust to stay in viewport
  if (absoluteY < 20) {
    absoluteY = 20;
  } else if (absoluteY + windowHeight > viewportHeight - 20) {
    absoluteY = viewportHeight - windowHeight - 20;
  }
  
  // TIC Controllers configuration - for reactor furnace temperature sections
  const ticControllers = [
    {
      id: 'TIC 201',
      description: 'Reactor Furnace Temp',
      metric: 'Reactor Furnace 1 Temperature',
      svKey: 'Temp_reactor_furnace_1_Set_value',
      pvKey: 'Temp_reactor_furnace_1_Process_value'
    },
    {
      id: 'TIC 202', 
      description: 'Reactor Furnace Temp',
      metric: 'Reactor Furnace 2 Temperature',
      svKey: 'Temp_reactor_furnace_2_Set_value',
      pvKey: 'Temp_reactor_furnace_2_Process_value'
    },
    {
      id: 'TIC 203',
      description: 'Reactor Furnace Temp', 
      metric: 'Reactor Furnace 3 Temperature',
      svKey: 'Temp_reactor_furnace_3_Set_value',
      pvKey: 'Temp_reactor_furnace_3_Process_value'
    }
  ];
  
  const getMetricData = (metricKey) => {
    const data = liveData[metricKey];
    if (!data) return { value: '—', unit: '', quality: 'UNKNOWN' };
    return {
      value: data.value != null ? Number(data.value).toFixed(1) : '—',
      unit: data.unit || '°C',
      quality: data.quality || 'UNKNOWN'
    };
  };

  const getQualityColor = (quality) => {
    switch (quality?.toUpperCase()) {
      case 'GOOD': return '#10b981';
      case 'WARN': return '#f59e0b';
      case 'BAD': return '#ef4444';
      default: return '#6b7280';
    }
  };

  // Calculate status - placeholder logic for now
  const getReactorStatus = (sv, pv) => {
    // Placeholder status logic - user requested placeholder
    return {
      status: 'GOOD', // Placeholder - always show GOOD for now
      color: '#10b981' // Green
    };
  };

  // Calculate averages for TI 200
  const calculateAverages = () => {
    let svSum = 0, pvSum = 0, validCount = 0;
    
    ticControllers.forEach(controller => {
      const svData = getMetricData(controller.svKey);
      const pvData = getMetricData(controller.pvKey);
      
      if (svData.value !== '—' && pvData.value !== '—') {
        svSum += parseFloat(svData.value);
        pvSum += parseFloat(pvData.value);
        validCount++;
      }
    });
    
    return {
      avgSV: validCount > 0 ? (svSum / validCount).toFixed(1) : '—',
      avgPV: validCount > 0 ? (pvSum / validCount).toFixed(1) : '—',
      status: validCount > 0 ? 'GOOD' : 'UNKNOWN' // Placeholder status
    };
  };

  const averages = calculateAverages();

  // Render TIC controller section
  const renderTICSection = (controller, index) => {
    const svData = getMetricData(controller.svKey);
    const pvData = getMetricData(controller.pvKey);
    const qualityColor = getQualityColor(pvData.quality);
    const reactorStatus = getReactorStatus(svData.value, pvData.value);
    
    return (
      <div key={controller.id} style={{
        background: 'rgba(16, 185, 129, 0.08)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: index < 2 ? '12px' : '0'
      }}>
        {/* Controller Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px'
        }}>
          <div>
            <div style={{
              fontSize: isMobile ? '14px' : '16px',
              fontWeight: '700',
              color: '#10b981',
              marginBottom: '2px'
            }}>
              {controller.id}
            </div>
            <div style={{
              fontSize: isMobile ? '11px' : '12px',
              color: '#9ca3af'
            }}>
              {controller.description}
            </div>
            <div style={{
              fontSize: isMobile ? '10px' : '11px',
              color: '#6b7280',
              fontStyle: 'italic'
            }}>
              Metric: {controller.metric}
            </div>
          </div>
          
          {/* Status Badge - Placeholder */}
          <div style={{
            fontSize: isMobile ? '10px' : '11px',
            color: '#ffffff',
            background: reactorStatus.color,
            padding: '4px 8px',
            borderRadius: '6px',
            fontWeight: '600',
            boxShadow: `0 0 8px ${reactorStatus.color}40`
          }}>
            {reactorStatus.status}
          </div>
        </div>
        
        {/* Temperature Values Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 60px',
          gap: '12px',
          alignItems: 'center'
        }}>
          {/* Set Variable (SV) */}
          <div>
            <div style={{
              fontSize: isMobile ? '10px' : '11px',
              color: '#9ca3af',
              marginBottom: '4px'
            }}>
              Set Variable (SV)
            </div>
            <div style={{
              fontSize: isMobile ? '14px' : '16px',
              fontWeight: '600',
              color: '#ffffff'
            }}>
              {svData.value !== '—' ? `${svData.value}°C` : '—'}
            </div>
          </div>
          
          {/* Process Variable (PV) */}
          <div>
            <div style={{
              fontSize: isMobile ? '10px' : '11px',
              color: '#9ca3af',
              marginBottom: '4px'
            }}>
              Process Variable (PV)
            </div>
            <div style={{
              fontSize: isMobile ? '14px' : '16px',
              fontWeight: '600',
              color: '#10b981'
            }}>
              {pvData.value !== '—' ? `${pvData.value}°C` : '—'}
            </div>
          </div>
          
          {/* Status indicator */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: qualityColor,
              border: '1px solid rgba(255,255,255,0.4)'
            }} />
            <span style={{
              fontSize: '9px',
              fontWeight: '600',
              color: qualityColor
            }}>
              {pvData.quality}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Render TI 200 average section
  const renderAverageSection = () => {
    const avgQualityColor = getQualityColor(averages.status);
    
    return (
      <div style={{
        background: 'rgba(59, 130, 246, 0.08)', // Blue tint for average section
        border: '1px solid rgba(59, 130, 246, 0.3)',
        borderRadius: '12px',
        padding: '16px',
        marginTop: '16px'
      }}>
        {/* Average Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px'
        }}>
          <div>
            <div style={{
              fontSize: isMobile ? '14px' : '16px',
              fontWeight: '700',
              color: '#3b82f6',
              marginBottom: '2px'
            }}>
              TI 200
            </div>
            <div style={{
              fontSize: isMobile ? '11px' : '12px',
              color: '#9ca3af'
            }}>
              Average Furnace Temp
            </div>
            <div style={{
              fontSize: isMobile ? '10px' : '11px',
              color: '#6b7280',
              fontStyle: 'italic'
            }}>
              Metric: Average of TIC201, TIC202, TIC203
            </div>
          </div>
          
          {/* Status Badge - Placeholder */}
          <div style={{
            fontSize: isMobile ? '10px' : '11px',
            color: '#ffffff',
            background: avgQualityColor,
            padding: '4px 8px',
            borderRadius: '6px',
            fontWeight: '600',
            boxShadow: `0 0 8px ${avgQualityColor}40`
          }}>
            {averages.status}
          </div>
        </div>
        
        {/* Average Values Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 60px',
          gap: '12px',
          alignItems: 'center'
        }}>
          {/* Average SV */}
          <div>
            <div style={{
              fontSize: isMobile ? '10px' : '11px',
              color: '#9ca3af',
              marginBottom: '4px'
            }}>
              Avg SV (TIC201–203)
            </div>
            <div style={{
              fontSize: isMobile ? '14px' : '16px',
              fontWeight: '600',
              color: '#ffffff'
            }}>
              {averages.avgSV !== '—' ? `${averages.avgSV}°C` : '—'}
            </div>
          </div>
          
          {/* Average PV */}
          <div>
            <div style={{
              fontSize: isMobile ? '10px' : '11px',
              color: '#9ca3af',
              marginBottom: '4px'
            }}>
              Avg PV (TIC201–203)
            </div>
            <div style={{
              fontSize: isMobile ? '14px' : '16px',
              fontWeight: '600',
              color: '#3b82f6'
            }}>
              {averages.avgPV !== '—' ? `${averages.avgPV}°C` : '—'}
            </div>
          </div>
          
          {/* Status indicator */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: avgQualityColor,
              border: '1px solid rgba(255,255,255,0.4)'
            }} />
            <span style={{
              fontSize: '9px',
              fontWeight: '600',
              color: avgQualityColor
            }}>
              AVG
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Render reactor window content
  return (
    <div
      style={{
        position: 'fixed',
        left: absoluteX,
        top: absoluteY,
        width: windowWidth,
        height: windowHeight,
        background: 'rgba(17, 24, 39, 0.98)',
        border: '3px solid rgba(16, 185, 129, 0.7)',
        borderRadius: '20px',
        padding: '20px',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 12px 48px rgba(0, 0, 0, 0.6), 0 8px 24px rgba(0, 0, 0, 0.4)',
        zIndex: 10001,
        opacity: opacity,
        transition: 'opacity 0.3s ease-in-out',
        pointerEvents: isVisible ? 'all' : 'none',
        color: '#ffffff',
        fontSize: isMobile ? '12px' : '14px',
        overflow: 'hidden'
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Header */}
      <div style={{
        fontSize: isMobile ? '16px' : '18px',
        fontWeight: '700',
        marginBottom: '8px',
        color: '#ffffff'
      }}>
        Reactor Temperature Controllers
      </div>
      
      <div style={{
        fontSize: isMobile ? '12px' : '14px',
        color: '#10b981',
        fontWeight: '500',
        marginBottom: '16px'
      }}>
        DMR Reactor Furnace Temperature Control
      </div>
      
      {/* TIC Controllers Sections */}
      <div style={{ 
        height: windowHeight - 160, 
        overflowY: 'auto',
        paddingRight: '4px'
      }}>
        {ticControllers.map((controller, index) => renderTICSection(controller, index))}
        
        {/* TI 200 Average Section */}
        {renderAverageSection()}
      </div>
      
      {/* Interaction hint */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        left: '20px',
        fontSize: '12px',
        color: 'rgba(16, 185, 129, 0.7)'
      }}>
        Hover to keep open
      </div>
    </div>
  );
}



export function InteractiveProcessFlow({ onSelect, selectedId }) {
  const [liveData, setLiveData] = useState({});
  const [hoveredComponent, setHoveredComponent] = useState(null);
  const [mousePosition, setMousePosition] = useState(null);
  const [expandedComponents, setExpandedComponents] = useState(new Set());
  const [isMobile, setIsMobile] = useState(false);
  const [svgDimensions, setSvgDimensions] = useState({ width: 300, height: 1200 }); // Increased height for better spacing
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipOpacity, setTooltipOpacity] = useState(0);
  
  // Timeout refs for smooth hover behavior
  const hoverTimeoutRef = useRef(null);
  const leaveTimeoutRef = useRef(null);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1200); // Wider threshold for sidebar
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load live data for all metrics
  useEffect(() => {
    let mounted = true;
    
    async function loadLiveData() {
      try {
        // Get all unique metrics from all components
        const allMetrics = new Set();
        PROCESS_COMPONENTS.forEach(comp => {
          if (comp.metrics) {
            comp.metrics.forEach(m => allMetrics.add(m));
          }
          if (comp.subComponents) {
            comp.subComponents.forEach(sub => {
              sub.metrics?.forEach(m => allMetrics.add(m));
            });
          }
        });

        // Find corresponding metrics in our config
        const allConfiguredMetrics = [...inletMetrics, ...outletMetrics];
        const results = {};
        
        for (const metricKey of allMetrics) {
          const metricConfig = allConfiguredMetrics.find(m => m.propertyId === metricKey);
          if (metricConfig) {
            try {
              const result = await getLiveValue({ 
                assetId: metricConfig.assetId, 
                propertyId: metricConfig.propertyId 
              });
              results[metricKey] = result;
            } catch (error) {
              console.warn(`Failed to load ${metricKey}:`, error);
            }
          }
        }
        
        if (mounted) {
          setLiveData(results);
        }
      } catch (error) {
        console.error('Error loading live data:', error);
      }
    }

    loadLiveData();
    const interval = setInterval(loadLiveData, 5000);
    
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Smooth hover handlers to prevent flickering
  const handleComponentHover = (component) => {
    // Clear any pending leave timeout
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    
    // Set hovered component immediately
    setHoveredComponent(component);
    
    // Start fade-in animation
    if (!tooltipVisible) {
      setTooltipVisible(true);
      // Small delay to start fade-in
      setTimeout(() => setTooltipOpacity(1), 50);
    } else {
      setTooltipOpacity(1);
    }
  };

  const handleComponentLeave = () => {
    // Set a timeout before hiding tooltip
    leaveTimeoutRef.current = setTimeout(() => {
      // Start fade-out animation
      setTooltipOpacity(0);
      
      // Hide tooltip completely after fade-out
      setTimeout(() => {
        setTooltipVisible(false);
        setHoveredComponent(null);
        setMousePosition(null);
      }, 300);
    }, 150); // 150ms delay before starting to hide
  };

  // Tooltip mouse handlers to keep it open
  const handleTooltipMouseEnter = () => {
    // Clear any pending leave timeout
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    setTooltipOpacity(1);
  };

  const handleTooltipMouseLeave = () => {
    // Start hiding tooltip when mouse leaves tooltip area
    leaveTimeoutRef.current = setTimeout(() => {
      setTooltipOpacity(0);
      setTimeout(() => {
        setTooltipVisible(false);
        setHoveredComponent(null);
        setMousePosition(null);
      }, 300);
    }, 100);
  };

  const handleComponentClick = (component) => {
    // Handle expandable components
    if (component.expandable) {
      setExpandedComponents(prev => {
        const newSet = new Set(prev);
        if (newSet.has(component.id)) {
          newSet.delete(component.id);
        } else {
          newSet.add(component.id);
        }
        return newSet;
      });
    }
    
    // Select metric for dashboard integration
    if (component.metrics && component.metrics.length > 0 && onSelect) {
      const metricKey = component.metrics[0];
      const allConfiguredMetrics = [...inletMetrics, ...outletMetrics];
      const metricConfig = allConfiguredMetrics.find(m => m.propertyId === metricKey);
      if (metricConfig) {
        onSelect(metricConfig.id);
      }
    }
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      if (leaveTimeoutRef.current) {
        clearTimeout(leaveTimeoutRef.current);
      }
    };
  }, []);

  const handleMouseMove = (event) => {
    if (hoveredComponent && tooltipVisible) {
      const rect = event.currentTarget.getBoundingClientRect();
      setMousePosition({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      });
    }
  };

  // Update SVG dimensions with improved spacing
  useEffect(() => {
    const updateDimensions = () => {
      const width = isMobile ? window.innerWidth - 40 : 300;
      const height = isMobile ? 600 : 1200; // Increased height for better spacing
      setSvgDimensions({ width, height });
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [isMobile]);

  // Calculate flow rates for animations
  const getFlowRate = (connectionId) => {
    // Use representative metrics to drive animation speed
    const flowMetrics = {
      'inlets-mfc': 'H2_Inlet_Flowrate_Process_value',
      'mfc-preheaters': 'H2_Inlet_Flowrate_Process_value',
      'preheaters-reactor': 'H2_Inlet_Flowrate_Process_value',
      'reactor-condenser': 'H2_outlet_Flowrate_Process_value',
      'condenser-glc': 'H2_outlet_Flowrate_Process_value',
      'glc-flowmeter': 'H2_outlet_Flowrate_Process_value',
      'flowmeter-outlet': 'H2_outlet_Flowrate_Process_value'
    };
    
    const metricKey = flowMetrics[connectionId];
    if (metricKey && liveData[metricKey]) {
      const value = liveData[metricKey].value;
      return value ? Math.max(0.5, value / 1200) : 1; // Normalize to 0.5-2 range
    }
    return 1;
  };

  return (
    <div className="interactive-process-flow" style={{ 
      width: '100%', 
      height: 'calc(100vh - 80px)',
      backgroundColor: 'transparent',
      position: 'relative' // Enable proper z-index stacking
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 16px 8px 16px',
        borderBottom: '1px solid rgba(204, 204, 220, 0.1)'
      }}>
        <h2 style={{
          color: '#ffffff',
          fontSize: '16px',
          fontWeight: '600',
          margin: 0
        }}>
          DMR Process Flow
        </h2>
        <p style={{
          color: 'rgba(204, 204, 220, 0.7)',
          fontSize: '12px',
          margin: '4px 0 0 0'
        }}>
          Interactive Process Diagram
        </p>
      </div>

      {/* SVG Process Diagram with restored scrolling */}
      <div 
        className="process-flow-scroll-container"
        style={{ 
          padding: '16px',
          overflow: 'auto', // Restore scrolling
          height: 'calc(100% - 80px)',
          position: 'relative',
          // Custom scrollbar styling for dark theme
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(16, 185, 129, 0.5) rgba(255, 255, 255, 0.1)'
        }}
      >
        <svg
          width={svgDimensions.width}
          height={svgDimensions.height}
          onMouseMove={handleMouseMove}
          style={{ 
            background: 'transparent',
            minWidth: isMobile ? '300px' : 'auto'
          }}
        >
          {/* Define filters and effects */}
          <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <filter id="tooltip-shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#000" floodOpacity="0.4"/>
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.2"/>
            </filter>
            <filter id="enhanced-tooltip-shadow" x="-60%" y="-60%" width="220%" height="220%">
              <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#000" floodOpacity="0.5"/>
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000" floodOpacity="0.3"/>
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.2"/>
            </filter>
          </defs>

          {/* Animated connections */}
          {CONNECTIONS.map((connection, index) => (
            <AnimatedConnection
              key={`${connection.from}-${connection.to}`}
              connection={connection}
              flowRate={getFlowRate(`${connection.from}-${connection.to}`)}
              isActive={Object.keys(liveData).length > 0}
            />
          ))}

          {/* Process components */}
          {PROCESS_COMPONENTS.map(component => (
            <ProcessComponent
              key={component.id}
              component={component}
              liveData={liveData}
              onHover={handleComponentHover}
              onLeave={handleComponentLeave}
              onClick={handleComponentClick}
              isExpanded={expandedComponents.has(component.id)}
              isMobile={isMobile}
            />
          ))}
        </svg>
      </div>

      {/* Tooltip Overlay - positioned outside SVG with high z-index */}
      {tooltipVisible && hoveredComponent && (
        <SmartTooltip
          component={hoveredComponent}
          liveData={liveData}
          mousePosition={mousePosition}
          svgDimensions={svgDimensions}
          isVisible={tooltipVisible}
          opacity={tooltipOpacity}
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
          isMobile={isMobile}
        />
      )}

      {/* Legend - positioned to not interfere with tooltips */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '10px',
        background: 'rgba(17, 24, 39, 0.9)',
        border: '1px solid rgba(204, 204, 220, 0.2)',
        borderRadius: '6px',
        padding: '8px',
        fontSize: '10px',
        maxWidth: '120px',
        backdropFilter: 'blur(10px)',
        zIndex: 1000
      }}>
        <div style={{ color: '#ffffff', fontWeight: '600', marginBottom: '6px' }}>
          Status
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }}></div>
            <span style={{ color: '#9ca3af' }}>Good</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#f59e0b' }}></div>
            <span style={{ color: '#9ca3af' }}>Warn</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ef4444' }}></div>
            <span style={{ color: '#9ca3af' }}>Critical</span>
          </div>
        </div>
      </div>
    </div>
  );
}