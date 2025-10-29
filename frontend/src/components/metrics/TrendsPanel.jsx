import React, { useMemo } from "react";

// Simple skeleton placeholder component
function SparklineSkeleton({ width, height, message = "Loading chart..." }) {
  return (
    <div 
      style={{ 
        width: `${width}px`, 
        height: `${height}px`,
        minHeight: '120px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(16,185,129,0.06)',
        borderRadius: '6px',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.1), transparent)',
        animation: 'shimmer 1.5s infinite'
      }} />
      <span style={{ color: 'rgba(16,185,129,0.4)', fontSize: '12px', zIndex: 1 }}>
        {message}
      </span>
    </div>
  );
}

export function TrendsPanel({ points = [], width = 300, height = 120, stroke = "#10b981", metric = null }) {
  // Ensure minimum dimensions per user requirements
  const actualHeight = Math.max(height, 120);
  const actualWidth = Math.max(width, 100);

  // Debug logging for troubleshooting
  console.log(`TrendsPanel: ${metric?.label || 'Unknown'} - Points:`, points?.length || 0);

  // Process and validate data
  const processedPoints = useMemo(() => {
    if (!points || !Array.isArray(points) || points.length === 0) {
      console.log(`TrendsPanel: ${metric?.label || 'Unknown'} - No points data`);
      return [];
    }
    
    // Filter and validate points
    const filtered = points
      .filter(p => {
        // Check for valid point structure
        if (!p) return false;
        const hasValidX = typeof p.x === 'number' || typeof p.value === 'number';
        const hasValidY = typeof p.y === 'number' || typeof p.value === 'number';
        return hasValidX && hasValidY && !isNaN(p.y || p.value);
      })
      .sort((a, b) => (a.x || a.value || 0) - (b.x || b.value || 0));
    
    console.log(`TrendsPanel: ${metric?.label || 'Unknown'} - Filtered points:`, filtered.length);
    return filtered;
  }, [points, metric]);

  // Generate path (simplified version)
  const path = useMemo(() => {
    if (!processedPoints || processedPoints.length === 0) {
      console.log(`TrendsPanel: ${metric?.label || 'Unknown'} - No processed points for path`);
      return "";
    }

    try {
      const xs = processedPoints.map(p => p.x || p.value || 0);
      const ys = processedPoints.map(p => p.y || p.value || 0);
      
      if (xs.length === 0 || ys.length === 0) return "";
      
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const rangeX = Math.max(1, maxX - minX);
      const rangeY = Math.max(1, maxY - minY);

      const scaleX = x => ((x - minX) / rangeX) * (actualWidth - 8) + 4;
      const scaleY = y => actualHeight - (((y - minY) / rangeY) * (actualHeight - 8) + 4);

      let d = "";
      processedPoints.forEach((p, i) => {
        const sx = scaleX(p.x || p.value || 0);
        const sy = scaleY(p.y || p.value || 0);
        d += i === 0 ? `M ${sx} ${sy}` : ` L ${sx} ${sy}`;
      });
      
      console.log(`TrendsPanel: ${metric?.label || 'Unknown'} - Generated path length:`, d.length);
      return d;
    } catch (error) {
      console.error(`TrendsPanel: ${metric?.label || 'Unknown'} - Error generating path:`, error);
      return "";
    }
  }, [processedPoints, actualWidth, actualHeight, metric]);

  // Fixed container with exact dimensions
  const containerStyle = {
    minHeight: '120px',
    width: '100%',
    maxWidth: `${actualWidth}px`,
    height: `${actualHeight}px`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  // Show skeleton if no data
  if (!processedPoints.length) {
    const message = points === undefined ? "Loading chart..." : "No data available";
    return (
      <div style={containerStyle}>
        <SparklineSkeleton width={actualWidth} height={actualHeight} message={message} />
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <svg 
        width={actualWidth} 
        height={actualHeight} 
        aria-label={`${metric?.label || 'Metric'} trend chart`} 
        role="img"
        style={{ display: 'block' }}
      >
        <defs>
          <linearGradient id={`spark-${Math.random().toString(36).substr(2, 9)}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.6" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect 
          x="0" 
          y="0" 
          width={actualWidth} 
          height={actualHeight} 
          rx="6" 
          fill="rgba(16,185,129,0.06)" 
        />
        {path && (
          <path 
            d={path} 
            fill="none" 
            stroke={stroke} 
            strokeWidth="2" 
            strokeLinecap="round" 
          />
        )}
        {!path && (
          <text 
            x={actualWidth / 2} 
            y={actualHeight / 2} 
            textAnchor="middle" 
            dominantBaseline="middle" 
            fill="rgba(16,185,129,0.4)" 
            fontSize="12"
          >
            No data
          </text>
        )}
      </svg>
    </div>
  );
}