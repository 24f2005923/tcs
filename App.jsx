import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup, 
  Polyline, 
  Polygon, 
  Circle,
  useMap 
} from 'react-leaflet';
import L from 'leaflet';
import { 
  AlertTriangle, 
  ShieldAlert, 
  Truck, 
  Ship, 
  Activity, 
  Radio, 
  CheckCircle2, 
  Clock, 
  Compass, 
  Cpu, 
  Layers, 
  RefreshCw, 
  RotateCcw, 
  Flame, 
  Users, 
  Sliders, 
  ChevronRight, 
  Plus, 
  Minus, 
  Sparkles, 
  Crosshair, 
  Check, 
  Zap, 
  Maximize2,
  Navigation,
  FileText,
  Boxes
} from 'lucide-react';

// -----------------------------------------------------------------------------
// LEAFLET CUSTOM TACTICAL ICONS (Using L.divIcon for crisp, infallible SVGs)
// -----------------------------------------------------------------------------

const createIncidentIcon = (category, isSelected) => {
  const color = category === 'CRITICAL' ? '#ef4444' : category === 'HIGH' ? '#f59e0b' : '#06b6d4';
  const pulseClass = category === 'CRITICAL' ? 'animate-ping' : '';
  const selectedBorder = isSelected ? 'border-2 border-white scale-125' : '';

  const html = `
    <div class="relative flex items-center justify-center w-8 h-8 ${selectedBorder} transition-all">
      <span class="absolute inline-flex h-full w-full rounded-full opacity-75 ${pulseClass}" style="background-color: ${color};"></span>
      <span class="relative inline-flex rounded-full h-6 w-6 items-center justify-center text-white text-xs font-bold shadow-lg" style="background-color: ${color};">
        ${category === 'CRITICAL' ? '!' : category === 'HIGH' ? '▲' : '●'}
      </span>
    </div>
  `;
  return L.divIcon({ html, className: 'custom-incident-pin', iconSize: [32, 32], iconAnchor: [16, 16] });
};

const createConvoyIcon = (convoy) => {
  const isSeveredTarget = convoy.rerouted;
  const bgColor = isSeveredTarget ? '#f59e0b' : convoy.type === 'BOAT' ? '#0284c7' : convoy.type === 'AMBULANCE' ? '#ef4444' : '#10b981';
  const iconEmoji = convoy.type === 'BOAT' ? '🚤' : convoy.type === 'AMBULANCE' ? '🚑' : convoy.type === 'HEAVY_CONVOY' ? '🚛' : '🚚';

  const html = `
    <div class="relative flex items-center justify-center w-10 h-10 transition-transform">
      <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-xl border border-slate-700 bg-slate-900/90 text-white" style="box-shadow: 0 0 10px ${bgColor};">
        ${iconEmoji}
      </div>
      <div class="absolute -bottom-3 bg-slate-950/90 border border-slate-700 text-[9px] px-1 rounded text-cyan-400 font-mono whitespace-nowrap">
        ${convoy.callsign.split(' - ')[0]}
      </div>
    </div>
  `;
  return L.divIcon({ html, className: 'custom-convoy-pin', iconSize: [40, 40], iconAnchor: [20, 20] });
};

const createGaugeIcon = (gauge) => {
  const isCritical = gauge.level >= gauge.critical_threshold;
  const isWarning = gauge.level >= gauge.warning_threshold;
  const badgeColor = isCritical ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-cyan-500';

  const html = `
    <div class="flex flex-col items-center">
      <div class="${badgeColor} text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded shadow border border-white/20 whitespace-nowrap">
        ${gauge.id}: ${gauge.level}m
      </div>
      <div class="w-2 h-2 rounded-full ${badgeColor} mt-0.5 animate-pulse"></div>
    </div>
  `;
  return L.divIcon({ html, className: 'custom-gauge-pin', iconSize: [60, 26], iconAnchor: [30, 26] });
};

const createNodeIcon = (node) => {
  const isBridge = node.type === 'BRIDGE';
  const isShelter = node.type === 'SHELTER';
  const isHospital = node.type === 'HOSPITAL';
  const color = isBridge ? '#f59e0b' : isShelter ? '#10b981' : isHospital ? '#ef4444' : '#64748b';
  const label = isShelter ? 'SHELTER' : isHospital ? 'MED' : isBridge ? 'BRIDGE' : 'NODE';

  const html = `
    <div class="flex flex-col items-center opacity-85 hover:opacity-100 transition-opacity">
      <div class="w-2.5 h-2.5 rounded-full border border-white" style="background-color: ${color};"></div>
      <div class="text-[8px] font-mono text-slate-400 bg-slate-950/80 px-1 rounded mt-0.5">${label}</div>
    </div>
  `;
  return L.divIcon({ html, className: 'custom-node-pin', iconSize: [30, 20], iconAnchor: [15, 5] });
};

// Map FlyTo Helper Component
function MapViewController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || 14, { duration: 1.2 });
    }
  }, [center, zoom, map]);
  return null;
}

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------

export default function App() {
  // WebSocket State
  const [wsConnected, setWsConnected] = useState(false);
  const [packetPulse, setPacketPulse] = useState(false);
  const wsRef = useRef(null);

  // Command Center Core State
  const [timelineTicker, setTimelineTicker] = useState('T+00:00:00 into Flood Warning Phase');
  const [operatorLoadPct, setOperatorLoadPct] = useState(42);
  const [roadSevered, setRoadSevered] = useState(false);
  const [surgeActive, setSurgeActive] = useState(false);
  const [warningBanner, setWarningBanner] = useState(null);

  // Tactical Data Collections
  const [incidents, setIncidents] = useState([]);
  const [convoys, setConvoys] = useState([]);
  const [gauges, setGauges] = useState([]);
  const [nodes, setNodes] = useState({});
  const [networkGeoJson, setNetworkGeoJson] = useState(null);
  const [inundationGeoJson, setInundationGeoJson] = useState(null);
  const [stats, setStats] = useState({ total_incidents: 3, critical_count: 1, high_count: 1, convoys_en_route: 4 });

  // UI State Controls
  const [activePersona, setActivePersona] = useState('Commander'); // 'Commander' | 'Field Agent' | 'Developer'
  const [activeFilter, setActiveFilter] = useState('All'); // 'All' | 'Sensor Verified' | 'Citizen SOS' | 'Evacuation Active'
  const [selectedIncidentId, setSelectedIncidentId] = useState('#INC-4091');
  const [rightPanelTab, setRightPanelTab] = useState('TRIAGE'); // 'TRIAGE' | 'OPERATOR DISPATCH' | 'EXPLAINABILITY' | 'RESOURCES'
  const [mapCenter, setMapCenter] = useState([13.0230, 80.2260]);
  const [mapZoom, setMapZoom] = useState(13);

  // Map API Key & Base Layer Configuration
  const DEFAULT_MAP_KEY = "1b710fb3b44b4b09bf8a5b6f82805341";
  const [mapApiKey, setMapApiKey] = useState(() => {
    return localStorage.getItem('ecc_map_api_key') || (import.meta.env.VITE_MAP_API_KEY || DEFAULT_MAP_KEY);
  });
  const [mapBaseLayer, setMapBaseLayer] = useState(() => {
    return localStorage.getItem('ecc_map_baselayer') || 'geoapify_dark';
  });
  const [tempApiKey, setTempApiKey] = useState(mapApiKey);
  const [showKeyInput, setShowKeyInput] = useState(false);

  // Map Layers Toggle HUD
  const [layersHUD, setLayersHUD] = useState({
    incidents: true,
    responders: true,
    clusters: true,
    inundation: true,
    blockedRoads: true,
    activeRoutes: true
  });

  // Human-in-the-Loop Triage Allocations
  const [allocations, setAllocations] = useState({ boats: 2, ambulances: 1, rations: 50 });
  const [verificationChecklist, setVerificationChecklist] = useState({
    cluster_verified: true,
    gauge_correlated: true,
    structural_check: false,
    hazmat_cleared: false
  });

  // Flash packet pulse badge
  const triggerPacketPulse = () => {
    setPacketPulse(true);
    setTimeout(() => setPacketPulse(false), 300);
  };

  // ---------------------------------------------------------------------------
  // WEBSOCKET REAL-TIME CONNECTION ENGINE
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let reconnectTimeout = null;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname || '127.0.0.1';
    const wsUrl = `${protocol}//${host}:8000/ws`;

    function connect() {
      console.log(`[ECC WebSocket] Connecting to ${wsUrl}...`);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[ECC WebSocket] Connected successfully.');
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        triggerPacketPulse();
        try {
          const payload = JSON.parse(event.data);
          const { event: evtType, data } = payload;

          if (evtType === 'INITIAL_STATE' || evtType === 'FULL_RESET') {
            setTimelineTicker(data.timeline_ticker || 'T+00:00:00');
            setOperatorLoadPct(data.operator_load_pct || 40);
            setRoadSevered(data.road_severed || false);
            setSurgeActive(data.surge_active || false);
            setIncidents(data.incidents || []);
            setConvoys(data.convoys || []);
            setGauges(data.gauges || []);
            setNodes(data.nodes || {});
            setNetworkGeoJson(data.network_geojson);
            setInundationGeoJson(data.inundation_geojson);
            if (data.stats) setStats(data.stats);
            if (evtType === 'FULL_RESET') setWarningBanner(null);
          } 
          else if (evtType === 'TICK') {
            setTimelineTicker(data.timeline_ticker);
            setOperatorLoadPct(data.operator_load_pct);
            setConvoys(data.convoys);
            if (data.stats) setStats(data.stats);
          } 
          else if (evtType === 'GAUGE_UPDATE') {
            setGauges(data.gauges);
          } 
          else if (evtType === 'INCIDENT_UPDATE') {
            setIncidents(data.incidents);
            setOperatorLoadPct(data.operator_load_pct);
          } 
          else if (evtType === 'ROAD_SUBMERGED') {
            setRoadSevered(true);
            setNetworkGeoJson(data.network_geojson);
            setConvoys(data.convoys);
            setOperatorLoadPct(data.operator_load_pct);
            setWarningBanner(
              "Convoy #3 land artery severed! Saidapet Maraimalai Adigal Bridge submerged by Adyar River surge! Re-routing via Kathipara Elevated Bypass (+14 mins ETA). Amphibious craft requested for final 300m in Velachery."
            );
          } 
          else if (evtType === 'SURGE_TRIGGERED') {
            setSurgeActive(true);
            setGauges(data.gauges);
            setInundationGeoJson(data.inundation_geojson);
            setOperatorLoadPct(data.operator_load_pct);
          } 
          else if (evtType === 'DISPATCH_CONFIRMED') {
            setIncidents(data.incidents);
            setConvoys(data.convoys);
            setOperatorLoadPct(data.operator_load_pct);
          }
        } catch (err) {
          console.error('[ECC WebSocket Message Parse Error]', err);
        }
      };

      ws.onclose = () => {
        console.warn('[ECC WebSocket] Disconnected. Reconnecting in 2.5s...');
        setWsConnected(false);
        reconnectTimeout = setTimeout(connect, 2500);
      };

      ws.onerror = (err) => {
        console.error('[ECC WebSocket Error]', err);
        ws.close();
      };
    }

    connect();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  // Dispatch Action via WebSocket
  const sendWsAction = (eventType, payload = {}) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event: eventType, payload }));
    } else {
      console.warn('[ECC WebSocket] Cannot send action, socket not open.');
    }
  };

  // Selected Incident Object
  const selectedIncident = useMemo(() => {
    return incidents.find(i => i.id === selectedIncidentId) || incidents[0] || null;
  }, [incidents, selectedIncidentId]);

  // Sync allocations when incident selection changes
  useEffect(() => {
    if (selectedIncident && selectedIncident.allocated_resources) {
      setAllocations(selectedIncident.allocated_resources);
    }
    if (selectedIncident && selectedIncident.verification_checklist) {
      setVerificationChecklist(selectedIncident.verification_checklist);
    }
  }, [selectedIncidentId]);

  // Filtered Incidents List
  const filteredIncidents = useMemo(() => {
    return incidents.filter(inc => {
      if (activeFilter === 'Sensor Verified') return inc.bayesian_confidence >= 80;
      if (activeFilter === 'Citizen SOS') return inc.type === 'CITIZEN_SOS';
      if (activeFilter === 'Evacuation Active') return inc.dispatch_status === 'DISPATCHED_ACTIVE';
      return true;
    });
  }, [incidents, activeFilter]);

  // Trigger Road Severance (Jury Challenge)
  const handleTriggerRoadSeverance = () => {
    sendWsAction('ROAD_SEVERANCE');
  };

  // Simulate Flood Surge
  const handleSimulateSurge = () => {
    sendWsAction('SIMULATE_SURGE');
  };

  // Reset View & Graph
  const handleReset = () => {
    sendWsAction('RESET_VIEW');
  };

  // Inject SOS Distress Signal
  const handleInjectSOS = () => {
    sendWsAction('INJECT_SOS', {
      lat: 13.0185 + (Math.random() - 0.5) * 0.003,
      lon: 80.2220 + (Math.random() - 0.5) * 0.003,
      text: "Distress SOS (Saidapet/Kotturpuram): Adyar flood surge entering homes, immediate evacuation craft requested!"
    });
  };

  // Clear All Incidents
  const handleClearIncidents = () => {
    sendWsAction('CLEAR_INCIDENTS');
  };

  // Operator Human-in-the-Loop Dispatch Approval
  const handleApproveDispatch = () => {
    if (!selectedIncident) return;
    sendWsAction('APPROVE_DISPATCH', {
      incident_id: selectedIncident.id,
      allocations: allocations
    });
  };

  // Center Map on Incident Card Click
  const handleSelectIncident = (inc) => {
    setSelectedIncidentId(inc.id);
    setMapCenter(inc.pos);
    setMapZoom(14);
  };

  // ---------------------------------------------------------------------------
  // RENDER INTERFACE
  // ---------------------------------------------------------------------------
  return (
    <div className="flex flex-col h-screen w-screen bg-[#070b12] text-slate-100 font-sans overflow-hidden select-none">
      
      {/* ---------------------------------------------------------------------
          TOP HEADER BAR
      --------------------------------------------------------------------- */}
      <header className="h-14 bg-[#0a0f1d] border-b border-slate-800 flex items-center justify-between px-4 z-30 shadow-md">
        
        {/* Title & Live Pulse Indicator */}
        <div className="flex items-center space-x-3">
          <div className="relative flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-cyan-400" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${wsConnected ? 'bg-emerald-400' : 'bg-red-400'} opacity-75`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${wsConnected ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
            </span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-base font-extrabold tracking-wider bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent font-mono">
                ECC: CHENNAI EMERGENCY COMMAND CENTER
              </span>
              {/* Pulsing Live Badge */}
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all duration-300 ${
                packetPulse 
                  ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-[0_0_10px_#10b981]' 
                  : 'bg-emerald-950/80 text-emerald-400 border-emerald-700/50'
              }`}>
                ● LIVE / REALTIME
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono tracking-tight">
              AI Disaster Intelligence & Autonomous Relief Coordination (Greater Chennai Corporation)
            </p>
          </div>
        </div>

        {/* Global Timeline Status Ticker */}
        <div className="hidden lg:flex items-center space-x-2 bg-slate-900/90 border border-slate-800 px-3 py-1 rounded-md text-xs font-mono">
          <Clock className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '8s' }} />
          <span className="text-cyan-300 font-semibold">{timelineTicker}</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">
            {surgeActive ? 'SURGE STATUS: CRITICAL SPIKE' : 'SURGE STATUS: MONITORED'}
          </span>
        </div>

        {/* Persona Selector Tabs */}
        <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
          {['Commander', 'Field Agent', 'Developer'].map((persona) => (
            <button
              key={persona}
              onClick={() => setActivePersona(persona)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                activePersona === persona
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {persona}
            </button>
          ))}
        </div>

        {/* Header Live Metric Counters */}
        <div className="flex items-center space-x-3 text-xs font-mono">
          <div className="flex items-center space-x-1.5 bg-slate-900/80 px-2.5 py-1 rounded border border-slate-800">
            <span className="text-slate-400">INCIDENTS:</span>
            <span className="font-bold text-cyan-400">{stats.total_incidents}</span>
          </div>

          <div className="flex items-center space-x-1.5 bg-red-950/40 px-2.5 py-1 rounded border border-red-900/60">
            <span className="text-red-400">CRITICAL:</span>
            <span className="font-bold text-red-400 animate-pulse">{stats.critical_count}</span>
          </div>

          {/* Operator Load Bar */}
          <div className="flex items-center space-x-2 bg-slate-900/80 px-2.5 py-1 rounded border border-slate-800">
            <span className="text-slate-400">OPERATOR LOAD:</span>
            <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  operatorLoadPct > 75 ? 'bg-red-500' : operatorLoadPct > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${operatorLoadPct}%` }}
              ></div>
            </div>
            <span className={`font-bold ${
              operatorLoadPct > 75 ? 'text-red-400' : operatorLoadPct > 50 ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {operatorLoadPct}%
            </span>
          </div>
        </div>

      </header>

      {/* ---------------------------------------------------------------------
          DEMO TOOLBAR (Interactive Simulation Loop & Jury Challenge)
      --------------------------------------------------------------------- */}
      <div className="h-10 bg-[#0d1322] border-b border-slate-800 flex items-center justify-between px-4 z-20">
        
        {/* Filter Pills */}
        <div className="flex items-center space-x-1.5">
          <span className="text-[11px] font-mono text-slate-400 mr-1">FILTER:</span>
          {['All', 'Sensor Verified', 'Citizen SOS', 'Evacuation Active'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`px-2.5 py-0.5 text-xs rounded transition-all font-medium ${
                activeFilter === tab
                  ? 'bg-slate-700 text-cyan-300 border border-cyan-500/40'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-300 border border-slate-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Demo Execution Buttons */}
        <div className="flex items-center space-x-2">
          
          {/* Simulate Flood Surge */}
          <button
            onClick={handleSimulateSurge}
            className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-semibold bg-sky-950/80 hover:bg-sky-900 text-sky-300 border border-sky-800/60 rounded transition-all active:scale-95 shadow-sm"
          >
            <Flame className="w-3.5 h-3.5 text-sky-400" />
            <span>Simulate Flood Surge</span>
          </button>

          {/* Inject Citizen SOS Ping */}
          <button
            onClick={handleInjectSOS}
            className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-semibold bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-800/60 rounded transition-all active:scale-95"
          >
            <Zap className="w-3.5 h-3.5 text-purple-400" />
            <span>Inject Citizen SOS</span>
          </button>

          {/* JURY CHALLENGE: TRIGGER ROAD SEVERANCE */}
          <button
            onClick={handleTriggerRoadSeverance}
            className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-bold rounded border transition-all active:scale-95 shadow-lg ${
              roadSevered
                ? 'bg-red-950 text-red-300 border-red-700/80 cursor-not-allowed opacity-80'
                : 'bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white border-red-400 animate-pulse'
            }`}
            disabled={roadSevered}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-white" />
            <span>Trigger Road Severance (Jury Challenge)</span>
          </button>

          {/* Reset View & Routes */}
          <button
            onClick={handleReset}
            className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded transition-all active:scale-95"
            title="Reset Graph, Bridge, and Convoys"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset View</span>
          </button>

          {/* Clear Incidents */}
          <button
            onClick={handleClearIncidents}
            className="flex items-center space-x-1.5 px-2 py-1 text-xs text-slate-400 hover:text-slate-200 border border-slate-800 rounded transition-all active:scale-95"
            title="Clear all active incidents"
          >
            <span>Clear</span>
          </button>
        </div>

      </div>

      {/* ---------------------------------------------------------------------
          THREE-PANEL COMMAND DASHBOARD
      --------------------------------------------------------------------- */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* ===================================================================
            LEFT PANEL: LIVE INCIDENT QUEUE
        =================================================================== */}
        <aside className="w-80 md:w-96 bg-[#0a0f1d] border-r border-slate-800 flex flex-col z-10 shrink-0">
          
          {/* Left Panel Header */}
          <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
            <div className="flex items-center space-x-2">
              <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span className="text-xs font-bold font-mono tracking-wider text-slate-200">
                LIVE INCIDENT QUEUE
              </span>
            </div>
            <span className="text-[10px] font-mono bg-cyan-950 text-cyan-400 border border-cyan-800/60 px-1.5 py-0.5 rounded">
              {filteredIncidents.length} STREAMING
            </span>
          </div>

          {/* Scrollable Incident Cards List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {filteredIncidents.length === 0 ? (
              <div className="text-center py-12 text-slate-500 font-mono text-xs">
                No active incidents in this filter category.
              </div>
            ) : (
              filteredIncidents.map((inc) => {
                const isSelected = inc.id === selectedIncidentId;
                const isCritical = inc.category === 'CRITICAL';
                const isHigh = inc.category === 'HIGH';

                return (
                  <div
                    key={inc.id}
                    onClick={() => handleSelectIncident(inc)}
                    className={`p-3 rounded-lg border transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-slate-800/90 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                        : 'bg-slate-900/70 hover:bg-slate-800/60 border-slate-800'
                    }`}
                  >
                    {/* Header Row: ID, Category Badge, Elapsed Time */}
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-bold font-mono text-cyan-300">
                          {inc.id}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded font-mono ${
                          isCritical 
                            ? 'bg-red-500/20 text-red-400 border border-red-500/40' 
                            : isHigh 
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' 
                            : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                        }`}>
                          {inc.category}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{inc.time_elapsed}</span>
                      </span>
                    </div>

                    {/* Title */}
                    <h4 className="text-xs font-semibold text-slate-200 line-clamp-1 mb-1">
                      {inc.title}
                    </h4>

                    {/* Sector & trapped civilians count */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
                      <span>{inc.sector}</span>
                      <span className="text-slate-300 font-mono">
                        ~{inc.civilians_trapped} Civilians
                      </span>
                    </div>

                    {/* Spatio-Temporal Clustering & Bayesian Verification Score Meter */}
                    <div className="bg-slate-950/70 p-2 rounded border border-slate-800/80 mb-2">
                      <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                        <span className="text-slate-400 flex items-center space-x-1">
                          <Users className="w-3 h-3 text-cyan-400" />
                          <span>Cluster: {inc.cluster_count} calls ({inc.cluster_radius_m}m)</span>
                        </span>
                        <span className={`font-bold ${
                          inc.bayesian_confidence >= 85 ? 'text-emerald-400' : inc.bayesian_confidence >= 60 ? 'text-amber-400' : 'text-slate-400'
                        }`}>
                          Bayesian: {inc.bayesian_confidence}%
                        </span>
                      </div>

                      {/* Progress Bar (Watch 35% -> 72% -> 94%) */}
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-700 ${
                            inc.bayesian_confidence >= 85 ? 'bg-gradient-to-r from-emerald-500 to-cyan-400' :
                            inc.bayesian_confidence >= 60 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' :
                            'bg-slate-500'
                          }`}
                          style={{ width: `${inc.bayesian_confidence}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Dispatch Status Pill */}
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className={`px-2 py-0.5 rounded ${
                        inc.dispatch_status === 'DISPATCHED_ACTIVE'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-amber-950/70 text-amber-300 border border-amber-800/60 animate-pulse'
                      }`}>
                        {inc.dispatch_status === 'DISPATCHED_ACTIVE' ? 'DISPATCHED ACTIVE' : 'PENDING OPERATOR LOCK'}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                    </div>

                  </div>
                );
              })
            )}
          </div>

          {/* River Gauge Quick HUD Mini-Dock */}
          <div className="p-2.5 bg-slate-950 border-t border-slate-800">
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Telemetry River Gauges</span>
              <span className="text-cyan-400 font-bold">1.5m Alert Limit</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {gauges.map(g => (
                <div 
                  key={g.id} 
                  className={`p-1.5 rounded border text-center font-mono ${
                    g.level >= g.critical_threshold 
                      ? 'bg-red-950/80 border-red-800 text-red-300 animate-pulse' 
                      : g.level >= g.warning_threshold
                      ? 'bg-amber-950/70 border-amber-800 text-amber-300'
                      : 'bg-slate-900 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="text-[9px] text-slate-400 truncate">{g.id}</div>
                  <div className="text-xs font-bold">{g.level}m</div>
                  <div className="text-[8px] text-slate-500">{g.trend}</div>
                </div>
              ))}
            </div>
          </div>

        </aside>

        {/* ===================================================================
            CENTER PANEL: LIVE TACTICAL LEAFLET MAP & HUD
        =================================================================== */}
        <main className="flex-1 relative flex flex-col bg-[#070e17]">
          
          {/* Flashing Amber Warning Banner for Road Severance */}
          {warningBanner && (
            <div className="absolute top-3 left-4 right-4 z-[500] bg-gradient-to-r from-amber-600 via-amber-700 to-rose-700 text-white p-3 rounded-lg shadow-2xl border-2 border-amber-400 flex items-center justify-between animate-bounce">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-6 h-6 text-yellow-200 shrink-0" />
                <div>
                  <div className="font-extrabold text-sm tracking-wide">
                    CRITICAL LAND ARTERY SEVERED (JURY CHALLENGE)
                  </div>
                  <div className="text-xs text-amber-100 font-mono">
                    {warningBanner}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setWarningBanner(null)}
                className="bg-amber-950/80 hover:bg-amber-900 text-amber-200 px-2 py-1 rounded text-xs font-mono border border-amber-600"
              >
                DISMISS
              </button>
            </div>
          )}

          {/* Floating Layers HUD Switcher Box */}
          <div className="absolute top-4 right-4 z-[400] bg-slate-950/90 border border-slate-800 p-2.5 rounded-lg shadow-xl text-xs font-mono backdrop-blur-md max-w-xs">
            <div className="flex items-center space-x-1.5 text-cyan-400 font-bold mb-2 pb-1 border-b border-slate-800">
              <Layers className="w-3.5 h-3.5" />
              <span>TACTICAL LAYERS</span>
            </div>
            <div className="space-y-1.5">
              {Object.keys(layersHUD).map((layerKey) => (
                <label key={layerKey} className="flex items-center justify-between space-x-3 cursor-pointer text-slate-300 hover:text-white">
                  <span className="capitalize">{layerKey.replace(/([A-Z])/g, ' $1')}</span>
                  <input
                    type="checkbox"
                    checked={layersHUD[layerKey]}
                    onChange={(e) => setLayersHUD({ ...layersHUD, [layerKey]: e.target.checked })}
                    className="accent-cyan-500 rounded cursor-pointer"
                  />
                </label>
              ))}
            </div>

            {/* Base Map Selector & Map API Key Input */}
            <div className="mt-2.5 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between text-slate-400 font-bold text-[10px] mb-1.5">
                <span>MAP PROVIDER (KEY ACTIVE)</span>
                <button
                  onClick={() => setShowKeyInput(!showKeyInput)}
                  className="text-[9px] text-cyan-400 hover:text-cyan-300 underline font-mono"
                >
                  {showKeyInput ? 'Hide Key' : '🔑 API Key'}
                </button>
              </div>

              {showKeyInput && (
                <div className="mb-2 p-1.5 bg-slate-900 border border-slate-800 rounded">
                  <div className="text-[9px] text-slate-400 mb-1">Active Map API Key:</div>
                  <input
                    type="text"
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 px-1.5 py-0.5 rounded text-[10px] text-white font-mono mb-1 select-all"
                  />
                  <button
                    onClick={() => {
                      setMapApiKey(tempApiKey);
                      localStorage.setItem('ecc_map_api_key', tempApiKey);
                      setShowKeyInput(false);
                    }}
                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold py-0.5 rounded text-[9px]"
                  >
                    Save Key
                  </button>
                </div>
              )}

              <select
                value={mapBaseLayer}
                onChange={(e) => {
                  setMapBaseLayer(e.target.value);
                  localStorage.setItem('ecc_map_baselayer', e.target.value);
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-[10px] text-slate-200 font-mono cursor-pointer"
              >
                <option value="geoapify_dark">★ Geoapify Tactical Dark (Key Active)</option>
                <option value="geoapify_osm">Geoapify OSM Bright (Key Active)</option>
                <option value="google_hybrid">Google Hybrid (Satellite + Roads)</option>
                <option value="google_roadmap">Google Maps (Roadmap)</option>
                <option value="google_terrain">Google Maps (Terrain)</option>
                <option value="cartodb_dark">CartoDB Dark Matter</option>
              </select>
            </div>
          </div>

          {/* Persona View Indicator Bar */}
          <div className="absolute bottom-4 left-4 z-[400] bg-slate-950/85 border border-slate-800 px-3 py-1.5 rounded-lg shadow-lg text-[11px] font-mono text-slate-300 flex items-center space-x-2 backdrop-blur-md">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>Active Perspective: <strong className="text-cyan-400">{activePersona.toUpperCase()}</strong></span>
            <span className="text-slate-600">|</span>
            <span className="text-emerald-400">Dijkstra Routing: ACTIVE</span>
          </div>

          {/* Leaflet Tactical Map Canvas */}
          <div className="relative flex-1 w-full h-full min-h-0">
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              className="w-full h-full"
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              zoomControl={false}
            >
              <MapViewController center={mapCenter} zoom={mapZoom} />

              {/* Dynamic Base Tile Layer */}
              {mapBaseLayer === 'geoapify_dark' ? (
                <TileLayer
                  key={`geoapify-dark-${mapApiKey}`}
                  url={`https://maps.geoapify.com/v1/tile/dark-matter-purple-roads/{z}/{x}/{y}.png?apiKey=${mapApiKey}`}
                  attribution='&copy; <a href="https://www.geoapify.com/">Geoapify</a>'
                  maxZoom={20}
                />
              ) : mapBaseLayer === 'geoapify_osm' ? (
                <TileLayer
                  key={`geoapify-osm-${mapApiKey}`}
                  url={`https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${mapApiKey}`}
                  attribution='&copy; <a href="https://www.geoapify.com/">Geoapify</a>'
                  maxZoom={20}
                />
              ) : mapBaseLayer === 'google_hybrid' ? (
                <TileLayer
                  key={`google-hybrid-${mapApiKey}`}
                  url={`https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}${mapApiKey ? `&key=${mapApiKey}` : ''}`}
                  attribution='&copy; Google Maps'
                  maxZoom={20}
                />
              ) : mapBaseLayer === 'google_roadmap' ? (
                <TileLayer
                  key={`google-roadmap-${mapApiKey}`}
                  url={`https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}${mapApiKey ? `&key=${mapApiKey}` : ''}`}
                  attribution='&copy; Google Maps'
                  maxZoom={20}
                />
              ) : mapBaseLayer === 'google_terrain' ? (
                <TileLayer
                  key={`google-terrain-${mapApiKey}`}
                  url={`https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}${mapApiKey ? `&key=${mapApiKey}` : ''}`}
                  attribution='&copy; Google Maps'
                  maxZoom={20}
                />
              ) : (
                <TileLayer
                  key="cartodb-dark"
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                />
              )}

              {/* 1. Inundation Zones (Flood Polygons) */}
              {layersHUD.inundation && inundationGeoJson && inundationGeoJson.features.map((feat, idx) => {
                const isSurge = feat.properties.surge_active;
                const polygonCoords = feat.geometry.coordinates[0].map(coord => [coord[1], coord[0]]);
                return (
                  <Polygon
                    key={`flood-${idx}`}
                    positions={polygonCoords}
                    pathOptions={{
                      color: isSurge ? '#ef4444' : '#0284c7',
                      fillColor: isSurge ? '#ef4444' : '#0369a1',
                      fillOpacity: isSurge ? 0.45 : 0.25,
                      weight: isSurge ? 2 : 1,
                      dashArray: isSurge ? '4, 4' : null
                    }}
                  >
                    <Popup className="tactical-popup">
                      <div className="font-mono text-xs p-1">
                        <strong className="text-cyan-400">{feat.properties.name}</strong>
                        <p className="text-slate-300">Severity: {feat.properties.severity}</p>
                        <p className="text-slate-300">Avg Water Depth: {feat.properties.depth_m}m</p>
                      </div>
                    </Popup>
                  </Polygon>
                );
              })}

              {/* 2. Tactical Road Network Edges */}
              {layersHUD.activeRoutes && networkGeoJson && networkGeoJson.features.map((edge, idx) => {
                const isSubmerged = edge.properties.status === 'SUBMERGED';
                const isBridge = edge.properties.is_bridge;
                const coords = edge.geometry.coordinates.map(c => [c[1], c[0]]);

                if (isSubmerged && !layersHUD.blockedRoads) return null;

                return (
                  <Polyline
                    key={`edge-${idx}`}
                    positions={coords}
                    pathOptions={{
                      color: isSubmerged ? '#ef4444' : isBridge ? '#f59e0b' : '#334155',
                      weight: isSubmerged ? 4 : isBridge ? 3 : 2,
                      dashArray: isSubmerged ? '6, 6' : null,
                      opacity: isSubmerged ? 0.9 : 0.65
                    }}
                  >
                    <Popup className="tactical-popup">
                      <div className="font-mono text-xs p-1">
                        <p className="font-bold text-white">{edge.properties.road_name}</p>
                        <p className="text-slate-400">Status: <span className={isSubmerged ? 'text-red-400' : 'text-emerald-400'}>{edge.properties.status}</span></p>
                        <p className="text-slate-400">Weight: {edge.properties.weight} mins</p>
                      </div>
                    </Popup>
                  </Polyline>
                );
              })}

              {/* 3. Convoy Polylines & Moving Markers */}
              {layersHUD.responders && convoys.map((conv) => {
                return (
                  <React.Fragment key={conv.id}>
                    {conv.polyline && conv.polyline.length > 0 && (
                      <Polyline
                        positions={conv.polyline}
                        pathOptions={{
                          color: conv.rerouted ? '#f59e0b' : '#06b6d4',
                          weight: 3,
                          dashArray: conv.rerouted ? '4, 4' : null,
                          opacity: 0.85
                        }}
                      />
                    )}
                    <Marker
                      position={conv.pos}
                      icon={createConvoyIcon(conv)}
                    >
                      <Popup className="tactical-popup">
                        <div className="font-mono text-xs p-1">
                          <strong className="text-cyan-400">{conv.callsign}</strong>
                          <p className="text-slate-300">Status: <span className="text-emerald-400">{conv.status}</span></p>
                          <p className="text-slate-300">ETA: {conv.eta_minutes} mins</p>
                          {conv.warning_msg && (
                            <p className="text-amber-400 text-[10px] mt-1 border-t border-slate-700 pt-1">
                              {conv.warning_msg}
                            </p>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  </React.Fragment>
                );
              })}

              {/* 4. Incident Pins & Spatio-Temporal Cluster Rings */}
              {layersHUD.incidents && incidents.map((inc) => {
                const isSelected = inc.id === selectedIncidentId;
                return (
                  <React.Fragment key={inc.id}>
                    {layersHUD.clusters && (
                      <Circle
                        center={inc.pos}
                        radius={inc.cluster_radius_m || 200}
                        pathOptions={{
                          color: inc.category === 'CRITICAL' ? '#ef4444' : '#06b6d4',
                          fillColor: inc.category === 'CRITICAL' ? '#ef4444' : '#06b6d4',
                          fillOpacity: 0.12,
                          weight: 1,
                          dashArray: '3, 3'
                        }}
                      />
                    )}
                    <Marker
                      position={inc.pos}
                      icon={createIncidentIcon(inc.category, isSelected)}
                      eventHandlers={{
                        click: () => handleSelectIncident(inc)
                      }}
                    >
                      <Popup className="tactical-popup">
                        <div className="font-mono text-xs p-1">
                          <div className="font-bold text-cyan-400">{inc.id} - {inc.category}</div>
                          <p className="text-slate-200 mt-1">{inc.title}</p>
                          <p className="text-slate-400 mt-1">Bayesian Verified: <strong>{inc.bayesian_confidence}%</strong></p>
                          <p className="text-slate-400">Trapped: ~{inc.civilians_trapped} people</p>
                        </div>
                      </Popup>
                    </Marker>
                  </React.Fragment>
                );
              })}

              {/* 5. River Gauge Telemetry Pins */}
              {gauges.map((gauge) => (
                <Marker
                  key={gauge.id}
                  position={gauge.pos}
                  icon={createGaugeIcon(gauge)}
                >
                  <Popup className="tactical-popup">
                    <div className="font-mono text-xs p-1">
                      <strong className="text-cyan-400">{gauge.name} ({gauge.id})</strong>
                      <p className="text-slate-300">Level: <span className="font-bold text-white">{gauge.level}m</span></p>
                      <p className="text-slate-400">Flow: {gauge.flow_rate_cms} m³/s ({gauge.trend})</p>
                      <p className="text-slate-400">Warning Threshold: {gauge.warning_threshold}m</p>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* 6. Static Strategic Nodes */}
              {Object.keys(nodes).map((nodeKey) => {
                const node = nodes[nodeKey];
                return (
                  <Marker
                    key={nodeKey}
                    position={node.pos}
                    icon={createNodeIcon(node)}
                  >
                    <Popup className="tactical-popup">
                      <div className="font-mono text-xs p-1">
                        <strong className="text-slate-200">{node.name}</strong>
                        <p className="text-slate-400">Type: {node.type}</p>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

            </MapContainer>
          </div>

        </main>

        {/* ===================================================================
            RIGHT PANEL: HUMAN-IN-THE-LOOP TRIAGE HUB
        =================================================================== */}
        <aside className="w-84 md:w-96 bg-[#0a0f1d] border-l border-slate-800 flex flex-col z-10 shrink-0">
          
          {/* Right Panel Tabs */}
          <div className="flex border-b border-slate-800 bg-slate-900/60 p-1">
            {[
              { id: 'TRIAGE', label: 'TRIAGE' },
              { id: 'OPERATOR DISPATCH', label: 'DISPATCH' },
              { id: 'EXPLAINABILITY', label: 'EXPLAIN' },
              { id: 'RESOURCES', label: 'RESOURCES' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setRightPanelTab(tab.id)}
                className={`flex-1 py-1.5 text-xs font-mono font-bold rounded transition-all text-center ${
                  rightPanelTab === tab.id
                    ? 'bg-slate-800 text-cyan-400 border border-cyan-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Human-in-the-Loop Triage */}
          {rightPanelTab === 'TRIAGE' && selectedIncident && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              {/* Incident Header */}
              <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono font-bold text-cyan-400">
                    {selectedIncident.id}
                  </span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded font-mono ${
                    selectedIncident.category === 'CRITICAL' 
                      ? 'bg-red-500/20 text-red-400 border border-red-500/40' 
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  }`}>
                    {selectedIncident.category}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-100 mb-1">
                  {selectedIncident.title}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  {selectedIncident.sector} • GPS: [{selectedIncident.pos[0]}, {selectedIncident.pos[1]}]
                </p>
              </div>

              {/* RECOMMENDED AI ACTION BOX */}
              <div className="bg-gradient-to-br from-cyan-950/40 via-slate-900 to-indigo-950/30 border border-cyan-500/40 p-3 rounded-lg shadow-md">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-cyan-300 font-mono mb-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
                  <span>RECOMMENDED AI ACTION</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {selectedIncident.ai_recommendation}
                </p>
                <div className="mt-2 pt-2 border-t border-slate-800 text-[10px] font-mono text-cyan-400/90 flex items-center justify-between">
                  <span>Confidence: {selectedIncident.bayesian_confidence}%</span>
                  <span>Clustered Pings: {selectedIncident.cluster_count}</span>
                </div>
              </div>

              {/* MISSING FIELDS / REQUIRED VERIFICATION CHECKLIST */}
              <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-lg">
                <div className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Missing Fields / Required Verification
                </div>
                <div className="space-y-2 text-xs font-mono">
                  {[
                    { key: 'cluster_verified', label: 'Spatio-temporal cluster verified (>70% confidence)' },
                    { key: 'gauge_correlated', label: 'River gauge RG-02 flood risk correlated' },
                    { key: 'structural_check', label: 'Structural integrity check for evacuation path' },
                    { key: 'hazmat_cleared', label: 'Hazmat / power line subversion risk cleared' }
                  ].map(item => (
                    <label key={item.key} className="flex items-center space-x-2 text-slate-300 cursor-pointer hover:text-white">
                      <input
                        type="checkbox"
                        checked={verificationChecklist[item.key] || false}
                        onChange={(e) => setVerificationChecklist({
                          ...verificationChecklist,
                          [item.key]: e.target.checked
                        })}
                        className="accent-cyan-500 rounded cursor-pointer"
                      />
                      <span className={verificationChecklist[item.key] ? 'line-through text-slate-500' : ''}>
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* RESOURCE ALLOCATION STEPPERS */}
              <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-lg">
                <div className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-2.5">
                  Tactical Asset Allocation
                </div>
                
                {/* Boats Stepper */}
                <div className="flex items-center justify-between py-1.5 border-b border-slate-800 text-xs font-mono">
                  <span className="flex items-center space-x-1.5 text-slate-300">
                    <Ship className="w-4 h-4 text-cyan-400" />
                    <span>Amphibious Boats</span>
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setAllocations(a => ({ ...a, boats: Math.max(0, a.boats - 1) }))}
                      className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center font-bold text-cyan-300">{allocations.boats}</span>
                    <button
                      onClick={() => setAllocations(a => ({ ...a, boats: a.boats + 1 }))}
                      className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Ambulances Stepper */}
                <div className="flex items-center justify-between py-1.5 border-b border-slate-800 text-xs font-mono">
                  <span className="flex items-center space-x-1.5 text-slate-300">
                    <Truck className="w-4 h-4 text-rose-400" />
                    <span>High-Water Ambulances</span>
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setAllocations(a => ({ ...a, ambulances: Math.max(0, a.ambulances - 1) }))}
                      className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center font-bold text-rose-300">{allocations.ambulances}</span>
                    <button
                      onClick={() => setAllocations(a => ({ ...a, ambulances: a.ambulances + 1 }))}
                      className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Rations Stepper */}
                <div className="flex items-center justify-between py-1.5 text-xs font-mono">
                  <span className="flex items-center space-x-1.5 text-slate-300">
                    <Boxes className="w-4 h-4 text-amber-400" />
                    <span>Rations (Kits)</span>
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setAllocations(a => ({ ...a, rations: Math.max(0, a.rations - 10) }))}
                      className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center font-bold text-amber-300">{allocations.rations}</span>
                    <button
                      onClick={() => setAllocations(a => ({ ...a, rations: a.rations + 10 }))}
                      className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

              </div>

              {/* ACTION: APPROVE DISPATCH PLAN & LOCK ROUTE BUTTON */}
              <button
                onClick={handleApproveDispatch}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-extrabold text-xs tracking-wider rounded-lg shadow-lg flex items-center justify-center space-x-2 transition-all active:scale-98 font-mono border border-emerald-400"
              >
                <CheckCircle2 className="w-4 h-4 text-slate-950" />
                <span>APPROVE DISPATCH PLAN & LOCK ROUTE</span>
              </button>

              {/* Merged Citizen Pings Log */}
              <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-lg">
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">
                  Ingested Signal Audit Trail ({selectedIncident.pings.length} Pings)
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {selectedIncident.pings.map((p, idx) => (
                    <div key={idx} className="text-[11px] font-mono border-l-2 border-cyan-500 pl-2 py-0.5">
                      <div className="text-[9px] text-cyan-400 flex items-center justify-between">
                        <span>{p.source}</span>
                        <span>{p.time}</span>
                      </div>
                      <p className="text-slate-300">{p.text}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* Tab 2: Operator Dispatch Tracking */}
          {rightPanelTab === 'OPERATOR DISPATCH' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
              <div className="text-slate-300 font-bold mb-2 flex items-center justify-between">
                <span>ACTIVE FLEET TELEMETRY</span>
                <span className="text-cyan-400">{convoys.length} UNITS</span>
              </div>
              {convoys.map(conv => (
                <div key={conv.id} className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-lg space-y-1">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-cyan-300">{conv.callsign}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      conv.rerouted ? 'bg-amber-950 text-amber-300 border border-amber-700' : 'bg-emerald-950 text-emerald-300'
                    }`}>
                      {conv.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>ETA: {conv.eta_minutes} mins</span>
                    <span>Route Progress: {conv.step_idx}/{conv.polyline?.length || 0}</span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Target: {conv.target} • Assigned: {conv.assigned_incident_id || 'PATROL'}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab 3: Bayesian & Dijkstra Explainability */}
          {rightPanelTab === 'EXPLAINABILITY' && selectedIncident && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
              <div className="text-cyan-400 font-bold flex items-center space-x-1.5 border-b border-slate-800 pb-1.5">
                <Cpu className="w-4 h-4" />
                <span>BAYESIAN DISASTER INTELLIGENCE TRACE</span>
              </div>

              <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800 space-y-1.5 text-[11px]">
                <div className="text-slate-400 font-bold">Mathematical Formulation:</div>
                <div className="text-cyan-300 bg-slate-950 p-2 rounded border border-slate-800 font-mono text-[10px]">
                  P(Crisis | E) = [Prior * LR] / [1 + (Prior * LR)]
                </div>
                <p className="text-slate-300">
                  Prior Odds: <span className="text-cyan-300">0.35 / 0.65 = 0.538</span> (Baseline single call: 35%)
                </p>
                <p className="text-slate-300">
                  Likelihood Ratio (Citizen SOS): <span className="text-cyan-300">LR = 3.40</span>
                </p>
                <p className="text-slate-300">
                  Multi-Caller Verification: <span className="text-amber-400">{selectedIncident.cluster_count} calls within {selectedIncident.cluster_radius_m}m</span>
                </p>
                <div className="text-emerald-400 font-bold pt-1 border-t border-slate-800">
                  Calculated Posterior: {selectedIncident.bayesian_confidence}% Confidence
                </div>
              </div>

              <div className="text-cyan-400 font-bold flex items-center space-x-1.5 border-b border-slate-800 pb-1.5 pt-2">
                <Navigation className="w-4 h-4" />
                <span>DYNAMIC DIJKSTRA ROUTING ENGINE</span>
              </div>

              <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800 space-y-1.5 text-[11px]">
                <p className="text-slate-300">
                  Network Graph: <strong className="text-white">12 Nodes, 14 Weighted Edges</strong>
                </p>
                <p className="text-slate-300">
                  Bridge Status: <span className={roadSevered ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                    {roadSevered ? 'SEVERED (Weight = ∞)' : 'OPEN (Weight = 3.0m)'}
                  </span>
                </p>
                {roadSevered && (
                  <div className="bg-amber-950/40 border border-amber-800/80 p-2 rounded text-amber-200 text-[10px]">
                    Automatic Path Invalidation: Dijkstra recalculated Convoy #3 path to Kathipara Urban Cloverleaf & 100 Feet Elevated Viaduct (Nodes W1 -&gt; W2 -&gt; W3). Added +14 minutes latency.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 4: Stockpile Resources */}
          {rightPanelTab === 'RESOURCES' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
              <div className="text-slate-300 font-bold mb-2">REGIONAL RELIEF STOCKPILE</div>
              {[
                { name: 'Rescue Boats (Amphibious)', available: 8, total: 12, unit: 'Crafts' },
                { name: 'High-Water 8x8 Supply Trucks', available: 5, total: 8, unit: 'Vehicles' },
                { name: 'Paramedic Mobile Units', available: 11, total: 15, unit: 'Crews' },
                { name: 'Clean Water & Rations', available: 840, total: 1200, unit: 'Kits' },
                { name: 'Evacuation Shelter Capacity', available: 620, total: 1000, unit: 'Beds' }
              ].map((res, i) => (
                <div key={i} className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-lg">
                  <div className="flex items-center justify-between text-slate-200 font-bold mb-1">
                    <span>{res.name}</span>
                    <span className="text-cyan-400">{res.available}/{res.total} {res.unit}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-cyan-500 rounded-full" 
                      style={{ width: `${(res.available / res.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </aside>

      </div>

    </div>
  );
}
