import React, { useEffect, useRef, useState } from 'react';
import { GrafanaTimeSeriesChart } from './GrafanaTimeSeriesChart';

function formatValue(value, unit = '') {
  if (value == null || isNaN(value)) return '—';
  if (Math.abs(value) >= 1000) return `${Math.round(value).toLocaleString()} ${unit}`;
  return `${Number(value).toFixed(2)} ${unit}`;
}

function getQualityColor(quality) {
  switch (quality?.toUpperCase()) {
    case 'GOOD': return '#10b981';
    case 'WARN': return '#f59e0b'; 
    case 'BAD': return '#ef4444';
    default: return '#6b7280';
  }
}

export function GrafanaDetailModal({ 
  metric, 
  liveData, 
  trendData = [], 
  isOpen, 
  onClose 
}) {
  const modalRef = useRef(null);
  const [selectedRange, setSelectedRange] = useState('6h');

  // Handle escape key and click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleClickOutside);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !metric) return null;

  const value = liveData?.value;
  const timestamp = liveData?.time ? new Date(liveData.time) : null;
  const quality = liveData?.quality || 'UNKNOWN';
  const qualityColor = getQualityColor(quality);

  // Calculate statistics
  let stats = null;
  if (trendData && trendData.length > 0) {
    const values = trendData.map(point => point.y || point.value || 0);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const latest = values[values.length - 1];
    const previous = values[values.length - 2];
    const change = previous ? ((latest - previous) / previous) * 100 : 0;
    stats = { min, max, avg, latest, change, count: values.length };
  }

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px'
      }}
    >
      <div 
        ref={modalRef}
        style={{
          backgroundColor: 'rgba(23, 25, 35, 0.95)',
          border: '1px solid rgba(204, 204, 220, 0.15)',
          borderRadius: '12px',
          width: '90vw',
          maxWidth: '1200px',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(20px)'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '24px 24px 16px',
          borderBottom: '1px solid rgba(204, 204, 220, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h2 style={{
              color: '#ffffff',
              fontSize: '24px',
              fontWeight: '600',
              margin: 0
            }}>
              {metric.label}
            </h2>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 12px',
              backgroundColor: 'rgba(204, 204, 220, 0.1)',
              borderRadius: '16px'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: qualityColor
              }} />
              <span style={{
                color: qualityColor,
                fontSize: '12px',
                fontWeight: '500'
              }}>
                {quality}
              </span>
            </div>
          </div>
          
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(204, 204, 220, 0.7)',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '6px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = 'rgba(204, 204, 220, 0.1)';
              e.target.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = 'rgba(204, 204, 220, 0.7)';
            }}
          >
            ×
          </button>
        </div>

        {/* Current Value Section */}
        <div style={{ padding: '24px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '24px',
            marginBottom: '32px'
          }}>
            <div style={{
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: '8px',
              padding: '20px'
            }}>
              <div style={{
                color: 'rgba(204, 204, 220, 0.7)',
                fontSize: '12px',
                fontWeight: '500',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Current Value
              </div>
              <div style={{
                color: '#10b981',
                fontSize: '32px',
                fontWeight: '700',
                lineHeight: '1.2',
                marginBottom: '4px'
              }}>
                {formatValue(value, metric.unit)}
              </div>
              <div style={{
                color: 'rgba(204, 204, 220, 0.6)',
                fontSize: '11px'
              }}>
                {timestamp ? timestamp.toLocaleString() : 'No timestamp'}
              </div>
            </div>

            {stats && (
              <>
                <div style={{
                  backgroundColor: 'rgba(204, 204, 220, 0.05)',
                  border: '1px solid rgba(204, 204, 220, 0.1)',
                  borderRadius: '8px',
                  padding: '20px'
                }}>
                  <div style={{
                    color: 'rgba(204, 204, 220, 0.7)',
                    fontSize: '12px',
                    fontWeight: '500',
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    6-Hour Average
                  </div>
                  <div style={{
                    color: '#ffffff',
                    fontSize: '24px',
                    fontWeight: '600',
                    lineHeight: '1.2'
                  }}>
                    {formatValue(stats.avg, metric.unit)}
                  </div>
                </div>

                <div style={{
                  backgroundColor: 'rgba(204, 204, 220, 0.05)',
                  border: '1px solid rgba(204, 204, 220, 0.1)',
                  borderRadius: '8px',
                  padding: '20px'
                }}>
                  <div style={{
                    color: 'rgba(204, 204, 220, 0.7)',
                    fontSize: '12px',
                    fontWeight: '500',
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Trend
                  </div>
                  <div style={{
                    color: stats.change >= 0 ? '#10b981' : '#ef4444',
                    fontSize: '24px',
                    fontWeight: '600',
                    lineHeight: '1.2'
                  }}>
                    {stats.change >= 0 ? '+' : ''}{stats.change.toFixed(1)}%
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Time Series Chart */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <h3 style={{
                color: '#ffffff',
                fontSize: '18px',
                fontWeight: '600',
                margin: 0
              }}>
                Time Series Data
              </h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['1h', '6h', '12h', '24h'].map(range => (
                  <button
                    key={range}
                    onClick={() => setSelectedRange(range)}
                    style={{
                      backgroundColor: selectedRange === range 
                        ? 'rgba(16, 185, 129, 0.2)' 
                        : 'rgba(204, 204, 220, 0.1)',
                      border: selectedRange === range 
                        ? '1px solid rgba(16, 185, 129, 0.4)' 
                        : '1px solid rgba(204, 204, 220, 0.15)',
                      color: selectedRange === range ? '#10b981' : 'rgba(204, 204, 220, 0.7)',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>
            
            <div style={{
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid rgba(204, 204, 220, 0.1)',
              borderRadius: '8px',
              padding: '16px'
            }}>
              <GrafanaTimeSeriesChart 
                data={trendData}
                width={1100}
                height={400}
                color="#10b981"
                unit={metric.unit}
                title={metric.label}
              />
            </div>
          </div>

          {/* Data Table */}
          {trendData && trendData.length > 0 && (
            <div>
              <h3 style={{
                color: '#ffffff',
                fontSize: '18px',
                fontWeight: '600',
                margin: '0 0 16px 0'
              }}>
                Raw Data Points
              </h3>
              <div style={{
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                border: '1px solid rgba(204, 204, 220, 0.1)',
                borderRadius: '8px',
                overflow: 'hidden',
                maxHeight: '300px',
                overflowY: 'auto'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'rgba(204, 204, 220, 0.1)' }}>
                      <th style={{
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: '600',
                        padding: '12px 16px',
                        textAlign: 'left',
                        borderBottom: '1px solid rgba(204, 204, 220, 0.1)'
                      }}>
                        Timestamp
                      </th>
                      <th style={{
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: '600',
                        padding: '12px 16px',
                        textAlign: 'right',
                        borderBottom: '1px solid rgba(204, 204, 220, 0.1)'
                      }}>
                        Value
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {trendData.slice().reverse().map((point, index) => {
                      const pointValue = point.y || point.value;
                      const pointTime = point.x || point.timestamp;
                      const timeStr = pointTime ? new Date(pointTime).toLocaleString() : 'Unknown';
                      
                      return (
                        <tr key={index} style={{
                          borderBottom: index < trendData.length - 1 
                            ? '1px solid rgba(204, 204, 220, 0.05)' 
                            : 'none'
                        }}>
                          <td style={{
                            color: 'rgba(204, 204, 220, 0.8)',
                            fontSize: '12px',
                            padding: '10px 16px'
                          }}>
                            {timeStr}
                          </td>
                          <td style={{
                            color: '#ffffff',
                            fontSize: '12px',
                            fontWeight: '500',
                            padding: '10px 16px',
                            textAlign: 'right'
                          }}>
                            {formatValue(pointValue, metric.unit)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}