import React, { useState, useEffect, useMemo } from 'react';
import { GrafanaSparkline } from './GrafanaSparkline';

function formatValue(value, unit = '') {
  if (value == null || isNaN(value)) return '—';
  if (Math.abs(value) >= 1000) return `${Math.round(value).toLocaleString()} ${unit}`;
  return `${Number(value).toFixed(1)} ${unit}`;
}

function getQualityColor(quality) {
  switch (quality?.toUpperCase()) {
    case 'GOOD': return '#10b981';
    case 'WARN': return '#f59e0b'; 
    case 'BAD': return '#ef4444';
    default: return '#6b7280';
  }
}

export function GrafanaMetricCard({ 
  metric, 
  liveData, 
  trendData = [], 
  onClick,
  isSelected = false,
  compact = false 
}) {
  const [isHovered, setIsHovered] = useState(false);
  
  const value = liveData?.value;
  const timestamp = liveData?.time ? new Date(liveData.time) : null;
  const quality = liveData?.quality || 'UNKNOWN';
  
  const timeString = timestamp ? timestamp.toLocaleTimeString() : '—';
  const dateString = timestamp ? timestamp.toLocaleDateString() : '';
  
  // Calculate trend statistics
  const trendStats = useMemo(() => {
    // Handle both old format (array) and new format (object with values)
    let dataArray = [];
    
    if (!trendData) return null;
    
    if (Array.isArray(trendData)) {
      dataArray = trendData;
    } else if (trendData.values && Array.isArray(trendData.values)) {
      dataArray = trendData.values;
    } else {
      return null;
    }
    
    if (dataArray.length === 0) return null;
    
    const values = dataArray.map(point => point.y || point.value || 0);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const latest = values[values.length - 1];
    const previous = values[values.length - 2];
    const change = previous ? ((latest - previous) / previous) * 100 : 0;
    
    return { min, max, avg, latest, change, count: values.length };
  }, [trendData]);

  const qualityColor = getQualityColor(quality);
  
  // Adjust sizes based on compact mode
  const cardHeight = compact ? '160px' : '280px';
  const titleFontSize = compact ? '12px' : '14px';
  const valueFontSize = compact ? '20px' : '28px';
  const sparklineHeight = compact ? '50px' : '80px';
  const sparklineWidth = compact ? '200px' : '260px';
  
  return (
    <div 
      className={`grafana-metric-card ${isSelected ? 'selected' : ''}`}
      style={{
        backgroundColor: 'rgba(23, 25, 35, 0.9)',
        border: `1px solid ${isSelected ? '#10b981' : 'rgba(204, 204, 220, 0.15)'}`,
        borderRadius: '8px',
        padding: compact ? '12px' : '16px',
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        minHeight: cardHeight,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        backdropFilter: 'blur(8px)',
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: isHovered 
          ? '0 8px 25px rgba(16, 185, 129, 0.15)' 
          : '0 2px 8px rgba(0, 0, 0, 0.1)'
      }}
      onClick={() => onClick && onClick(metric)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header with metric name and quality indicator */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: compact ? '8px' : '12px'
      }}>
        <h3 style={{
          color: '#ffffff',
          fontSize: titleFontSize,
          fontWeight: '500',
          margin: 0,
          lineHeight: '1.4',
          flex: 1
        }}>
          {metric.label}
        </h3>
        <div style={{
          width: compact ? '6px' : '8px',
          height: compact ? '6px' : '8px',
          borderRadius: '50%',
          backgroundColor: qualityColor,
          marginLeft: '8px',
          marginTop: '2px'
        }} />
      </div>

      {/* Main value display */}
      <div style={{ marginBottom: compact ? '6px' : '8px' }}>
        <div style={{
          color: '#ffffff',
          fontSize: valueFontSize,
          fontWeight: '600',
          lineHeight: '1.2',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          {formatValue(value, metric.unit)}
        </div>
      </div>

      {/* Timestamp and trend info */}
      <div style={{ 
        fontSize: compact ? '10px' : '12px', 
        color: 'rgba(204, 204, 220, 0.7)',
        marginBottom: compact ? '12px' : '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>{timeString}</span>
        {trendStats && (
          <span style={{ 
            color: trendStats.change >= 0 ? '#10b981' : '#ef4444',
            fontWeight: '500'
          }}>
            {trendStats.change >= 0 ? '+' : ''}{trendStats.change.toFixed(1)}%
          </span>
        )}
      </div>

      {/* Sparkline chart area */}
      <div style={{ 
        flex: 1, 
        minHeight: sparklineHeight,
        display: 'flex',
        alignItems: 'center',
        marginBottom: compact ? '8px' : '12px'
      }}>
        <GrafanaSparkline 
          data={Array.isArray(trendData) ? trendData : (trendData?.values || [])} 
          width={sparklineWidth} 
          height={sparklineHeight}
          color="#10b981"
          backgroundColor="rgba(16, 185, 129, 0.05)"
          showArea={true}
        />
      </div>

      {/* Footer with additional stats - only in non-compact mode */}
      {!compact && trendStats && (
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
          fontSize: '11px',
          color: 'rgba(204, 204, 220, 0.6)',
          borderTop: '1px solid rgba(204, 204, 220, 0.1)',
          paddingTop: '8px'
        }}>
          <div>
            <div style={{ color: 'rgba(204, 204, 220, 0.5)' }}>MIN</div>
            <div style={{ color: '#ffffff', fontWeight: '500' }}>
              {formatValue(trendStats.min, metric.unit)}
            </div>
          </div>
          <div>
            <div style={{ color: 'rgba(204, 204, 220, 0.5)' }}>AVG</div>
            <div style={{ color: '#ffffff', fontWeight: '500' }}>
              {formatValue(trendStats.avg, metric.unit)}
            </div>
          </div>
          <div>
            <div style={{ color: 'rgba(204, 204, 220, 0.5)' }}>MAX</div>
            <div style={{ color: '#ffffff', fontWeight: '500' }}>
              {formatValue(trendStats.max, metric.unit)}
            </div>
          </div>
        </div>
      )}

      {/* Click indicator - simplified for compact mode */}
      <div style={{
        position: 'absolute',
        bottom: compact ? '4px' : '8px',
        right: compact ? '8px' : '12px',
        fontSize: compact ? '9px' : '11px',
        color: 'rgba(16, 185, 129, 0.6)',
        opacity: isHovered ? 1 : 0.6,
        transition: 'opacity 0.2s ease'
      }}>
        {compact ? 'Details' : 'Click for details'}
      </div>
    </div>
  );
}