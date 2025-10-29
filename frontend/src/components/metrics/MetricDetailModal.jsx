import React, { useEffect, useRef, useState } from 'react';
import { TrendsPanel } from './TrendsPanel';
import { setValues } from '../../config/dmr-map.js';
import { mockGet, getSetValue } from '../../lib/sitewise.js';

function formatVal(v) {
  if (v == null || Number.isNaN(v)) return "—";
  if (Math.abs(v) >= 1000) return Math.round(v).toString();
  return Number(v).toFixed(1);
}

// Enhanced chart component with zoom and pan capabilities
function DetailedChart({ points, metric, width = 800, height = 400 }) {
  const canvasRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!points || points.length === 0 || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = width;
    canvas.height = height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Calculate data bounds
    const xs = points.map(p => p.x || p.value || 0);
    const ys = points.map(p => p.y || p.value || 0);
    
    if (xs.length === 0 || ys.length === 0) return;
    
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    
    const rangeX = Math.max(1, maxX - minX);
    const rangeY = Math.max(1, maxY - minY);
    
    // Apply zoom and pan transformations
    const margin = 40;
    const chartWidth = width - 2 * margin;
    const chartHeight = height - 2 * margin;
    
    const scaleX = (x) => {
      const normalizedX = (x - minX) / rangeX;
      return margin + (normalizedX * chartWidth * zoom) + pan.x;
    };
    
    const scaleY = (y) => {
      const normalizedY = (y - minY) / rangeY;
      return height - margin - (normalizedY * chartHeight * zoom) + pan.y;
    };
    
    // Draw grid
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.1)';
    ctx.lineWidth = 1;
    
    // Vertical grid lines
    for (let i = 0; i <= 10; i++) {
      const x = margin + (i / 10) * chartWidth;
      ctx.beginPath();
      ctx.moveTo(x, margin);
      ctx.lineTo(x, height - margin);
      ctx.stroke();
    }
    
    // Horizontal grid lines
    for (let i = 0; i <= 10; i++) {
      const y = margin + (i / 10) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(margin, y);
      ctx.lineTo(width - margin, y);
      ctx.stroke();
    }
    
    // Draw axes
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
    ctx.lineWidth = 2;
    
    // X-axis
    ctx.beginPath();
    ctx.moveTo(margin, height - margin);
    ctx.lineTo(width - margin, height - margin);
    ctx.stroke();
    
    // Y-axis  
    ctx.beginPath();
    ctx.moveTo(margin, margin);
    ctx.lineTo(margin, height - margin);
    ctx.stroke();
    
    // Draw data line
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    points.forEach((point, i) => {
      const x = scaleX(point.x || point.value || 0);
      const y = scaleY(point.y || point.value || 0);
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();
    
    // Draw data points
    ctx.fillStyle = '#10b981';
    points.forEach((point) => {
      const x = scaleX(point.x || point.value || 0);
      const y = scaleY(point.y || point.value || 0);
      
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    });
    
    // Draw axis labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    
    // Y-axis labels
    for (let i = 0; i <= 5; i++) {
      const value = minY + (maxY - minY) * (i / 5);
      const y = height - margin - (i / 5) * chartHeight;
      ctx.fillText(formatVal(value), margin - 20, y + 4);
    }
    
    // X-axis labels (timestamps)
    for (let i = 0; i <= 5; i++) {
      const timestamp = minX + (maxX - minX) * (i / 5);
      const x = margin + (i / 5) * chartWidth;
      const date = new Date(timestamp);
      const timeStr = date.toLocaleTimeString();
      
      ctx.save();
      ctx.translate(x, height - 10);
      ctx.rotate(-Math.PI / 4);
      ctx.textAlign = 'right';
      ctx.fillText(timeStr, 0, 0);
      ctx.restore();
    }
    
  }, [points, zoom, pan, width, height]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    const rect = canvasRef.current.getBoundingClientRect();
    setLastMouse({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const currentMouse = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    setPan(prev => ({
      x: prev.x + (currentMouse.x - lastMouse.x),
      y: prev.y + (currentMouse.y - lastMouse.y)
    }));
    
    setLastMouse(currentMouse);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.1, Math.min(5, prev * zoomFactor)));
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ 
        position: 'absolute', 
        top: 10, 
        right: 10, 
        zIndex: 10, 
        display: 'flex', 
        gap: '8px' 
      }}>
        <button 
          onClick={() => setZoom(prev => Math.min(5, prev * 1.2))}
          style={{ 
            padding: '4px 8px', 
            background: 'rgba(16, 185, 129, 0.2)', 
            border: '1px solid #10b981', 
            borderRadius: '4px',
            color: '#10b981',
            cursor: 'pointer'
          }}
        >
          Zoom In
        </button>
        <button 
          onClick={() => setZoom(prev => Math.max(0.1, prev * 0.8))}
          style={{ 
            padding: '4px 8px', 
            background: 'rgba(16, 185, 129, 0.2)', 
            border: '1px solid #10b981', 
            borderRadius: '4px',
            color: '#10b981',
            cursor: 'pointer'
          }}
        >
          Zoom Out
        </button>
        <button 
          onClick={resetView}
          style={{ 
            padding: '4px 8px', 
            background: 'rgba(16, 185, 129, 0.2)', 
            border: '1px solid #10b981', 
            borderRadius: '4px',
            color: '#10b981',
            cursor: 'pointer'
          }}
        >
          Reset View
        </button>
      </div>
      <canvas
        ref={canvasRef}
        style={{
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '8px',
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />
      <div style={{ 
        marginTop: '8px', 
        fontSize: '12px', 
        color: 'rgba(255, 255, 255, 0.7)',
        textAlign: 'center'
      }}>
        Use mouse wheel to zoom, drag to pan. Zoom: {zoom.toFixed(1)}x
      </div>
    </div>
  );
}

export function MetricDetailModal({ metric, liveData, trendData, isOpen, onClose }) {
  const modalRef = useRef(null);

  console.log('MetricDetailModal props:', { 
    metric: metric?.label, 
    isOpen, 
    hasLiveData: !!liveData, 
    hasTrendData: !!trendData 
  });

  // Handle escape key and click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleClickOutside);

    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !metric) {
    return null;
  }

  let processValue = null;
  let setValue = null;
  let time = "—";
  let quality = "—";
  let trend = [];

  try {
    processValue = liveData?.value;
    time = liveData?.time ? new Date(liveData.time).toLocaleString() : "—";
    quality = liveData?.quality ?? "—";
    trend = trendData || [];

    // Get set value - try from CSV first, then from config
    if (metric.propertyId) {
      // Try to get Set value from CSV data
      const setValueData = getSetValue(metric.assetId, metric.propertyId);
      setValue = setValueData?.value;
    }
    
    // Fallback to config-based set values if no CSV data
    if (setValue === null && metric.setId) {
      const setValueInfo = setValues[metric.setId];
      if (setValueInfo) {
        const setValueData = mockGet(setValueInfo.assetId, setValueInfo.propertyId);
        setValue = setValueData?.value;
      }
    }
  } catch (error) {
    console.error('Error processing modal data:', error);
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal-content" ref={modalRef} style={{ 
        maxWidth: '1000px', 
        width: '90vw',
        maxHeight: '80vh',
        overflow: 'auto'
      }}>
        <div className="modal-header" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: '1px solid rgba(16, 185, 129, 0.2)',
          paddingBottom: '16px',
          marginBottom: '24px'
        }}>
          <h2 style={{ margin: 0, color: '#10b981', fontSize: '24px' }}>{metric.label}</h2>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: 'rgba(255, 255, 255, 0.7)',
              padding: '8px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Current Values Section */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '20px',
          marginBottom: '32px'
        }}>
          <div className="metric-info-card">
            <h3 style={{ margin: '0 0 8px 0', color: 'rgba(255, 255, 255, 0.9)' }}>Process Value</h3>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#10b981' }}>
              {formatVal(processValue)} {metric.unit || ''}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginTop: '4px' }}>
              Last update: {time}
            </div>
          </div>

          {setValue !== null && (
            <div className="metric-info-card">
              <h3 style={{ margin: '0 0 8px 0', color: 'rgba(255, 255, 255, 0.9)' }}>Set Value</h3>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f59e0b' }}>
                {formatVal(setValue)} {metric.unit || ''}
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginTop: '4px' }}>
                Target setpoint
              </div>
            </div>
          )}

          <div className="metric-info-card">
            <h3 style={{ margin: '0 0 8px 0', color: 'rgba(255, 255, 255, 0.9)' }}>Quality Status</h3>
            <div style={{ 
              fontSize: '18px', 
              fontWeight: 'bold', 
              color: quality === 'GOOD' ? '#10b981' : '#ef4444',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                backgroundColor: quality === 'GOOD' ? '#10b981' : '#ef4444' 
              }}></span>
              {quality}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginTop: '4px' }}>
              Data quality indicator
            </div>
          </div>
        </div>

        {/* Enhanced Chart Section */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', color: 'rgba(255, 255, 255, 0.9)' }}>
            6-Hour Trend Analysis
          </h3>
          {trend && trend.length > 0 ? (
            <DetailedChart 
              points={trend} 
              metric={metric}
              width={900}
              height={400}
            />
          ) : (
            <div style={{
              width: '100%',
              height: '400px',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(16, 185, 129, 0.05)'
            }}>
              <div style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
                <div style={{ fontSize: '18px', marginBottom: '8px' }}>No trend data available</div>
                <div style={{ fontSize: '14px' }}>Historical data will appear here when available</div>
              </div>
            </div>
          )}
        </div>

        {/* Additional Statistics */}
        {trend && trend.length > 0 && (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
            gap: '16px',
            paddingTop: '20px',
            borderTop: '1px solid rgba(16, 185, 129, 0.2)'
          }}>
            <div className="stat-item">
              <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>MIN</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#10b981' }}>
                {formatVal(Math.min(...trend.map(p => p.y || p.value)))} {metric.unit}
              </div>
            </div>
            <div className="stat-item">
              <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>MAX</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#10b981' }}>
                {formatVal(Math.max(...trend.map(p => p.y || p.value)))} {metric.unit}
              </div>
            </div>
            <div className="stat-item">
              <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>AVG</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#10b981' }}>
                {formatVal(trend.reduce((sum, p) => sum + (p.y || p.value), 0) / trend.length)} {metric.unit}
              </div>
            </div>
            <div className="stat-item">
              <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>POINTS</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#10b981' }}>
                {trend.length}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
