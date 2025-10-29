import React, { useEffect, useMemo, useState } from "react";
import { getLiveValue, getAggregates } from "../../lib/sitewise";
import { TrendsPanel } from "./TrendsPanel";
import { MetricDetailModal } from "./MetricDetailModal";
import { inletMetrics, outletMetrics } from "../../config/dmr-map.js";

function formatVal(v) {
  if (v == null || Number.isNaN(v)) return "—";
  if (Math.abs(v) >= 1000) return Math.round(v).toString();
  return Number(v).toFixed(1);
}

function MetricCard({ metric, liveData, trendData, onClick, isSelected }) {
  const value = liveData?.value;
  const time = liveData?.time ? new Date(liveData.time).toLocaleTimeString() : "—";
  const quality = liveData?.quality ?? "—";
  const trend = trendData || [];

  return (
    <div 
      className={`kpi-card kpi-card-clickable ${isSelected ? 'kpi-card-selected' : ''}`}
      onClick={() => onClick(metric)}
      style={{ 
        outline: isSelected ? '1px solid #10b981' : 'none', 
        padding: 18,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        minHeight: '200px',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}
    >
      <div className="kpi-title">{metric.label}</div>
      <div className="kpi-value" style={{ fontSize: 32, margin: '8px 0' }}>
        {formatVal(value)} {metric.unit || ''}
      </div>
      <div className="kpi-sub">Last update: {time} • Quality: {quality}</div>
      
      {/* Fixed-size chart container */}
      <div style={{ 
        marginTop: '12px', 
        minHeight: '120px', 
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <TrendsPanel points={trend} width={320} height={120} metric={metric} />
      </div>
      
      {/* Click hint */}
      <div 
        className="kpi-click-hint" 
        style={{ 
          position: 'absolute',
          bottom: '8px',
          right: '12px',
          fontSize: '12px',
          color: 'rgba(16, 185, 129, 0.7)'
        }}
      >
        Click for details
      </div>
    </div>
  );
}

function MetricSection({ title, metrics, liveMap, trendMap, selectedId, onMetricClick }) {
  return (
    <div className="metric-section">
      <h3 className="metric-section-title">{title}</h3>
      <div className="metric-section-grid">
        {metrics.map((metric) => (
          <MetricCard
            key={metric.id}
            metric={metric}
            liveData={liveMap[metric.id]}
            trendData={trendMap[metric.id]}
            onClick={onMetricClick}
            isSelected={selectedId === metric.id}
          />
        ))}
      </div>
    </div>
  );
}

export function KPIGrid({ selectedId, mappings, columns = 1, sectioned = false }) {
  const [liveMap, setLiveMap] = useState({});
  const [trendMap, setTrendMap] = useState({});
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const selectedMapping = useMemo(
    () => mappings.find((m) => m.id === selectedId) || mappings[0],
    [mappings, selectedId]
  );

  // Handle metric card click
  const handleMetricClick = (metric) => {
    console.log('Metric clicked:', metric.label);
    try {
      setSelectedMetric(metric);
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error opening modal:', error);
    }
  };

  // Handle modal close
  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedMetric(null);
  };

  // Use sectioned metrics or regular mappings
  const metricsToUse = sectioned ? [...inletMetrics, ...outletMetrics] : mappings;

  // Poll all metrics live values every 5s (reduced from 2.5s)
  useEffect(() => {
    let mounted = true;
    async function poll() {
      try {
        const results = await Promise.all(
          metricsToUse.map((m) => getLiveValue({ assetId: m.assetId, propertyId: m.propertyId }))
        );
        if (!mounted) return;
        const next = {};
        metricsToUse.forEach((mapItem, idx) => {
          next[mapItem.id] = results[idx];
        });
        setLiveMap(next);
      } catch (e) {
        // Keep previous values on error to avoid blanking UI
      }
    }
    poll();
    const timer = setInterval(poll, 5000); // Increased from 2500ms to 5000ms
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [metricsToUse]);

  // Load 60-min trend for ALL metrics (staggered) and refresh every 60s
  useEffect(() => {
    let mounted = true;
    let cancelled = false;

    async function loadAllTrends() {
      for (let i = 0; i < metricsToUse.length; i++) {
        if (!mounted || cancelled) return;
        const m = metricsToUse[i];
        try {
          const pts = await getAggregates({ assetId: m.assetId, propertyId: m.propertyId, minutes: 60 });
          if (!mounted || cancelled) return;
          setTrendMap((prev) => ({ ...prev, [m.id]: pts }));
        } catch (e) {
          if (!mounted || cancelled) return;
          setTrendMap((prev) => ({ ...prev, [m.id]: [] }));
        }
        // Add stagger delay to prevent overwhelming the system
        await new Promise((r) => setTimeout(r, 200)); // Increased from 120ms to 200ms
      }
    }

    loadAllTrends();
    const refresh = setInterval(loadAllTrends, 60_000);

    return () => {
      mounted = false;
      cancelled = true;
      clearInterval(refresh);
    };
  }, [metricsToUse]);

  if (sectioned) {
    return (
      <>
        <div className="kpi-sectioned-container">
          <MetricSection
            title="Inlet Metrics"
            metrics={inletMetrics}
            liveMap={liveMap}
            trendMap={trendMap}
            selectedId={selectedId}
            onMetricClick={handleMetricClick}
          />
          <MetricSection
            title="Outlet Metrics"
            metrics={outletMetrics}
            liveMap={liveMap}
            trendMap={trendMap}
            selectedId={selectedId}
            onMetricClick={handleMetricClick}
          />
        </div>
        
        <MetricDetailModal
          metric={selectedMetric}
          liveData={selectedMetric ? liveMap[selectedMetric.id] : null}
          trendData={selectedMetric ? trendMap[selectedMetric.id] : null}
          isOpen={isModalOpen}
          onClose={handleModalClose}
        />
      </>
    );
  }

  // Original non-sectioned grid layout
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 
      columns === "auto" 
        ? "repeat(auto-fit, minmax(380px, 1fr))" 
        : columns === 3 
        ? "repeat(3, 1fr)" 
        : columns === 2 
        ? "repeat(2, 1fr)" 
        : "repeat(1, 1fr)",
    gap: 20,
  };

  return (
    <>
      <div className="kpi-grid" style={gridStyle}>
        {mappings.map((m) => {
          const live = liveMap[m.id];
          const value = live?.value;
          const time = live?.time ? new Date(live.time).toLocaleTimeString() : "—";
          const quality = live?.quality ?? "—";
          const trend = trendMap[m.id] || [];
          const isSelected = m.id === selectedId;

          return (
            <div
              key={m.id} 
              className="kpi-card kpi-card-clickable" 
              style={{ 
                outline: isSelected ? '1px solid #10b981' : 'none', 
                padding: 18,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                minHeight: '200px',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative'
              }}
              onClick={() => handleMetricClick(m)}
            >
              <div className="kpi-title">{m.label}</div>
              <div className="kpi-value" style={{ fontSize: 32, margin: '8px 0' }}>
                {formatVal(value)} {m.unit || ''}
              </div>
              <div className="kpi-sub">Last update: {time} • Quality: {quality}</div>
              
              {/* Fixed-size chart container */}
              <div style={{ 
                marginTop: '12px', 
                minHeight: '120px', 
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <TrendsPanel points={trend} width={320} height={120} metric={m} />
              </div>
              
              {/* Click hint */}
              <div 
                className="kpi-click-hint" 
                style={{ 
                  position: 'absolute',
                  bottom: '8px',
                  right: '12px',
                  fontSize: '12px',
                  color: 'rgba(16, 185, 129, 0.7)'
                }}
              >
                Click for details
              </div>
            </div>
          );
        })}
      </div>

      <MetricDetailModal
        metric={selectedMetric}
        liveData={selectedMetric ? liveMap[selectedMetric.id] : null}
        trendData={selectedMetric ? trendMap[selectedMetric.id] : null}
        isOpen={isModalOpen}
        onClose={handleModalClose}
      />
    </>
  );
}