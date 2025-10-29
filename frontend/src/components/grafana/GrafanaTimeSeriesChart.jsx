import React, { useRef, useEffect, useState, useMemo } from 'react';

function formatValue(value, unit = '') {
  if (value == null || isNaN(value)) return '—';
  if (Math.abs(value) >= 1000) return `${Math.round(value).toLocaleString()}${unit ? ' ' + unit : ''}`;
  return `${Number(value).toFixed(1)}${unit ? ' ' + unit : ''}`;
}

export function GrafanaTimeSeriesChart({ 
  data = [], 
  width = 800, 
  height = 400, 
  color = '#10b981',
  backgroundColor = 'rgba(0, 0, 0, 0.1)',
  unit = '',
  title = '',
  showGrid = true,
  showTooltip = true
}) {
  const canvasRef = useRef(null);
  const [mousePos, setMousePos] = useState(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });

  // Process and validate data
  const processedData = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return { points: [], hasData: false, minValue: 0, maxValue: 0, minTime: 0, maxTime: 0 };
    }

    const validPoints = data
      .filter(point => {
        const value = point.y || point.value;
        const time = point.x || point.timestamp;
        return value != null && !isNaN(value) && time != null;
      })
      .sort((a, b) => {
        const timeA = a.x || a.timestamp || 0;
        const timeB = b.x || b.timestamp || 0;
        return timeA - timeB;
      });

    if (validPoints.length === 0) {
      return { points: [], hasData: false, minValue: 0, maxValue: 0, minTime: 0, maxTime: 0 };
    }

    const values = validPoints.map(p => p.y || p.value);
    const times = validPoints.map(p => p.x || p.timestamp);
    
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    return { 
      points: validPoints, 
      hasData: true, 
      minValue, 
      maxValue, 
      minTime, 
      maxTime 
    };
  }, [data]);

  // Draw the chart
  useEffect(() => {
    if (!processedData.hasData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = width;
    canvas.height = height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    const { points, minValue, maxValue, minTime, maxTime } = processedData;
    
    const margin = { top: 40, right: 40, bottom: 60, left: 80 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    const valueRange = Math.max(maxValue - minValue, 1);
    const timeRange = Math.max(maxTime - minTime, 1);

    // Scale functions with zoom and pan
    const scaleX = (time) => {
      const normalizedX = (time - minTime) / timeRange;
      return margin.left + (normalizedX * chartWidth * zoom) + pan.x;
    };
    
    const scaleY = (value) => {
      const normalizedY = (value - minValue) / valueRange;
      return margin.top + chartHeight - (normalizedY * chartHeight * zoom) + pan.y;
    };

    // Draw background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = 'rgba(204, 204, 220, 0.1)';
      ctx.lineWidth = 1;
      
      // Vertical grid lines (time)
      for (let i = 0; i <= 10; i++) {
        const x = margin.left + (i / 10) * chartWidth;
        ctx.beginPath();
        ctx.moveTo(x, margin.top);
        ctx.lineTo(x, height - margin.bottom);
        ctx.stroke();
      }
      
      // Horizontal grid lines (values)
      for (let i = 0; i <= 10; i++) {
        const y = margin.top + (i / 10) * chartHeight; 
        ctx.beginPath();
        ctx.moveTo(margin.left, y);
        ctx.lineTo(width - margin.right, y);
        ctx.stroke();
      }
    }

    // Draw axes
    ctx.strokeStyle = 'rgba(204, 204, 220, 0.3)';
    ctx.lineWidth = 2;
    
    // X-axis
    ctx.beginPath();
    ctx.moveTo(margin.left, height - margin.bottom);
    ctx.lineTo(width - margin.right, height - margin.bottom);
    ctx.stroke();
    
    // Y-axis
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, height - margin.bottom);
    ctx.stroke();

    // Draw area under the curve
    if (points.length > 1) {
      const gradient = ctx.createLinearGradient(0, margin.top, 0, height - margin.bottom);
      gradient.addColorStop(0, color + '30');
      gradient.addColorStop(1, color + '05');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      
      const firstPoint = points[0];
      ctx.moveTo(scaleX(firstPoint.x || firstPoint.timestamp), height - margin.bottom);
      ctx.lineTo(scaleX(firstPoint.x || firstPoint.timestamp), scaleY(firstPoint.y || firstPoint.value));
      
      points.forEach(point => {
        const time = point.x || point.timestamp;
        const value = point.y || point.value;
        ctx.lineTo(scaleX(time), scaleY(value));
      });
      
      const lastPoint = points[points.length - 1];
      ctx.lineTo(scaleX(lastPoint.x || lastPoint.timestamp), height - margin.bottom);
      ctx.closePath();
      ctx.fill();
    }

    // Draw data line
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    
    points.forEach((point, index) => {
      const time = point.x || point.timestamp;
      const value = point.y || point.value;
      const x = scaleX(time);
      const y = scaleY(value);
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();

    // Draw data points
    ctx.fillStyle = color;
    points.forEach(point => {
      const time = point.x || point.timestamp;
      const value = point.y || point.value;
      const x = scaleX(time);
      const y = scaleY(value);
      
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw highlighted point if hovering
    if (hoveredPoint) {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      
      const time = hoveredPoint.x || hoveredPoint.timestamp;
      const value = hoveredPoint.y || hoveredPoint.value;
      const x = scaleX(time);
      const y = scaleY(value);
      
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    }

    // Draw axis labels
    ctx.fillStyle = 'rgba(204, 204, 220, 0.8)';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    
    // Y-axis labels (values)
    for (let i = 0; i <= 5; i++) {
      const value = minValue + (maxValue - minValue) * (i / 5);
      const y = height - margin.bottom - (i / 5) * chartHeight;
      ctx.textAlign = 'right';
      ctx.fillText(formatValue(value, unit), margin.left - 10, y + 4);
    }
    
    // X-axis labels (time)
    for (let i = 0; i <= 5; i++) {
      const time = minTime + (timeRange * (i / 5));
      const x = margin.left + (i / 5) * chartWidth;
      const date = new Date(time);
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      ctx.textAlign = 'center';
      ctx.fillText(timeStr, x, height - margin.bottom + 20);
    }

    // Draw title
    if (title) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(title, margin.left, 25);
    }

  }, [processedData, zoom, pan, hoveredPoint, width, height, color, backgroundColor, unit, title, showGrid]);

  // Mouse event handlers
  const handleMouseMove = (e) => {
    if (!canvasRef.current || !processedData.hasData) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    setMousePos({ x: mouseX, y: mouseY });

    if (isDragging) {
      setPan(prev => ({
        x: prev.x + (mouseX - lastMouse.x),
        y: prev.y + (mouseY - lastMouse.y)
      }));
      setLastMouse({ x: mouseX, y: mouseY });
      return;
    }

    // Find closest data point for tooltip
    if (showTooltip) {
      const margin = { top: 40, right: 40, bottom: 60, left: 80 };
      const chartWidth = width - margin.left - margin.right;
      const { points, minTime, maxTime } = processedData;
      const timeRange = Math.max(maxTime - minTime, 1);
      
      const relativeX = mouseX - margin.left;
      if (relativeX >= 0 && relativeX <= chartWidth) {
        const normalizedX = relativeX / chartWidth;
        const targetTime = minTime + (normalizedX * timeRange);
        
        let closestPoint = null;
        let minDistance = Infinity;
        
        points.forEach(point => {
          const pointTime = point.x || point.timestamp;
          const distance = Math.abs(pointTime - targetTime);
          if (distance < minDistance) {
            minDistance = distance;
            closestPoint = point;
          }
        });
        
        setHoveredPoint(closestPoint);
      } else {
        setHoveredPoint(null);
      }
    }
  };

  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    setIsDragging(true);
    setLastMouse({ x: mouseX, y: mouseY });
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

  if (!processedData.hasData) {
    return (
      <div style={{
        width: `${width}px`,
        height: `${height}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(204, 204, 220, 0.05)',
        borderRadius: '8px',
        border: '1px dashed rgba(204, 204, 220, 0.15)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
          <div style={{ color: 'rgba(204, 204, 220, 0.7)', fontSize: '16px' }}>
            No data available for time series chart
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Chart controls */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        display: 'flex',
        gap: '8px',
        zIndex: 10
      }}>
        <button 
          onClick={() => setZoom(prev => Math.min(5, prev * 1.2))}
          style={{
            padding: '6px 12px',
            background: 'rgba(16, 185, 129, 0.2)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: '4px',
            color: '#10b981',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '500'
          }}
        >
          Zoom In
        </button>
        <button 
          onClick={() => setZoom(prev => Math.max(0.1, prev * 0.8))}
          style={{
            padding: '6px 12px',
            background: 'rgba(16, 185, 129, 0.2)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: '4px',
            color: '#10b981',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '500'
          }}
        >
          Zoom Out
        </button>
        <button 
          onClick={resetView}
          style={{
            padding: '6px 12px',
            background: 'rgba(16, 185, 129, 0.2)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: '4px',
            color: '#10b981',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '500'
          }}
        >
          Reset
        </button>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          cursor: isDragging ? 'grabbing' : 'grab',
          borderRadius: '8px'
        }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          handleMouseUp();
          setHoveredPoint(null);
        }}
        onWheel={handleWheel}
      />

      {/* Tooltip */}
      {showTooltip && hoveredPoint && mousePos && (
        <div style={{
          position: 'absolute',
          left: `${mousePos.x + 10}px`,
          top: `${mousePos.y - 10}px`,
          backgroundColor: 'rgba(23, 25, 35, 0.95)',
          border: '1px solid rgba(204, 204, 220, 0.2)',
          borderRadius: '6px',
          padding: '8px 12px',
          fontSize: '12px',
          color: '#ffffff',
          pointerEvents: 'none',
          zIndex: 20,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '4px' }}>
            {formatValue(hoveredPoint.y || hoveredPoint.value, unit)}
          </div>
          <div style={{ color: 'rgba(204, 204, 220, 0.7)' }}>
            {new Date(hoveredPoint.x || hoveredPoint.timestamp).toLocaleString()}
          </div>
        </div>
      )}

      {/* Zoom indicator */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '10px',
        fontSize: '11px',
        color: 'rgba(204, 204, 220, 0.6)',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: '4px 8px',
        borderRadius: '4px'
      }}>
        Zoom: {zoom.toFixed(1)}x | Drag to pan
      </div>
    </div>
  );
}