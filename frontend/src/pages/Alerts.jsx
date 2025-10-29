import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const getClassificationIcon = (classification) => {
  switch (classification) {
    case 'General Info':
      return '🔵'; // Blue icon
    case 'Warning':
      return '🟠'; // Orange icon
    case 'Critical Alert':
      return '🔴'; // Red icon
    default:
      return '⚪';
  }
};

const getClassificationColor = (classification) => {
  switch (classification) {
    case 'General Info':
      return '#3b82f6'; // Blue
    case 'Warning':
      return '#f59e0b'; // Orange
    case 'Critical Alert':
      return '#ef4444'; // Red
    default:
      return '#6b7280'; // Gray
  }
};

export function Alerts() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassification, setSelectedClassification] = useState('All');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Handle window resize for mobile responsiveness
  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch alerts from API
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        setLoading(true);
        const backendUrl = import.meta?.env?.REACT_APP_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || 'https://dwsim-dash.preview.emergentagent.com';
        const response = await fetch(`${backendUrl}/api/alerts`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch alerts');
        }
        
        const data = await response.json();
        
        // Transform API data to match component format
        const transformedAlerts = data.map(alert => ({
          id: alert.id,
          timestamp: new Date(alert.timestamp).toLocaleString('en-CA', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }).replace(',', ''),
          eventName: alert.event_name,
          eventDescription: alert.event_description,
          classification: alert.classification,
          isNew: alert.is_new
        }));
        
        setAlerts(transformedAlerts);
        setError(null);
      } catch (err) {
        console.error('Error fetching alerts:', err);
        setError(err.message);
        
        // Fallback to sample data if API fails
        const sampleAlerts = [
          {
            id: 1,
            timestamp: '2025-09-12 10:15',
            eventName: 'Simulation Started',
            eventDescription: 'CFD Simulation launched successfully',
            classification: 'General Info',
            isNew: false
          },
          {
            id: 2,
            timestamp: '2025-09-12 10:45',
            eventName: 'Furnace Deviation',
            eventDescription: 'Reactor Furnace 2 Temp +7% deviation from setpoint',
            classification: 'Warning',
            isNew: true
          },
          {
            id: 3,
            timestamp: '2025-09-12 11:00',
            eventName: 'Pressure High',
            eventDescription: 'Reactor Pressure exceeded 10 bar - immediate attention required',
            classification: 'Critical Alert',
            isNew: true
          },
          {
            id: 4,
            timestamp: '2025-09-12 11:20',
            eventName: 'Flowmeter Reading',
            eventDescription: 'H₂ Outlet Flowrate updated to 1205 ml/min',
            classification: 'General Info',
            isNew: false
          },
          {
            id: 5,
            timestamp: '2025-09-12 11:45',
            eventName: 'Safety Check',
            eventDescription: 'TI200 Average Furnace Temp > 1250°C - safety protocols activated',
            classification: 'Critical Alert',
            isNew: true
          },
          {
            id: 6,
            timestamp: '2025-09-12 12:15',
            eventName: 'MFC Switch',
            eventDescription: 'MFC101 switched from Air to N₂ flow',
            classification: 'General Info',
            isNew: false
          },
          {
            id: 7,
            timestamp: '2025-09-12 12:30',
            eventName: 'Outlet Deviation',
            eventDescription: 'CH₄ outlet flowrate below expected range (target: 800-900 ml/min, actual: 735 ml/min)',
            classification: 'Warning',
            isNew: true
          },
          {
            id: 8,
            timestamp: '2025-09-12 12:45',
            eventName: 'Process Update',
            eventDescription: 'Reactor bed temperature stabilized at 850°C',
            classification: 'General Info',
            isNew: false
          }
        ];
        setAlerts(sampleAlerts);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, []);

  // Filter alerts based on search term and classification
  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      const matchesSearch = 
        alert.eventName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.eventDescription.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesClassification = 
        selectedClassification === 'All' || alert.classification === selectedClassification;
      
      return matchesSearch && matchesClassification;
    });
  }, [alerts, searchTerm, selectedClassification]);

  // Get count of new alerts by classification
  const alertCounts = useMemo(() => {
    const counts = {
      total: alerts.filter(a => a.isNew).length,
      'General Info': alerts.filter(a => a.isNew && a.classification === 'General Info').length,
      'Warning': alerts.filter(a => a.isNew && a.classification === 'Warning').length,
      'Critical Alert': alerts.filter(a => a.isNew && a.classification === 'Critical Alert').length
    };
    return counts;
  }, [alerts]);

  const classifications = ['All', 'General Info', 'Warning', 'Critical Alert'];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'rgb(11, 12, 14)',
      color: '#ffffff'
    }}>
      {/* Header */}
      <header style={{
        background: 'rgba(17, 24, 39, 0.95)',
        borderBottom: '1px solid rgba(204, 204, 220, 0.1)',
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '700',
            margin: 0,
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            🚨 Alerts Dashboard
          </h1>
          {alertCounts.total > 0 && (
            <div style={{
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: '#ffffff',
              borderRadius: '20px',
              padding: '4px 12px',
              fontSize: '12px',
              fontWeight: '600',
              boxShadow: '0 0 10px rgba(239, 68, 68, 0.3)'
            }}>
              {alertCounts.total} New
            </div>
          )}
        </div>
        
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.3) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: '8px',
            padding: '10px 20px',
            color: '#10b981',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            backdropFilter: 'blur(10px)'
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
          ← Back to Dashboard
        </button>
      </header>

      {/* Main Content */}
      <div style={{ padding: '24px' }}>
        
        {/* Loading State */}
        {loading && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '60px 20px',
            color: '#6b7280'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
              <div style={{ fontSize: '18px', fontWeight: '600' }}>Loading alerts...</div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#ef4444', marginBottom: '8px' }}>
              Failed to load alerts from server
            </div>
            <div style={{ fontSize: '14px', color: '#9ca3af' }}>
              Showing sample data. Error: {error}
            </div>
          </div>
        )}

        {!loading && (
          <>
        
        {/* Filters and Search */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: '16px',
          marginBottom: '24px',
          alignItems: isMobile ? 'stretch' : 'center'
        }}>
          {/* Search Input */}
          <div style={{ flex: 1 }}>
            <input
              type="text"
              placeholder="Search alerts by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(17, 24, 39, 0.7)',
                border: '1px solid rgba(204, 204, 220, 0.2)',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '14px',
                backdropFilter: 'blur(10px)',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(16, 185, 129, 0.5)';
                e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(204, 204, 220, 0.2)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Classification Filter */}
          <div style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap'
          }}>
            {classifications.map(classification => {
              const isActive = selectedClassification === classification;
              const count = classification === 'All' ? alertCounts.total : alertCounts[classification];
              
              return (
                <button
                  key={classification}
                  onClick={() => setSelectedClassification(classification)}
                  style={{
                    padding: '8px 16px',
                    background: isActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(17, 24, 39, 0.7)',
                    border: isActive ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(204, 204, 220, 0.2)',
                    borderRadius: '20px',
                    color: isActive ? '#10b981' : '#9ca3af',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    backdropFilter: 'blur(10px)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.target.style.background = 'rgba(17, 24, 39, 0.9)';
                      e.target.style.borderColor = 'rgba(204, 204, 220, 0.3)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.target.style.background = 'rgba(17, 24, 39, 0.7)';
                      e.target.style.borderColor = 'rgba(204, 204, 220, 0.2)';
                    }
                  }}
                >
                  {classification !== 'All' && getClassificationIcon(classification)}
                  {classification}
                  {count > 0 && (
                    <span style={{
                      background: getClassificationColor(classification),
                      color: '#ffffff',
                      borderRadius: '10px',
                      padding: '2px 6px',
                      fontSize: '10px',
                      fontWeight: '600',
                      minWidth: '16px',
                      textAlign: 'center'
                    }}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Alerts Table/Cards */}
        {isMobile ? (
          // Mobile: Card view
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredAlerts.map(alert => (
              <div
                key={alert.id}
                style={{
                  background: 'rgba(17, 24, 39, 0.7)',
                  border: `1px solid ${getClassificationColor(alert.classification)}40`,
                  borderRadius: '12px',
                  padding: '16px',
                  backdropFilter: 'blur(10px)',
                  position: 'relative'
                }}
              >
                {alert.isNew && (
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#ef4444',
                    boxShadow: '0 0 6px rgba(239, 68, 68, 0.5)'
                  }} />
                )}
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '8px'
                }}>
                  <span style={{ fontSize: '16px' }}>
                    {getClassificationIcon(alert.classification)}
                  </span>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#ffffff'
                  }}>
                    {alert.eventName}
                  </div>
                </div>
                
                <div style={{
                  fontSize: '12px',
                  color: '#9ca3af',
                  marginBottom: '8px'
                }}>
                  {alert.timestamp}
                </div>
                
                <div style={{
                  fontSize: '13px',
                  color: '#d1d5db',
                  marginBottom: '8px'
                }}>
                  {alert.eventDescription}
                </div>
                
                <div style={{
                  fontSize: '11px',
                  color: getClassificationColor(alert.classification),
                  fontWeight: '500'
                }}>
                  {alert.classification}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Desktop: Table view
          <div style={{
            background: 'rgba(17, 24, 39, 0.7)',
            border: '1px solid rgba(204, 204, 220, 0.1)',
            borderRadius: '12px',
            overflow: 'hidden',
            backdropFilter: 'blur(10px)'
          }}>
            {/* Table Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '160px 200px 1fr 140px 60px',
              gap: '16px',
              padding: '16px 20px',
              background: 'rgba(16, 185, 129, 0.1)',
              borderBottom: '1px solid rgba(16, 185, 129, 0.2)',
              fontSize: '13px',
              fontWeight: '600',
              color: '#10b981'
            }}>
              <div>Timestamp</div>
              <div>Event Name</div>
              <div>Event Description</div>
              <div>Classification</div>
              <div>Status</div>
            </div>

            {/* Table Body */}
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {filteredAlerts.map((alert, index) => (
                <div
                  key={alert.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '160px 200px 1fr 140px 60px',
                    gap: '16px',
                    padding: '16px 20px',
                    borderBottom: index < filteredAlerts.length - 1 ? '1px solid rgba(204, 204, 220, 0.1)' : 'none',
                    background: index % 2 === 0 ? 'rgba(16, 185, 129, 0.02)' : 'transparent',
                    alignItems: 'center',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(16, 185, 129, 0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = index % 2 === 0 ? 'rgba(16, 185, 129, 0.02)' : 'transparent';
                  }}
                >
                  <div style={{
                    fontSize: '12px',
                    color: '#9ca3af',
                    fontFamily: 'monospace'
                  }}>
                    {alert.timestamp}
                  </div>
                  
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#ffffff'
                  }}>
                    {alert.eventName}
                  </div>
                  
                  <div style={{
                    fontSize: '13px',
                    color: '#d1d5db',
                    lineHeight: '1.4'
                  }}>
                    {alert.eventDescription}
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span style={{ fontSize: '14px' }}>
                      {getClassificationIcon(alert.classification)}
                    </span>
                    <span style={{
                      fontSize: '12px',
                      color: getClassificationColor(alert.classification),
                      fontWeight: '500'
                    }}>
                      {alert.classification}
                    </span>
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center'
                  }}>
                    {alert.isNew ? (
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#ef4444',
                        boxShadow: '0 0 6px rgba(239, 68, 68, 0.5)'
                      }} />
                    ) : (
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#6b7280'
                      }} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No results message */}
        {filteredAlerts.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#6b7280'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
            <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
              No alerts found
            </div>
            <div style={{ fontSize: '14px' }}>
              Try adjusting your search terms or filters
            </div>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
}