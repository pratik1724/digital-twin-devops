import React, { useState, useEffect, useMemo } from 'react';
import { GrafanaMetricCard } from './GrafanaMetricCard';
import { GrafanaDetailModal } from './GrafanaDetailModal';
import { getLiveValue, getAggregates } from '../../lib/sitewise';
import { inletMetrics, outletMetrics } from '../../config/dmr-map.js';
import { useNavigate } from 'react-router-dom';

export function GrafanaDashboard() {
  const navigate = useNavigate();
  const [liveMap, setLiveMap] = useState({});
  const [trendMap, setTrendMap] = useState({});
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);

  // Combine all metrics
  const allMetrics = useMemo(() => [...inletMetrics, ...outletMetrics], []);

  // Handle back to main dashboard
  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  // Handle metric card click
  const handleMetricClick = (metric) => {
    console.log('Opening detail modal for metric:', metric.label);
    setSelectedMetric(metric);
    setIsModalOpen(true);
  };

  // Handle modal close
  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedMetric(null);
  };

  // Load live values for all metrics
  useEffect(() => {
    let mounted = true;
    
    async function loadLiveData() {
      try {
        console.log('🔄 Loading live data for', allMetrics.length, 'metrics...');
        
        const results = await Promise.all(
          allMetrics.map(async (metric) => {
            try {
              const result = await getLiveValue({ 
                assetId: metric.assetId, 
                propertyId: metric.propertyId 
              });
              return { id: metric.id, data: result };
            } catch (error) {
              console.warn(`Failed to load live data for ${metric.label}:`, error);
              return { id: metric.id, data: null };
            }
          })
        );
        
        if (!mounted) return;
        
        const newLiveMap = {};
        results.forEach(({ id, data }) => {
          newLiveMap[id] = data;
        });
        
        setLiveMap(newLiveMap);
        setLastUpdate(new Date());
        
        // Count successful loads
        const successCount = results.filter(r => r.data !== null).length;
        console.log(`✅ Loaded live data: ${successCount}/${allMetrics.length} metrics successful`);
        
      } catch (error) {
        console.error('Error loading live data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    // Initial load
    loadLiveData();
    
    // Set up polling interval (every 5 seconds)
    const liveInterval = setInterval(loadLiveData, 5000);
    
    return () => {
      mounted = false;
      clearInterval(liveInterval);
    };
  }, [allMetrics]);

  // Load trend data for all metrics
  useEffect(() => {
    let mounted = true;
    
    async function loadTrendData() {
      console.log('📊 Loading trend data for', allMetrics.length, 'metrics...');
      
      // Load trends sequentially with staggering to avoid overwhelming the API
      for (let i = 0; i < allMetrics.length; i++) {
        if (!mounted) return;
        
        const metric = allMetrics[i];
        
        try {
          const trendData = await getAggregates({ 
            assetId: metric.assetId, 
            propertyId: metric.propertyId, 
            minutes: 360 // 6 hours
          });
          
          if (!mounted) return;
          
          setTrendMap(prev => ({ 
            ...prev, 
            [metric.id]: trendData || [] 
          }));
          
          console.log(`📈 Trend data loaded for ${metric.label}: ${trendData?.length || 0} points`);
          
        } catch (error) {
          console.warn(`Failed to load trend data for ${metric.label}:`, error);
          if (mounted) {
            setTrendMap(prev => ({ 
              ...prev, 
              [metric.id]: [] 
            }));
          }
        }
        
        // Add small delay between requests to prevent overwhelming
        await new Promise(resolve => setTimeout(resolve, 150));
      }
      
      console.log('✅ All trend data loading completed');
    }

    // Initial load with slight delay after live data
    const trendTimeout = setTimeout(loadTrendData, 1000);
    
    // Refresh trend data every 60 seconds
    const trendInterval = setInterval(loadTrendData, 60000);
    
    return () => {
      mounted = false;
      clearTimeout(trendTimeout);
      clearInterval(trendInterval);
    };
  }, [allMetrics]);

  // Group metrics by inlet and outlet
  const inletMetricsData = inletMetrics.map(metric => ({
    metric,
    liveData: liveMap[metric.id],
    trendData: trendMap[metric.id] || []
  }));

  const outletMetricsData = outletMetrics.map(metric => ({
    metric,
    liveData: liveMap[metric.id],
    trendData: trendMap[metric.id] || []
  }));

  if (isLoading) {
    return (
      <div style={{
        backgroundColor: 'rgba(11, 12, 14, 1)',
        minHeight: '100vh',
        padding: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '3px solid rgba(16, 185, 129, 0.3)',
            borderTop: '3px solid #10b981',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <div style={{ color: '#ffffff', fontSize: '16px', fontWeight: '500' }}>
            Loading DMR Metrics Dashboard...
          </div>
          <div style={{ color: 'rgba(204, 204, 220, 0.7)', fontSize: '14px', marginTop: '8px' }}>
            Initializing data connections
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: 'rgba(11, 12, 14, 1)',
      minHeight: '100vh',
      padding: '24px'
    }}>
      {/* Header */}
      <div style={{
        marginBottom: '32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{
            color: '#ffffff',
            fontSize: '32px',
            fontWeight: '700',
            margin: '0 0 8px 0',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            DMR Metrics Dashboard
          </h1>
          <div style={{
            color: 'rgba(204, 204, 220, 0.7)',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <span>Dry Methane Reformer - Live Process Monitoring</span>
            <span style={{
              padding: '4px 8px',
              backgroundColor: 'rgba(16, 185, 129, 0.2)',
              color: '#10b981',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '500'
            }}>
              Last updated: {lastUpdate.toLocaleTimeString()}
            </span>
          </div>
        </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          {/* Back to Dashboard Button */}
          <button
            onClick={handleBackToDashboard}
            style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.3) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              borderRadius: '8px',
              padding: '12px 20px',
              color: '#10b981',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.3) 0%, rgba(5, 150, 105, 0.4) 100%)';
              e.target.style.boxShadow = '0 0 20px rgba(16, 185, 129, 0.3)';
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.borderColor = 'rgba(16, 185, 129, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.3) 100%)';
              e.target.style.boxShadow = 'none';
              e.target.style.transform = 'translateY(0)';
              e.target.style.borderColor = 'rgba(16, 185, 129, 0.4)';
            }}
          >
            <span>←</span>
            Back to Main Dashboard
          </button>
          
          {/* Status indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            color: 'rgba(204, 204, 220, 0.7)',
            fontSize: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#10b981',
                animation: 'pulse 2s infinite'
              }} />
              <span>Live Data</span>
            </div>
            <div>
              {Object.keys(liveMap).length}/{allMetrics.length} metrics active
            </div>
          </div>
        </div>
      </div>

      {/* Inlet Metrics Section */}
      <div style={{ marginBottom: '48px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '24px',
          gap: '16px'
        }}>
          <h2 style={{
            color: '#ffffff',
            fontSize: '24px',
            fontWeight: '600',
            margin: 0
          }}>
            Inlet Metrics
          </h2>
          <div style={{
            height: '1px',
            flex: 1,
            background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.3) 0%, transparent 100%)'
          }} />
          <div style={{
            color: 'rgba(204, 204, 220, 0.6)',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            {inletMetrics.length} metrics
          </div>
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px'
        }}>
          {inletMetricsData.map(({ metric, liveData, trendData }) => (
            <GrafanaMetricCard
              key={metric.id}
              metric={metric}
              liveData={liveData}
              trendData={trendData}
              onClick={handleMetricClick}
              isSelected={selectedMetric?.id === metric.id}
            />
          ))}
        </div>
      </div>

      {/* Outlet Metrics Section */}
      <div style={{ marginBottom: '48px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '24px',
          gap: '16px'
        }}>
          <h2 style={{
            color: '#ffffff',
            fontSize: '24px',
            fontWeight: '600',
            margin: 0
          }}>
            Outlet Metrics
          </h2>
          <div style={{
            height: '1px',
            flex: 1,
            background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.3) 0%, transparent 100%)'
          }} />
          <div style={{
            color: 'rgba(204, 204, 220, 0.6)',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            {outletMetrics.length} metrics
          </div>
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px'
        }}>
          {outletMetricsData.map(({ metric, liveData, trendData }) => (
            <GrafanaMetricCard
              key={metric.id}
              metric={metric}
              liveData={liveData}
              trendData={trendData}
              onClick={handleMetricClick}
              isSelected={selectedMetric?.id === metric.id}
            />
          ))}
        </div>
      </div>

      {/* Detail Modal */}
      <GrafanaDetailModal
        metric={selectedMetric}
        liveData={selectedMetric ? liveMap[selectedMetric.id] : null}
        trendData={selectedMetric ? trendMap[selectedMetric.id] : []}
        isOpen={isModalOpen}
        onClose={handleModalClose}
      />

      {/* Global Styles */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        .grafana-metric-card {
          backdrop-filter: blur(10px);
        }
        
        .grafana-metric-card.selected {
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(16, 185, 129, 0.25);
        }
        
        .grafana-metric-card:hover {
          backdrop-filter: blur(15px);
        }
      `}</style>
    </div>
  );
}