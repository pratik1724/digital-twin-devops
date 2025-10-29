import React, { useState, useEffect, useMemo } from 'react';
import { GrafanaMetricCard } from './GrafanaMetricCard';
import { GrafanaDetailModal } from './GrafanaDetailModal';
import { getLiveValue, getAggregates } from '../../lib/sitewise';
import { inletMetrics, outletMetrics } from '../../config/dmr-map.js';

export function GrafanaMetricsPanel({ 
  compact = false, 
  showModal = true, 
  selectedMetric = null,
  maxMetrics = null,
  showHeader = true 
}) {
  const [liveMap, setLiveMap] = useState({});
  const [trendMap, setTrendMap] = useState({});
  const [selectedModalMetric, setSelectedModalMetric] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);

  // Combine all metrics
  const allMetrics = useMemo(() => {
    const combined = [...inletMetrics, ...outletMetrics];
    if (maxMetrics) {
      return combined.slice(0, maxMetrics);
    }
    return combined;
  }, [maxMetrics]);

  // Handle metric card click
  const handleMetricClick = (metric) => {
    if (!showModal) return;
    console.log('Opening detail modal for metric:', metric.label);
    setSelectedModalMetric(metric);
    setIsModalOpen(true);
  };

  // Handle modal close
  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedModalMetric(null);
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
    
    // Set up polling interval (every 10 seconds for compact mode, 5 for full)
    const interval = compact ? 10000 : 5000;
    const liveInterval = setInterval(loadLiveData, interval);
    
    return () => {
      mounted = false;
      clearInterval(liveInterval);
    };
  }, [allMetrics, compact]);

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
        
        // Add delay between requests
        await new Promise(resolve => setTimeout(resolve, compact ? 200 : 150));
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
  }, [allMetrics, compact]);

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: compact ? '200px' : '400px',
        color: 'rgba(204, 204, 220, 0.7)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: '2px solid rgba(16, 185, 129, 0.3)',
            borderTop: '2px solid #10b981',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 12px'
          }} />
          <div style={{ fontSize: compact ? '12px' : '14px' }}>
            Loading metrics...
          </div>
        </div>
      </div>
    );
  }

  // Style the metrics based on compact mode
  const cardStyle = compact ? {
    minHeight: '180px',
    padding: '12px'
  } : {};

  const gridStyle = compact ? {
    gridTemplateColumns: '1fr',
    gap: '12px'
  } : {
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '20px'
  };

  return (
    <>
      {showHeader && (
        <div style={{
          marginBottom: compact ? '16px' : '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{
            color: '#ffffff',
            fontSize: compact ? '16px' : '20px',
            fontWeight: '600'
          }}>
            DMR Metrics
          </div>
          <div style={{
            color: 'rgba(204, 204, 220, 0.6)',
            fontSize: compact ? '11px' : '12px'
          }}>
            {Object.keys(liveMap).length}/{allMetrics.length} active
          </div>
        </div>
      )}

      <div style={{
        display: 'grid',
        ...gridStyle
      }}>
        {allMetrics.map((metric) => (
          <div key={metric.id} style={cardStyle}>
            <GrafanaMetricCard
              metric={metric}
              liveData={liveMap[metric.id]}
              trendData={trendMap[metric.id] || []}
              onClick={handleMetricClick}
              isSelected={selectedModalMetric?.id === metric.id}
              compact={compact}
            />
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      {showModal && (
        <GrafanaDetailModal
          metric={selectedModalMetric}
          liveData={selectedModalMetric ? liveMap[selectedModalMetric.id] : null}
          trendData={selectedModalMetric ? trendMap[selectedModalMetric.id] : []}
          isOpen={isModalOpen}
          onClose={handleModalClose}
        />
      )}

      {/* Loading animation styles */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}