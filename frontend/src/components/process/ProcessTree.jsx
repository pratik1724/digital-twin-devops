import React, { useEffect, useMemo, useState } from "react";
import ReactFlow, { Background, Controls, useEdgesState, useNodesState, MarkerType } from "reactflow";
import "reactflow/dist/style.css";
import dagre from "dagre";
import { getLiveValue } from "../../lib/sitewise";
import { metrics as ALL_METRICS } from "../../config/dmr-map.js";

const green = "#16a34a";
const brightGreen = "#22c55e";
// Optimized sizes for grouped layout
const nodeW = 320;  
const nodeH = 90;   
const gasH = 110;   
const nodeHReactor = 110;
// Inlets container size
const inletsW = 700;
const inletsH = 260;

// Default selection mapping
const NODE_DEFAULT_METRIC = {
  "gas-h2": "h2_inlet_set",
  "gas-ch4": "ch4_inlet_set",
  "gas-co2": "co2_inlet_set",
  "gas-n2": "n_inlet_set",
  "gas-air": "air_inlet_set",
};

// Inline mini-metrics shown inside gas nodes
const GAS_NODE_METRICS = {
  "gas-h2": ["h2_inlet_set", "h2_inlet_pv"],
  "gas-ch4": ["ch4_inlet_set", "ch4_inlet_pv"],
  "gas-co2": ["co2_inlet_set", "co2_inlet_pv"],
  "gas-n2": ["n_inlet_set", "n_inlet_pv"],
  "gas-air": ["air_inlet_set", "air_inlet_pv"],
};

// Grouped Inlets Container Component
function InletsContainer({ data }) {
  const { onSelect } = data;
  const [liveVals, setLiveVals] = useState({});

  // Fetch live values for all gas inlets
  useEffect(() => {
    async function fetchData() {
      const promises = Object.values(GAS_NODE_METRICS).flat().map(async (metricId) => {
        const val = await getLiveValue(metricId);
        return [metricId, val];
      });
      const results = await Promise.all(promises);
      setLiveVals(Object.fromEntries(results));
    }
    fetchData();
    const interval = setInterval(fetchData, 2500);
    return () => clearInterval(interval);
  }, []);

  const gasNodes = [
    { id: 'h2', label: 'H₂ Inlet', metrics: ['h2_inlet_set', 'h2_inlet_pv'], selectMetric: 'h2_inlet_set' },
    { id: 'ch4', label: 'CH₄ Inlet', metrics: ['ch4_inlet_set', 'ch4_inlet_pv'], selectMetric: 'ch4_inlet_set' },
    { id: 'co2', label: 'CO₂ Inlet', metrics: ['co2_inlet_set', 'co2_inlet_pv'], selectMetric: 'co2_inlet_set' },
    { id: 'n2', label: 'N₂ Inlet', metrics: ['n_inlet_set', 'n_inlet_pv'], selectMetric: 'n_inlet_set' },
    { id: 'air', label: 'Air Inlet', metrics: ['air_inlet_set', 'air_inlet_pv'], selectMetric: 'air_inlet_set' }
  ];

  return (
    <div 
      style={{
        width: inletsW,
        height: inletsH,
        background: "rgba(26, 29, 41, 0.8)",
        border: "2px solid rgba(34, 197, 94, 0.3)",
        borderRadius: "16px",
        padding: "16px",
        position: "relative",
        boxShadow: "0 6px 20px rgba(0,0,0,0.3)"
      }}
    >
      {/* Container Title */}
      <div style={{
        position: "absolute",
        top: "-12px",
        left: "20px",
        background: "#1a1d29",
        padding: "4px 12px",
        borderRadius: "8px",
        fontSize: "14px",
        fontWeight: 700,
        color: "#22c55e",
        border: "1px solid rgba(34, 197, 94, 0.3)"
      }}>
        Inlets
      </div>

      {/* Grid layout for gas inlets */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "1fr 1fr",
        gap: "12px",
        height: "100%",
        alignItems: "center",
        justifyItems: "center"
      }}>
        {/* First row: H2, CH4 */}
        {gasNodes.slice(0, 2).map((node) => (
          <InletBlock
            key={node.id}
            id={node.id}
            label={node.label}
            metrics={node.metrics}
            values={liveVals}
            onSelect={() => onSelect && onSelect(node.selectMetric)}
          />
        ))}
        
        {/* Second row: CO2, N2, Air - CO2 spans first position, N2 and Air share second */}
        <InletBlock
          id="co2"
          label="CO₂ Inlet"
          metrics={gasNodes[2].metrics}
          values={liveVals}
          onSelect={() => onSelect && onSelect(gasNodes[2].selectMetric)}
        />
        
        <div style={{ display: "flex", gap: "8px" }}>
          {gasNodes.slice(3, 5).map((node) => (
            <InletBlock
              key={node.id}
              id={node.id}
              label={node.label}
              metrics={node.metrics}
              values={liveVals}
              onSelect={() => onSelect && onSelect(node.selectMetric)}
              compact={true}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Individual Inlet Block Component
function InletBlock({ id, label, metrics, values, onSelect, compact = false }) {
  const width = compact ? 140 : 300;
  const height = compact ? 85 : 100;
  
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelect(); }}
      style={{
        width,
        height,
        background: "#1a1d29",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "10px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "all 0.2s ease",
        position: "relative",
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3), 0 0 0 1px rgba(34, 197, 94, 0.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
      }}
    >
      <div style={{
        fontSize: compact ? 13 : 15,
        fontWeight: 600,
        color: "#e5e7eb",
        textAlign: "center",
        marginBottom: compact ? 4 : 8
      }}>
        {label}
      </div>
      
      {/* Mini metrics */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: compact ? 10 : 11 }}>
        {metrics.map((metricId, idx) => {
          const val = values[metricId];
          const label = idx === 0 ? 'Set' : 'PV';
          return (
            <div key={metricId} style={{ display: 'flex', justifyContent: 'space-between', gap: compact ? 6 : 8, minWidth: compact ? 120 : 160 }}>
              <span style={{ color: '#cbd5e1', opacity: 0.9 }}>{label}:</span>
              <span style={{ color: '#86efac', fontWeight: 600 }}>
                {val?.value != null ? Number(val.value).toFixed(1) : '—'} ml/min
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function layoutWithDagre(nodes, edges) {
  const g = new dagre.graphlib.Graph();
  // Optimized spacing for grouped layout
  g.setGraph({ rankdir: "TB", nodesep: 32, ranksep: 40, marginx: 8, marginy: 8 });
  g.setDefaultEdgeLabel(() => ({}));
  nodes.forEach((n) => {
    let w = nodeW;
    let h = nodeH;
    if (n.id === "inlets") {
      w = inletsW;
      h = inletsH;
    } else if (n.id === "reactor") {
      h = nodeHReactor;
    }
    g.setNode(n.id, { width: w, height: h });
  });
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);
  return nodes.map((n) => {
    const { x, y } = g.node(n.id);
    let w = nodeW;
    let h = nodeH;
    if (n.id === "inlets") {
      w = inletsW;
      h = inletsH;
    } else if (n.id === "reactor") {
      h = nodeHReactor;
    }
    return { ...n, position: { x: x - w / 2, y: y - h / 2 } };
  });
}

function NodeMiniMetrics({ nodeId }) {
  const ids = GAS_NODE_METRICS[nodeId] || [];
  const cfgs = ids.map((id) => ALL_METRICS.find((m) => m.id === id)).filter(Boolean);
  const [vals, setVals] = useState({});

  useEffect(() => {
    let mounted = true;
    async function poll() {
      try {
        const pairs = await Promise.all(
          cfgs.map(async (m) => {
            const v = await getLiveValue({ assetId: m.assetId, propertyId: m.propertyId });
            return [m.id, v];
          })
        );
        if (!mounted) return;
        const o = {}; pairs.forEach(([k, v]) => { o[k] = v; });
        setVals(o);
      } catch {}
    }
    poll();
    const t = setInterval(poll, 2500);
    return () => { mounted = false; clearInterval(t); };
  }, [nodeId]);

  if (cfgs.length === 0) return null;
  return (
    <div style={{ position: 'absolute', left: 14, right: 14, bottom: 14, display: 'grid', gap: 8 }}>
      {cfgs.map((m, idx) => {
        const v = vals[m.id]?.value;
        const label = idx === 0 ? 'Set' : 'PV';
        return (
          <div key={m.id} title={m.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 14, fontWeight: 600 }}>
            <span style={{ opacity: 0.9, color:'#cbd5e1' }}>{label}:</span>
            <span style={{ color: '#86efac', fontWeight: 700 }}>{v != null ? Number(v).toFixed(1) : '—'} {m.unit || ''}</span>
          </div>
        );
      })}
    </div>
  );
}

function ProcessNode({ id, data }) {
  const { label, onSelect, aria, isSelected } = data;
  const mappedMetric = NODE_DEFAULT_METRIC[id];
  const isGas = id.startsWith('gas-');
  const height = id === 'reactor' ? nodeHReactor : (isGas ? gasH : nodeH);
  
  // Different background colors for visual differentiation
  const getBackgroundColor = (nodeId, selected) => {
    if (selected) return "#0b3b36";
    if (nodeId.startsWith('gas-')) return "#1a1d29"; // Input blocks - slightly blue
    if (nodeId === 'reactor') return "#2a1810"; // Reactor - brownish
    if (nodeId === 'outlet') return "#1a2918"; // Output - greenish
    if (['condenser', 'glc', 'flowmeter'].includes(nodeId)) return "#291a29"; // Process blocks - purplish
    return "#0f172a"; // Default - dark blue
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={aria || label}
      onClick={() => { if (mappedMetric && onSelect) onSelect(mappedMetric); }}
      onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && mappedMetric && onSelect) onSelect(mappedMetric); }}
      className="block rounded-[14px] px-6 py-4"
      style={{
        background: getBackgroundColor(id, isSelected),
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
        color: "#e5e7eb",
        width: nodeW,
        height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        outline: "none",
        cursor: mappedMetric ? 'pointer' : 'default',
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(34, 197, 94, 0.3)';
          e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.5)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25)';
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
        }
      }}
    >
      <div style={{ 
        fontSize: 18, 
        fontWeight: 700,
        userSelect: "none", 
        lineHeight: 1.3, 
        paddingBottom: isGas ? 32 : 0, 
        textAlign:'center',
        letterSpacing: '0.025em',
        textShadow: '0 1px 2px rgba(0,0,0,0.5)'
      }}>{label}</div>
      {isGas && <NodeMiniMetrics nodeId={id} />}
    </div>
  );
}

const nodeTypes = { processNode: ProcessNode, inletsContainer: InletsContainer };

export function ProcessTree({ onSelect, selectedId }) {
  const orderedIds = [
    "gas-ch4","gas-co2","gas-n2","gas-h2","gas-air",
    "mfc","preheaters","reactor","condenser","glc","flowmeter","outlet"
  ];

  const numberMap = useMemo(() => {
    const m = {}; orderedIds.forEach((id, i) => { m[id] = i + 1; }); return m;
  }, []);

  const baseNodes = useMemo(() => [
    // Grouped inlets container
    { id: "inlets", type: "inletsContainer", data: { label: "Inlets", onSelect } },
    // Process flow continues
    { id: "mfc", type: "processNode", data: { label: "MFC\n(Mass Flow Controller)" } },
    { id: "preheaters", type: "processNode", data: { label: "Preheaters" } },
    { id: "reactor", type: "processNode", data: { label: "Reactor" } },
    { id: "pressure", type: "processNode", data: { label: "Pressure\nSensor" } },
    { id: "condenser", type: "processNode", data: { label: "Condenser" } },
    { id: "glc", type: "processNode", data: { label: "GLC\nSeparator" } },
    { id: "flowmeter", type: "processNode", data: { label: "Flow Meter" } },
    { id: "outlet", type: "processNode", data: { label: "Outlet" } },
  ], [onSelect]);

  const baseEdges = useMemo(() => {
    const chainColor = brightGreen;
    return [
      // Single connection from inlets to MFC
      { id: "e-inlets-mfc", source: "inlets", target: "mfc", color: green },
      { id: "e-mfc-preheat", source: "mfc", target: "preheaters", color: green },
      { id: "e-preheat-reactor", source: "preheaters", target: "reactor", color: green },
      { id: "e-reactor-condenser", source: "reactor", target: "condenser", color: chainColor },
      { id: "e-condenser-glc", source: "condenser", target: "glc", color: chainColor },
      { id: "e-glc-flowmeter", source: "glc", target: "flowmeter", color: chainColor },
      { id: "e-flowmeter-outlet", source: "flowmeter", target: "outlet", color: chainColor },
      { id: "e-reactor-pressure", source: "reactor", target: "pressure", dashed: true, color: green },
    ];
  }, []);

  const [nodes, setNodes] = useNodesState([]);
  const [edges, setEdges] = useEdgesState([]);

  useEffect(() => {
    const n = baseNodes.map((bn) => {
      const mappedMetric = NODE_DEFAULT_METRIC[bn.id];
      const nodeSelected = mappedMetric && selectedId === mappedMetric;
      return {
        ...bn,
        data: { ...bn.data, onSelect, aria: bn.data.label, isSelected: !!nodeSelected },
        style: { border: "none" },
        position: { x: 0, y: 0 },
      };
    });
    const e = baseEdges.map((be) => ({
      ...be,
      type: "default",
      style: { stroke: be.color, strokeWidth: be.color === brightGreen ? 3 : 2.5, strokeDasharray: be.dashed ? "8 8" : undefined },
      markerEnd: { type: MarkerType.ArrowClosed, color: be.color, width: 20, height: 20 },
      animated: false,
    }));
    setNodes(layoutWithDagre(n, e));
    setEdges(e);
  }, [baseNodes, baseEdges, selectedId, onSelect]);

  return (
    <div style={{ height: "calc(100vh - 80px)", width: "100%" }} aria-label="Process Flow vertical tree">
      <div style={{ color: "#cbd5e1", fontWeight: 700, fontSize: 16, margin: "0 0 2px 8px", letterSpacing: '0.025em' }}>DMR Process Flow</div>
      <div style={{ height: "calc(100% - 20px)", width: "100%" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.02, includeHiddenNodes: true }}
          minZoom={0.4}
          maxZoom={0.9}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          onInit={(instance) => {
            // Minimize top spacing and ensure compact fit
            setTimeout(() => instance.fitView({ padding: 0.02, includeHiddenNodes: true }), 0);
          }}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#1f2937" gap={24} />
          <Controls showZoom={false} showFitView={false} showInteractive={false} position="bottom-right" />
        </ReactFlow>
      </div>
    </div>
  );
}