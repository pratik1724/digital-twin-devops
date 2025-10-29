import React, { useMemo } from 'react';

export function GrafanaSparkline({ 
  data = [], 
  width = 260, 
  height = 80, 
  color = '#10b981',
  backgroundColor = 'rgba(16, 185, 129, 0.05)',
  showArea = true,
  strokeWidth = 2
}) {
  const processedData = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return { points: [], areaPath: '', linePath: '', hasData: false };
    }

    // Filter and validate data points
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
      return { points: [], areaPath: '', linePath: '', hasData: false };
    }

    // Calculate bounds
    const values = validPoints.map(p => p.y || p.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const valueRange = Math.max(maxValue - minValue, 1); // Avoid division by zero

    // Create normalized points for SVG
    const padding = 4;
    const chartWidth = width - (padding * 2);
    const chartHeight = height - (padding * 2);

    const points = validPoints.map((point, index) => {
      const value = point.y || point.value;
      
      // Calculate x with safety checks
      const indexRatio = validPoints.length <= 1 ? 0 : index / (validPoints.length - 1);
      const x = padding + (indexRatio * chartWidth);
      
      // Calculate y with safety checks
      const normalizedValue = valueRange === 0 ? 0.5 : (value - minValue) / valueRange;
      const y = padding + chartHeight - (normalizedValue * chartHeight);
      
      // Ensure coordinates are valid numbers
      const safeX = !isNaN(x) && isFinite(x) ? x : padding;
      const safeY = !isNaN(y) && isFinite(y) ? y : padding + chartHeight / 2;
      
      return { x: safeX, y: safeY, value };
    });

    // Generate SVG paths
    let linePath = '';
    let areaPath = '';

    if (points.length > 0) {
      // Filter points for valid coordinates before generating paths
      const validPathPoints = points.filter(point => 
        point && 
        typeof point.x === 'number' && 
        typeof point.y === 'number' && 
        !isNaN(point.x) && 
        !isNaN(point.y) &&
        isFinite(point.x) &&
        isFinite(point.y)
      );

      if (validPathPoints.length > 0) {
        // Line path
        linePath = validPathPoints.reduce((path, point, index) => {
          const command = index === 0 ? 'M' : 'L';
          return `${path} ${command} ${point.x} ${point.y}`;
        }, '').trim();

        // Area path (for filled area under the line)
        if (showArea && validPathPoints.length > 1) {
          const firstPoint = validPathPoints[0];
          const lastPoint = validPathPoints[validPathPoints.length - 1];
          
          areaPath = `M ${firstPoint.x} ${height - padding} ` +
                    `L ${firstPoint.x} ${firstPoint.y} ` +
                    validPathPoints.slice(1).reduce((path, point) => {
                      return `${path} L ${point.x} ${point.y}`;
                    }, '') +
                    ` L ${lastPoint.x} ${height - padding} Z`;
        }
      }
    }

    return { points, areaPath, linePath, hasData: true };
  }, [data, width, height, showArea]);

  if (!processedData.hasData) {
    return (
      <div style={{
        width: `${width}px`,
        height: `${height}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(204, 204, 220, 0.05)',
        borderRadius: '4px',
        border: '1px dashed rgba(204, 204, 220, 0.15)'
      }}>
        <span style={{
          color: 'rgba(204, 204, 220, 0.5)',
          fontSize: '11px',
          fontWeight: '500'
        }}>
          No data available
        </span>
      </div>
    );
  }

  const gradientId = `gradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div style={{ width: `${width}px`, height: `${height}px` }}>
      <svg 
        width={width} 
        height={height} 
        style={{ display: 'block' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect 
          x="0" 
          y="0" 
          width={width} 
          height={height} 
          fill={backgroundColor}
          rx="4"
        />

        {/* Area fill */}
        {showArea && processedData.areaPath && !processedData.areaPath.includes('NaN') && (
          <path
            d={processedData.areaPath}
            fill={`url(#${gradientId})`}
            stroke="none"
          />
        )}

        {/* Line */}
        {processedData.linePath && !processedData.linePath.includes('NaN') && (
          <path
            d={processedData.linePath}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Data points */}
        {processedData.points
          .filter(point => 
            point && 
            typeof point.x === 'number' && 
            typeof point.y === 'number' && 
            !isNaN(point.x) && 
            !isNaN(point.y) &&
            isFinite(point.x) &&
            isFinite(point.y)
          )
          .map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="2"
              fill={color}
              opacity="0.8"
            />
          ))}
      </svg>
    </div>
  );
}