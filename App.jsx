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
  ShieldAlert, 
  AlertTriangle, 
  Activity, 
  Clock, 
  Compass, 
  Layers, 
  Zap, 
  RotateCcw, 
  CheckCircle2, 
  ChevronRight, 
  Users, 
  Navigation, 
  Radio, 
  Sparkles, 
  Plus, 
  Check, 
  ShieldCheck, 
  MapPin, 
  Truck, 
  Ship, 
  HeartPulse, 
  Building2, 
  Flame, 
  ArrowRight, 
  FileText, 
  Ban, 
  AlertOctagon, 
  HelpCircle, 
  Eye, 
  RefreshCw, 
  X,
  Cpu,
  Boxes,
  Sliders,
  CheckCircle,
  PhoneCall,
  Info
} from 'lucide-react';

const MAP_DEFAULT_TILE_URL =
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

const mapTileUrlTemplate = import.meta.env.VITE_MAP_TILE_URL || MAP_DEFAULT_TILE_URL;
const mapApiKey = (import.meta.env.VITE_MAP_API_KEY || '').trim();
const mapApiKeyParam = (import.meta.env.VITE_MAP_API_KEY_PARAM || 'key').trim();
const mapTileUrl = mapTileUrlTemplate
  .replaceAll('{key}', encodeURIComponent(mapApiKey))
  .replaceAll('{api_key}', encodeURIComponent(mapApiKey));

const mapTileUrlWithApiKey =
  mapApiKey &&
  !mapTileUrlTemplate.includes('{key}') &&
  !mapTileUrlTemplate.includes('{api_key}')
    ? `${mapTileUrl}${mapTileUrl.includes('?') ? '&' : '?'}${encodeURIComponent(mapApiKeyParam)}=${encodeURIComponent(mapApiKey)}`
    : mapTileUrl;

// -----------------------------------------------------------------------------
// 1. MATHEMATICAL FORMULAS & ENGINES (PILLARS 1, 2, 3)
// -----------------------------------------------------------------------------

/**
 * PILLAR 1: AI Evidence Verification & Confidence Scoring
 * Formula:
 * Confidence = BaseSourceTrust * FreshnessDecay + CorroborationBonus - ConflictPenalty
 */
export function calculateEvidenceConfidence(reports = [], hasConflict = false) {
  if (!reports || reports.length === 0) return 30;

  const trustWeights = {
    'GOVT_FEED': 0.96,
    'FIELD_OFFICER': 0.90,
    'IOT_SENSOR': 0.86,
    'CITIZEN_CROWDSOURCE': 0.42
  };

  // Find max base trust from reporting sources
  let maxBaseTrust = 0.35;
  reports.forEach(r => {
    const w = trustWeights[r.source] || 0.40;
    if (w > maxBaseTrust) maxBaseTrust = w;
  });

  // Freshness decay based on newest report (decay 2% per 10 mins, min 0.85)
  const newestAgeMinutes = reports.reduce((min, r) => Math.min(min, r.ageMinutes || 5), 999);
  const freshnessDecay = Math.max(0.85, 1.0 - (newestAgeMinutes / 10) * 0.02);

  // Corroboration bonus: +8% per additional corroborated report, up to +24%
  const corroborationBonus = Math.min(0.24, Math.max(0, (reports.length - 1) * 0.08));

  // Conflict penalty: -25% penalty if reports contradict
  const conflictPenalty = hasConflict ? 0.25 : 0.0;

  const rawScore = (maxBaseTrust * freshnessDecay) + corroborationBonus - conflictPenalty;
  return Math.min(99, Math.max(15, Math.round(rawScore * 100)));
}

/**
 * PILLAR 2: Explainable Prioritization Engine
 * Formula:
 * Dynamic Priority = (ThreatToLife * 0.30) + (Population * 0.25) + (Vulnerability * 0.20) + (AccessIngress * 0.15) + (Confidence * 0.10)
 */
export function calculateExplainablePriority(incident) {
  const threatScore = incident.isLifeThreat ? 100 : (incident.inundationDepth_m >= 2.0 ? 85 : 45);
  const popScore = Math.min(100, Math.round((incident.populationTrapped / 50) * 100));
  
  let vulnScore = 30;
  if (incident.vulnerabilityType === 'ICU_PATIENTS') vulnScore = 100;
  else if (incident.vulnerabilityType === 'ELDERLY_HOME') vulnScore = 85;
  else if (incident.vulnerabilityType === 'INFANTS_CHILDREN') vulnScore = 90;
  else if (incident.vulnerabilityType === 'SLUM_POCKET') vulnScore = 70;

  const accessScore = incident.accessBlockageScore || 75; // Higher = more isolated/blocked
  const confidenceScore = incident.evidenceConfidence || 50;

  const weights = {
    threat: 0.30,
    population: 0.25,
    vulnerability: 0.20,
    access: 0.15,
    confidence: 0.10
  };

  const finalScore = Math.round(
    (threatScore * weights.threat) +
    (popScore * weights.population) +
    (vulnScore * weights.vulnerability) +
    (accessScore * weights.access) +
    (confidenceScore * weights.confidence)
  );

  return {
    finalScore: Math.min(100, Math.max(10, finalScore)),
    subScores: {
      threat: threatScore,
      population: popScore,
      vulnerability: vulnScore,
      access: accessScore,
      confidence: confidenceScore
    },
    weights
  };
}

/**
 * PILLAR 3: Resource Allocation Solver (Bipartite / Knapsack Constraint Matching)
 * Matches incidents requiring specific equipment against available registry
 */
export function solveResourceAllocation(incidentsList, teamsList) {
  // Sort incidents by Priority Score descending
  const sortedIncidents = [...incidentsList].sort((a, b) => b.priorityScore - a.priorityScore);
  
  // Track team availability
  const availableTeams = teamsList.map(t => ({ ...t, isAssigned: false, assignedIncidentId: null }));
  const assignments = [];
  const bottlenecks = [];
  const unserved = [];

  for (const inc of sortedIncidents) {
    const requiredCap = inc.requiredCapability; // 'ZODIAC_BOAT' | 'PARAMEDIC_AMBULANCE' | 'HEAVY_PUMP'
    
    // Find matching free team
    const match = availableTeams.find(t => !t.isAssigned && t.capabilities.includes(requiredCap));
    
    if (match) {
      match.isAssigned = true;
      match.assignedIncidentId = inc.id;
      assignments.push({
        incidentId: inc.id,
        incidentTitle: inc.title,
        priority: inc.priorityScore,
        teamId: match.id,
        teamCallsign: match.callsign,
        capability: requiredCap,
        etaMinutes: match.baseEtaMinutes || 14
      });
    } else {
      // Constraint Bottleneck detected
      unserved.push({
        incidentId: inc.id,
        incidentTitle: inc.title,
        priority: inc.priorityScore,
        neededCapability: requiredCap,
        reason: `0 ${requiredCap.replace('_', ' ')} units remaining in reserve.`
      });
      if (!bottlenecks.includes(requiredCap)) {
        bottlenecks.push(requiredCap);
      }
    }
  }

  return { assignments, unserved, bottlenecks, updatedTeams: availableTeams };
}

// -----------------------------------------------------------------------------
// 2. MOCK DATASET & STRATEGIC TOPOLOGY (CHENNAI METRO RIVER DELTA)
// -----------------------------------------------------------------------------

const INITIAL_INCIDENTS = [
  {
    id: 'INC-101',
    title: 'City Hospital Trauma & ICU Submersion',
    sector: 'Manapakkam Adyar Flood Corridor',
    pos: [13.0180, 80.1870],
    isLifeThreat: true,
    inundationDepth_m: 2.4,
    populationTrapped: 45,
    vulnerabilityType: 'ICU_PATIENTS',
    vulnerabilityLabel: '45 ICU & Dialysis Patients',
    accessBlockageScore: 92,
    requiredCapability: 'ZODIAC_BOAT',
    assignedTeamId: 'TEAM-01',
    hasConflict: false,
    reports: [
      { id: 'R101-1', source: 'IOT_SENSOR', text: 'Telemetry RG-02 breached 2.3m critical flood crest at hospital perimeter.', ageMinutes: 4 },
      { id: 'R101-2', source: 'FIELD_OFFICER', text: 'Inspector V. Raman (SDRF): Ground floor flooded, emergency generator running out of diesel.', ageMinutes: 8 }
    ],
    recommendedAction: 'Immediate amphibious extraction via Zodiac Boat with portable ventilator units.'
  },
  {
    id: 'INC-102',
    title: 'North Colony Senior Care Facility Isolation',
    sector: 'Saidapet Low-Lying Sector',
    pos: [13.0320, 80.2180],
    isLifeThreat: false,
    inundationDepth_m: 1.6,
    populationTrapped: 18,
    vulnerabilityType: 'ELDERLY_HOME',
    vulnerabilityLabel: '18 Bedridden Seniors',
    accessBlockageScore: 80,
    requiredCapability: 'PARAMEDIC_AMBULANCE',
    assignedTeamId: 'TEAM-02',
    hasConflict: false,
    reports: [
      { id: 'R102-1', source: 'CITIZEN_CROWDSOURCE', text: 'Caretaker SOS: Ground level 4ft water, medical oxygen running low.', ageMinutes: 6 },
      { id: 'R102-2', source: 'CITIZEN_CROWDSOURCE', text: 'Neighbor corroboration: Senior home cut off, power failure since 11:00 AM.', ageMinutes: 12 },
      { id: 'R102-3', source: 'FIELD_OFFICER', text: 'Civil Defense Scout: Structural access viable only via high-clearance 4WD.', ageMinutes: 15 }
    ],
    recommendedAction: 'Dispatch high-clearance 4WD Paramedic unit for urgent pharmaceutical resupply and triage.'
  },
  {
    id: 'INC-103',
    title: 'Submerged Slum Pocket & School Rooftop Refuge',
    sector: 'Kotturpuram Adyar Riverbank',
    pos: [13.0140, 80.2350],
    isLifeThreat: true,
    inundationDepth_m: 2.1,
    populationTrapped: 28,
    vulnerabilityType: 'INFANTS_CHILDREN',
    vulnerabilityLabel: '28 Civilians (12 Children & Infants)',
    accessBlockageScore: 88,
    requiredCapability: 'ZODIAC_BOAT',
    assignedTeamId: null, // Unserved due to boat scarcity
    hasConflict: false,
    reports: [
      { id: 'R103-1', source: 'CITIZEN_CROWDSOURCE', text: 'Distress call from rooftop: Adyar river overflow reached ceiling level, children awaiting rescue.', ageMinutes: 5 }
    ],
    recommendedAction: 'Allocate next available inflatable boat or request Coast Guard airborne drop.'
  },
  {
    id: 'INC-104',
    title: 'Market Road Tree Fall & Electrical Line Hazard',
    sector: 'Pondy Bazaar Transit Arterial',
    pos: [13.0420, 80.2380],
    isLifeThreat: false,
    inundationDepth_m: 0.8,
    populationTrapped: 6,
    vulnerabilityType: 'SLUM_POCKET',
    vulnerabilityLabel: '6 Shopkeepers Trapped',
    accessBlockageScore: 45,
    requiredCapability: 'HEAVY_PUMP',
    assignedTeamId: 'TEAM-03',
    hasConflict: true, // Conflicting reports!
    reports: [
      { id: 'R104-1', source: 'CITIZEN_CROWDSOURCE', text: 'Shopkeeper ping: Road is clear, only ankle-deep rain.', ageMinutes: 3 },
      { id: 'R104-2', source: 'FIELD_OFFICER', text: 'Traffic Officer Report: 1.2m waterlogging + live fallen electrical conduit. Road impassable.', ageMinutes: 5 }
    ],
    recommendedAction: 'Dispatch heavy de-watering pump and isolate municipal power grid before civilian clearing.'
  }
];

const INITIAL_TEAMS = [
  {
    id: 'TEAM-01',
    callsign: 'NDRF Unit 1 (Alpha Bn)',
    type: 'AMPHIBIOUS_RESCUE',
    capabilities: ['ZODIAC_BOAT', 'WINCH_CRANE'],
    personnel: 6,
    gear: 'Rigid Inflatable Zodiac Boat, 40HP Engine, 12 Immersion Suits',
    pos: [13.0240, 80.2280],
    batteryPct: 94,
    status: 'IN_TRANSIT',
    assignedIncidentId: 'INC-101',
    routeId: 'ROUTE-01',
    baseEtaMinutes: 14
  },
  {
    id: 'TEAM-02',
    callsign: 'SDRF Unit 2 (Bravo Medics)',
    type: 'HIGH_CLEARANCE_PARAMEDIC',
    capabilities: ['PARAMEDIC_AMBULANCE', 'FIRST_AID_TRIAGE'],
    personnel: 4,
    gear: '4WD High-Water Ambulance, Defibrillators, Mobile Oxygen',
    pos: [13.0450, 80.2300],
    batteryPct: 88,
    status: 'IN_TRANSIT',
    assignedIncidentId: 'INC-102',
    routeId: 'ROUTE-02',
    baseEtaMinutes: 11
  },
  {
    id: 'TEAM-03',
    callsign: 'Civil Defense 3 (Charlie Pump Squad)',
    type: 'DE_WATERING_ENGINEERING',
    capabilities: ['HEAVY_PUMP', 'TRANSPORT_TRUCK'],
    personnel: 5,
    gear: 'High-Volume Dewatering Pump (5000L/min), Hydraulic Chainsaws',
    pos: [13.0520, 80.2500],
    batteryPct: 91,
    status: 'ON_SITE',
    assignedIncidentId: 'INC-104',
    routeId: 'ROUTE-03',
    baseEtaMinutes: 8
  }
];

const INITIAL_SHELTERS = [
  {
    id: 'SHELTER-01',
    name: 'Highland Polytech Engineering Shelter',
    pos: [13.0290, 80.2080],
    capacity: 400,
    occupancy: 350, // 87.5% - Near Saturation!
    amenities: 'Medical Station, Emergency Kitchen, Backup Generator',
    divertTargetId: 'SHELTER-02'
  },
  {
    id: 'SHELTER-02',
    name: 'City Indoor Arena Evacuation Haven',
    pos: [13.0650, 80.2600],
    capacity: 600,
    occupancy: 120, // 20% - Safe Reserve Haven
    amenities: 'Helipad Access, 50-bed Field Hospital, Pure Water Plant',
    divertTargetId: null
  }
];

const INITIAL_DEPOTS = [
  {
    id: 'DEPOT-01',
    name: 'Ripon Command Central Supply Depot',
    pos: [13.0827, 80.2755],
    stock: '2 Zodiac Boats, 150 Lifejackets, 400 MRE Rations, 8 Mobile Drones'
  },
  {
    id: 'DEPOT-02',
    name: 'Guindy Industrial Staging Yard',
    pos: [13.0067, 80.2025],
    stock: '3 High-Volume Pumps, 2 Paramedic Trucks, 50,000 Sandbags'
  }
];

// Strategic Corridors
const STRATEGIC_ROADS = [
  {
    id: 'ROAD-CENTRAL',
    name: 'Central River Viaduct (Saidapet Maraimalai Adigal Bridge)',
    status: 'NORMAL', // Will become 'SEVERED' during Jury Challenge
    waypoints: [
      [13.0240, 80.2280], // Team 1 Start
      [13.0210, 80.2240],
      [13.0185, 80.2220], // Bridge Cutoff Point
      [13.0150, 80.2050],
      [13.0180, 80.1870]  // Hospital Destination
    ]
  },
  {
    id: 'ROAD-WEST-BYPASS',
    name: 'West Highland Elevated Bypass (Kathipara Corridor)',
    status: 'NORMAL',
    waypoints: [
      [13.0240, 80.2280],
      [13.0300, 80.2150],
      [13.0200, 80.2050],
      [13.0067, 80.2025], // Kathipara Cloverleaf
      [13.0120, 80.1920],
      [13.0180, 80.1870]  // Hospital Destination
    ]
  },
  {
    id: 'ROAD-EAST-RING',
    name: 'East Ring Transit Artery',
    status: 'NORMAL',
    waypoints: [
      [13.0450, 80.2300],
      [13.0380, 80.2250],
      [13.0320, 80.2180]
    ]
  }
];

// Flood Polygons
const INUNDATION_POLYGONS = [
  {
    id: 'FLOOD-01',
    name: 'Adyar River Main Surge Corridor (Critical Hazard)',
    depth: '2.4m',
    color: '#ef4444',
    fillOpacity: 0.35,
    coords: [
      [13.0100, 80.1750],
      [13.0220, 80.1850],
      [13.0240, 80.2150],
      [13.0220, 80.2320],
      [13.0120, 80.2450],
      [13.0040, 80.2380],
      [13.0080, 80.2100],
      [13.0050, 80.1800]
    ]
  },
  {
    id: 'FLOOD-02',
    name: 'Saidapet Urban Basin Waterlogging (High Hazard)',
    depth: '1.6m',
    color: '#f59e0b',
    fillOpacity: 0.28,
    coords: [
      [13.0250, 80.2100],
      [13.0380, 80.2180],
      [13.0320, 80.2300],
      [13.0220, 80.2250]
    ]
  }
];

// -----------------------------------------------------------------------------
// 3. LEAFLET CUSTOM COMMAND PIN BUILDERS
// -----------------------------------------------------------------------------

const createIncidentPin = (priority, isSelected) => {
  const isCritical = priority >= 75;
  const isHigh = priority >= 50;
  const color = isCritical ? '#ef4444' : isHigh ? '#f59e0b' : '#06b6d4';
  const pulse = isCritical ? 'animate-ping' : '';
  const selectedRing = isSelected ? 'ring-4 ring-white scale-125' : '';

  const html = `
    <div class="relative flex items-center justify-center w-8 h-8 ${selectedRing} transition-all">
      <span class="absolute inline-flex h-full w-full rounded-full opacity-75 ${pulse}" style="background-color: ${color};"></span>
      <span class="relative inline-flex rounded-full h-6 w-6 items-center justify-center text-slate-950 text-xs font-black shadow-lg" style="background-color: ${color};">
        ${isCritical ? '!' : isHigh ? '▲' : '●'}
      </span>
      <div class="absolute -bottom-3 bg-slate-950/95 border border-slate-700 text-[8px] px-1 rounded text-cyan-400 font-mono whitespace-nowrap shadow">
        ${priority}
      </div>
    </div>
  `;
  return L.divIcon({ html, className: 'custom-inc-pin', iconSize: [32, 32], iconAnchor: [16, 16] });
};

const createTeamPin = (team) => {
  const isImpacted = team.isImpacted;
  const isBoat = team.capabilities.includes('ZODIAC_BOAT');
  const isMedic = team.capabilities.includes('PARAMEDIC_AMBULANCE');
  const emoji = isBoat ? '🚤' : isMedic ? '🚑' : '🚚';
  const borderCol = isImpacted ? '#ef4444' : '#10b981';

  const html = `
    <div class="relative flex items-center justify-center w-9 h-9">
      ${isImpacted ? '<span class="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping"></span>' : ''}
      <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-xl border-2 bg-slate-950 text-white" style="border-color: ${borderCol};">
        ${emoji}
      </div>
      <div class="absolute -bottom-3 bg-slate-950/90 border border-slate-700 text-[8px] px-1 rounded ${isImpacted ? 'text-red-400 font-bold animate-pulse' : 'text-emerald-400'} font-mono whitespace-nowrap">
        ${team.callsign.split(' ')[0]}
      </div>
    </div>
  `;
  return L.divIcon({ html, className: 'custom-team-pin', iconSize: [36, 36], iconAnchor: [18, 18] });
};

const createShelterPin = (shelter) => {
  const satPct = Math.round((shelter.occupancy / shelter.capacity) * 100);
  const isDiverted = satPct >= 90;
  const bgCol = isDiverted ? 'bg-red-500' : satPct >= 80 ? 'bg-amber-500' : 'bg-emerald-500';

  const html = `
    <div class="flex flex-col items-center">
      <div class="flex items-center space-x-0.5 ${bgCol} text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded shadow border border-white/20 whitespace-nowrap">
        <span>🏠</span>
        <span>${satPct}%</span>
      </div>
      <div class="w-1.5 h-1.5 rounded-full ${bgCol} mt-0.5 ${isDiverted ? 'animate-ping' : ''}"></div>
    </div>
  `;
  return L.divIcon({ html, className: 'custom-shelter-pin', iconSize: [44, 24], iconAnchor: [22, 24] });
};

// Map Viewport Centering Component
function MapViewController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || 14, { duration: 1.0 });
    }
  }, [center, zoom, map]);
  return null;
}

// -----------------------------------------------------------------------------
// 4. MAIN AEGISFLOOD SPA COMPONENT
// -----------------------------------------------------------------------------

export default function AegisFloodApp() {
  // Live Emergency Clock & Dynamic Sensors
  const [zuluTime, setZuluTime] = useState('');
  const [istTime, setIstTime] = useState('');
  const [waterLevel_m, setWaterLevel_m] = useState(4.82);
  const [rainfallInflow, setRainfallInflow] = useState(52);
  const [evidenceStreamRate, setEvidenceStreamRate] = useState(14);
  const [planId, setPlanId] = useState('PLAN-DELTA-01');

  // Core Data Collections
  const [incidents, setIncidents] = useState(() => {
    return INITIAL_INCIDENTS.map(inc => {
      const confidence = calculateEvidenceConfidence(inc.reports, inc.hasConflict);
      const prio = calculateExplainablePriority({ ...inc, evidenceConfidence: confidence });
      return {
        ...inc,
        evidenceConfidence: confidence,
        priorityScore: prio.finalScore,
        priorityBreakdown: prio
      };
    });
  });

  const [teams, setTeams] = useState(INITIAL_TEAMS);
  const [shelters, setShelters] = useState(INITIAL_SHELTERS);
  const [depots] = useState(INITIAL_DEPOTS);
  const [roadSegments, setRoadSegments] = useState(STRATEGIC_ROADS);

  // UI Selection & Navigation State
  const [activeQueueFilter, setActiveQueueFilter] = useState('ALL'); // 'ALL' | 'VERIFY' | 'ASSIGNED' | 'UNSERVED'
  const [selectedEntity, setSelectedEntity] = useState(null); // { type, data }
  const [rightPanelTab, setRightPanelTab] = useState('ALLOCATOR'); // 'ALLOCATOR' | 'SHELTERS' | 'REPLANNING'
  const [expandedWhyIncidentId, setExpandedWhyIncidentId] = useState('INC-101');
  const [mapCenter, setMapCenter] = useState([13.0280, 80.2200]);
  const [mapZoom, setMapZoom] = useState(13);

  // Map Layer Toggles HUD
  const [layersHUD, setLayersHUD] = useState({
    inundation: true,
    transitCorridors: true,
    incidents: true,
    teams: true,
    shelters: true,
    depots: true
  });

  // Optimizer Solver State
  const [allocationResult, setAllocationResult] = useState(() => {
    return solveResourceAllocation(INITIAL_INCIDENTS, INITIAL_TEAMS);
  });

  // JURY CHALLENGE & AUTONOMOUS REPLANNING ENGINE (PILLAR 5)
  const [isSeveredTriggered, setIsSeveredTriggered] = useState(false);
  const [showReplanningDiffModal, setShowReplanningDiffModal] = useState(false);
  const [isPlanApproved, setIsPlanApproved] = useState(false);
  const [auditLog, setAuditLog] = useState([
    { id: 'LOG-01', time: '13:30:00', text: 'Incident Command Initialized. Base Plan PLAN-DELTA-01 Committed.' }
  ]);

  // Modal State: Inject Citizen/Field Report (Pillar 1)
  const [showInjectModal, setShowInjectModal] = useState(false);
  const [injectForm, setInjectForm] = useState({
    incidentId: 'INC-102',
    source: 'FIELD_OFFICER',
    reporterName: 'Officer S. Prakash (SDRF Grid 4)',
    text: 'Field confirmation: Waterlevel increased to 1.8m, ground floor evacuation immediately required.',
    isConflicting: false
  });

  // ---------------------------------------------------------------------------
  // CLOCK TICKER & BACKGROUND SENSOR SIMULATION
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setZuluTime(now.toISOString().substring(11, 19) + 'Z');
      setIstTime(now.toLocaleTimeString('en-US', { hour12: false }) + ' IST');

      // Subtle dynamic fluctuations in telemetry
      setWaterLevel_m(prev => +(prev + (Math.random() - 0.48) * 0.02).toFixed(2));
      setRainfallInflow(prev => Math.min(85, Math.max(30, Math.round(prev + (Math.random() - 0.5) * 3))));
      setEvidenceStreamRate(prev => Math.min(25, Math.max(8, Math.round(prev + (Math.random() - 0.5) * 2))));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ---------------------------------------------------------------------------
  // RECALCULATE INCIDENTS WHENEVER REPORTS / CONFLICTS CHANGE
  // ---------------------------------------------------------------------------
  const refreshIncidents = (updatedList) => {
    const recalculated = updatedList.map(inc => {
      const conf = calculateEvidenceConfidence(inc.reports, inc.hasConflict);
      const prio = calculateExplainablePriority({ ...inc, evidenceConfidence: conf });
      return {
        ...inc,
        evidenceConfidence: conf,
        priorityScore: prio.finalScore,
        priorityBreakdown: prio
      };
    });
    setIncidents(recalculated);
    const newSolver = solveResourceAllocation(recalculated, teams);
    setAllocationResult(newSolver);
  };

  // ---------------------------------------------------------------------------
  // JURY CHALLENGE: SEVER CENTRAL BRIDGE EXECUTION
  // ---------------------------------------------------------------------------
  const handleSeverCentralBridge = () => {
    if (isSeveredTriggered) return;

    setIsSeveredTriggered(true);
    setPlanId('PLAN-DELTA-02 (REPLANNING ACTIVE)');

    // 1. Invalidate Central Bridge Road Segment
    setRoadSegments(roads => roads.map(r => {
      if (r.id === 'ROAD-CENTRAL') {
        return { ...r, status: 'SEVERED', name: 'Central River Viaduct (SEVERED / BLOCKED)' };
      }
      return r;
    }));

    // 2. Scan active assignments & detect impacted units
    // NDRF Unit 1 was routed via Central Viaduct to City Hospital ICU
    setTeams(currTeams => currTeams.map(t => {
      if (t.id === 'TEAM-01') {
        return {
          ...t,
          isImpacted: true,
          status: 'REROUTING_PENDING_APPROVAL',
          currentRoad: 'ROAD-CENTRAL',
          assignedIncidentId: 'INC-101'
        };
      }
      return { ...t, isImpacted: false };
    }));

    // 3. Log to Mission Audit Trail
    const logEntry = {
      id: `LOG-${Date.now()}`,
      time: new Date().toLocaleTimeString('en-US', { hour12: false }),
      text: 'CRITICAL ARTERY SEVERED: Central River Viaduct submerged (Adyar River breach). Autonomous Replanning Engine triggered.'
    };
    setAuditLog(prev => [logEntry, ...prev]);

    // 4. Open Replanning & Plan Diff Hub
    setRightPanelTab('REPLANNING');
    setShowReplanningDiffModal(true);
  };

  // ---------------------------------------------------------------------------
  // HITL COMMANDER APPROVAL OF REVISED PLAN
  // ---------------------------------------------------------------------------
  const handleApproveRevisedPlan = () => {
    setIsPlanApproved(true);
    setShowReplanningDiffModal(false);
    setPlanId('PLAN-DELTA-02 (EXECUTING REVISED CORRIDOR)');

    // Commit Team 1 to West Highland Bypass
    setTeams(currTeams => currTeams.map(t => {
      if (t.id === 'TEAM-01') {
        return {
          ...t,
          isImpacted: false,
          status: 'EN_ROUTE_DETOUR',
          activeRoadId: 'ROAD-WEST-BYPASS',
          etaMinutes: 26 // 14 + 12 min penalty
        };
      }
      return t;
    }));

    // Push approved signoff to audit log
    const logEntry = {
      id: `LOG-${Date.now()}`,
      time: new Date().toLocaleTimeString('en-US', { hour12: false }),
      text: 'COMMANDER SIGN-OFF: Revised Transit Plan Authorized. NDRF Unit 1 committed to West Highland Bypass (+12m ETA penalty accepted for flood avoidance).'
    };
    setAuditLog(prev => [logEntry, ...prev]);
  };

  // ---------------------------------------------------------------------------
  // INJECT REPORT (PILLAR 1 LIVE DEMONSTRATION)
  // ---------------------------------------------------------------------------
  const handleInjectReport = (e) => {
    e.preventDefault();
    const targetInc = incidents.find(i => i.id === injectForm.incidentId);
    if (!targetInc) return;

    const newReport = {
      id: `R-${Date.now()}`,
      source: injectForm.source,
      text: `[${injectForm.reporterName}] ${injectForm.text}`,
      ageMinutes: 1
    };

    const updated = incidents.map(inc => {
      if (inc.id === injectForm.incidentId) {
        return {
          ...inc,
          hasConflict: injectForm.isConflicting ? true : inc.hasConflict,
          reports: [newReport, ...inc.reports]
        };
      }
      return inc;
    });

    refreshIncidents(updated);
    setShowInjectModal(false);

    // Add to Audit Log
    setAuditLog(prev => [{
      id: `LOG-${Date.now()}`,
      time: new Date().toLocaleTimeString('en-US', { hour12: false }),
      text: `EVIDENCE INGESTION: New ${injectForm.source} report ingested for ${targetInc.id}. Bayesian verification recalculated.`
    }, ...prev]);
  };

  // ---------------------------------------------------------------------------
  // RUN GLOBAL RESOURCE OPTIMIZER (PILLAR 3)
  // ---------------------------------------------------------------------------
  const handleRunOptimizer = () => {
    const res = solveResourceAllocation(incidents, teams);
    setAllocationResult(res);
    setRightPanelTab('ALLOCATOR');

    setAuditLog(prev => [{
      id: `LOG-${Date.now()}`,
      time: new Date().toLocaleTimeString('en-US', { hour12: false }),
      text: `OPTIMIZER SOLVER EXECUTED: ${res.assignments.length} units matched. Bottleneck detected: ${res.bottlenecks.join(', ') || 'None'}.`
    }, ...prev]);
  };

  // ---------------------------------------------------------------------------
  // FILTERED QUEUE (PILLAR 2)
  // ---------------------------------------------------------------------------
  const filteredIncidents = useMemo(() => {
    return incidents.filter(inc => {
      if (activeQueueFilter === 'VERIFY') return inc.evidenceConfidence < 70 || inc.hasConflict;
      if (activeQueueFilter === 'ASSIGNED') return inc.assignedTeamId !== null;
      if (activeQueueFilter === 'UNSERVED') return inc.assignedTeamId === null;
      return true;
    });
  }, [incidents, activeQueueFilter]);

  // ---------------------------------------------------------------------------
  // RENDER INTERFACE
  // ---------------------------------------------------------------------------
  return (
    <div className="flex flex-col h-screen w-screen bg-[#020617] text-slate-100 font-sans overflow-hidden select-none">
      
      {/* =====================================================================
          1. COMMAND HEADER & TELEMETRY BAR
      ===================================================================== */}
      <header className="h-14 bg-[#0a0f1d] border-b border-slate-800 flex items-center justify-between px-4 z-30 shadow-xl shrink-0">
        
        {/* Left: Branding & Live Radar Badge */}
        <div className="flex items-center space-x-3">
          <div className="relative flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-cyan-400" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-base font-black tracking-wider bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent font-mono">
                AEGISFLOOD: AUTONOMOUS DISASTER INTELLIGENCE
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-700/60 font-mono">
                LIVE AUTONOMOUS ENGINE
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              Mission Operations & Replanning Command Center • Greater Chennai Delta Basin
            </div>
          </div>
        </div>

        {/* Center: Live Sensor Telemetry & Clock */}
        <div className="hidden xl:flex items-center space-x-4 text-xs font-mono bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800/80">
          <div className="flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-cyan-300 font-bold">{zuluTime || '13:46:13Z'}</span>
            <span className="text-slate-500">({istTime || '19:16:13 IST'})</span>
          </div>

          <div className="h-3 w-px bg-slate-800"></div>

          {/* Water Level Gauge */}
          <div className="flex items-center space-x-1">
            <span className="text-slate-400">WATER LEVEL:</span>
            <span className={`font-bold ${waterLevel_m >= 3.5 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
              {waterLevel_m}m
            </span>
            <span className="text-[10px] text-slate-500">(Limit: 3.5m)</span>
          </div>

          <div className="h-3 w-px bg-slate-800"></div>

          {/* Rain Inflow */}
          <div className="flex items-center space-x-1">
            <span className="text-slate-400">INFLOW:</span>
            <span className="text-amber-400 font-bold">{rainfallInflow} mm/hr</span>
          </div>

          <div className="h-3 w-px bg-slate-800"></div>

          {/* Evidence Stream Rate */}
          <div className="flex items-center space-x-1">
            <Activity className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
            <span className="text-slate-400">EVIDENCE FEED:</span>
            <span className="text-purple-300 font-bold">{evidenceStreamRate} msgs/min</span>
          </div>

          <div className="h-3 w-px bg-slate-800"></div>

          {/* Active Plan ID */}
          <div className="flex items-center space-x-1">
            <span className="text-slate-500">PLAN:</span>
            <span className="text-emerald-400 font-bold">{planId}</span>
          </div>
        </div>

        {/* Right: Master Operational Action Bar */}
        <div className="flex items-center space-x-2">
          
          {/* Inject Citizen / Field Report */}
          <button
            onClick={() => setShowInjectModal(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-800/80 rounded-md transition-all active:scale-95 shadow"
          >
            <Plus className="w-3.5 h-3.5 text-purple-400" />
            <span>+ Inject Evidence Report</span>
          </button>

          {/* Run Resource Optimizer */}
          <button
            onClick={handleRunOptimizer}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-sky-950/90 hover:bg-sky-900 text-sky-300 border border-sky-700/80 rounded-md transition-all active:scale-95 shadow"
          >
            <Zap className="w-3.5 h-3.5 text-sky-400" />
            <span>⚡ Run Global Optimizer</span>
          </button>

          {/* JURY CHALLENGE: SEVER CENTRAL BRIDGE */}
          <button
            onClick={handleSeverCentralBridge}
            disabled={isSeveredTriggered}
            className={`flex items-center space-x-2 px-3.5 py-1.5 text-xs font-black rounded-md border transition-all active:scale-95 shadow-xl font-mono ${
              isSeveredTriggered
                ? 'bg-red-950/60 text-red-400 border-red-800/80 cursor-not-allowed'
                : 'bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse'
            }`}
          >
            <AlertOctagon className="w-4 h-4 text-white" />
            <span>🚨 JURY CHALLENGE: SEVER CENTRAL BRIDGE</span>
          </button>

        </div>

      </header>

      {/* =====================================================================
          2. THREE-PANEL TACTICAL WORKSPACE
      ===================================================================== */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* -------------------------------------------------------------------
            LEFT PANEL: INCIDENT INTELLIGENCE & PRIORITY QUEUE (Pillars 1 & 2)
        ------------------------------------------------------------------- */}
        <aside className="w-88 md:w-96 bg-[#0a0f1d] border-r border-slate-800 flex flex-col z-10 shrink-0">
          
          {/* Header & Filter Tabs */}
          <div className="p-3 border-b border-slate-800 bg-slate-900/60 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
                <span className="text-xs font-bold font-mono tracking-wider text-slate-200">
                  INCIDENT INTELLIGENCE QUEUE
                </span>
              </div>
              <span className="text-[10px] font-mono bg-cyan-950 text-cyan-400 border border-cyan-800/60 px-1.5 py-0.5 rounded">
                {incidents.length} MONITORED
              </span>
            </div>

            {/* Filter Pills */}
            <div className="grid grid-cols-4 gap-1 text-[10px] font-mono font-semibold">
              {[
                { id: 'ALL', label: 'All Incidents' },
                { id: 'VERIFY', label: 'Verify (Low/Conf)' },
                { id: 'ASSIGNED', label: 'Assigned' },
                { id: 'UNSERVED', label: 'Unserved' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setActiveQueueFilter(f.id)}
                  className={`py-1 rounded text-center transition-all ${
                    activeQueueFilter === f.id
                      ? 'bg-slate-700 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-300'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable Incident Cards */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {filteredIncidents.length === 0 ? (
              <div className="text-center py-12 text-slate-500 font-mono text-xs">
                No incidents match this filter.
              </div>
            ) : (
              filteredIncidents.map(inc => {
                const isSelected = selectedEntity?.data?.id === inc.id;
                const isWhyExpanded = expandedWhyIncidentId === inc.id;
                const isCritical = inc.priorityScore >= 75;
                const isHigh = inc.priorityScore >= 50;

                return (
                  <div
                    key={inc.id}
                    className={`rounded-lg border transition-all text-xs font-mono relative ${
                      isSelected
                        ? 'bg-slate-800/95 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                        : 'bg-slate-900/80 hover:bg-slate-800/60 border-slate-800'
                    }`}
                  >
                    {/* Top Row: ID, Priority Badge, Evidence Confidence */}
                    <div 
                      onClick={() => {
                        setSelectedEntity({ type: 'INCIDENT', data: inc });
                        setMapCenter(inc.pos);
                      }}
                      className="p-3 pb-2 cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-cyan-300">{inc.id}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            isCritical ? 'bg-red-500/20 text-red-400 border border-red-500/40' :
                            isHigh ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                            'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                          }`}>
                            PRIORITY {inc.priorityScore}
                          </span>
                        </div>

                        {/* Evidence Confidence Badge */}
                        <div className="flex items-center space-x-1 text-[10px]">
                          <span className="text-slate-400">Confidence:</span>
                          <span className={`font-bold ${
                            inc.evidenceConfidence >= 80 ? 'text-emerald-400' :
                            inc.evidenceConfidence >= 60 ? 'text-amber-400' : 'text-red-400'
                          }`}>
                            {inc.evidenceConfidence}%
                          </span>
                        </div>
                      </div>

                      {/* Title & Sector */}
                      <h4 className="font-sans font-bold text-slate-100 text-xs mb-1 leading-tight">
                        {inc.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 flex items-center space-x-1 mb-2">
                        <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
                        <span>{inc.sector} • Depth: {inc.inundationDepth_m}m</span>
                      </p>

                      {/* Conflicting Report Warning Banner */}
                      {inc.hasConflict && (
                        <div className="mb-2 p-1.5 bg-red-950/70 border border-red-700/80 rounded text-[10px] text-red-200 flex items-start space-x-1.5 animate-pulse">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                          <span>⚠️ Conflicting reports: Citizen claims road clear; Field Officer confirms 1.2m waterlogging. Status: Flagged for Verification.</span>
                        </div>
                      )}

                      {/* Deduplicated Source Evidence Badges */}
                      <div className="flex flex-wrap gap-1 mb-2">
                        {inc.reports.map((r, idx) => (
                          <span 
                            key={idx}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-700/80"
                          >
                            {r.source.replace('_', ' ')} (T-{r.ageMinutes}m)
                          </span>
                        ))}
                      </div>

                      {/* Assignment & Capability Row */}
                      <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-slate-800/80">
                        <span className="text-slate-400">
                          Req: <strong className="text-amber-300">{inc.requiredCapability.replace('_', ' ')}</strong>
                        </span>
                        <span className={`px-1.5 py-0.5 rounded font-bold ${
                          inc.assignedTeamId
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-red-950 text-red-400 border border-red-800 animate-pulse'
                        }`}>
                          {inc.assignedTeamId ? `ASSIGNED: ${inc.assignedTeamId}` : 'QUEUED (UNSERVED)'}
                        </span>
                      </div>
                    </div>

                    {/* Interactive "Why This Priority?" Explainer Section */}
                    <div className="border-t border-slate-800/80 bg-slate-950/60 p-2 rounded-b-lg">
                      <button
                        onClick={() => setExpandedWhyIncidentId(isWhyExpanded ? null : inc.id)}
                        className="w-full flex items-center justify-between text-[10px] text-cyan-400 hover:text-cyan-300 font-bold"
                      >
                        <span className="flex items-center space-x-1">
                          <HelpCircle className="w-3 h-3 text-cyan-400" />
                          <span>Why Priority {inc.priorityScore}? (Explainable AI Breakdown)</span>
                        </span>
                        <span>{isWhyExpanded ? '▲' : '▼'}</span>
                      </button>

                      {isWhyExpanded && (
                        <div className="mt-2 pt-2 border-t border-slate-800/80 space-y-1.5 text-[10px] text-slate-300">
                          <div className="grid grid-cols-2 gap-1 text-[9px] bg-slate-900 p-1.5 rounded border border-slate-800">
                            <div>Threat to Life (30%): <strong className="text-red-400">{inc.priorityBreakdown.subScores.threat}</strong></div>
                            <div>Population Risk (25%): <strong className="text-amber-400">{inc.priorityBreakdown.subScores.population}</strong></div>
                            <div>Vulnerability (20%): <strong className="text-purple-400">{inc.priorityBreakdown.subScores.vulnerability}</strong></div>
                            <div>Access Ingress (15%): <strong className="text-cyan-400">{inc.priorityBreakdown.subScores.access}</strong></div>
                            <div className="col-span-2">Evidence Confidence (10%): <strong className="text-emerald-400">{inc.priorityBreakdown.subScores.confidence}%</strong></div>
                          </div>
                          <div className="p-1.5 bg-cyan-950/30 border border-cyan-800/40 rounded text-cyan-200 text-[10px]">
                            <strong>Coordinator Recommendation:</strong> {inc.recommendedAction}
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                );
              })
            )}
          </div>

        </aside>

        {/* -------------------------------------------------------------------
            CENTER PANEL: TACTICAL GIS CANVAS (Pillars 4 & 5)
        ------------------------------------------------------------------- */}
        <main className="flex-1 relative flex flex-col bg-[#070e17]">
          
          {/* Top Banner: Severe Road Cutoff Alert (Feature 5) */}
          {isSeveredTriggered && (
            <div className="absolute top-3 left-4 right-4 z-[500] bg-gradient-to-r from-red-600 via-rose-700 to-amber-700 text-white p-3 rounded-lg shadow-2xl border-2 border-red-400 flex items-center justify-between animate-bounce">
              <div className="flex items-center space-x-3">
                <AlertOctagon className="w-6 h-6 text-yellow-200 shrink-0" />
                <div>
                  <div className="font-extrabold text-sm tracking-wide font-mono">
                    🚨 JURY CHALLENGE: CENTRAL RIVER VIADUCT SEVERED
                  </div>
                  <div className="text-xs text-red-100 font-mono">
                    NDRF Unit 1 land artery blocked by Adyar flash surge! Dynamic replanning rerouted via West Highland Bypass (+12m ETA penalty).
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {!isPlanApproved ? (
                  <button
                    onClick={() => setShowReplanningDiffModal(true)}
                    className="bg-amber-400 hover:bg-amber-300 text-slate-950 px-3 py-1.5 rounded font-black text-xs font-mono shadow border border-white"
                  >
                    REVIEW & APPROVE PLAN DIFF
                  </button>
                ) : (
                  <span className="bg-emerald-950 text-emerald-300 border border-emerald-500 px-2 py-1 rounded text-xs font-mono font-bold">
                    ✓ REVISED PLAN COMMITTED
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Floating Map Layers HUD Switcher */}
          <div className="absolute top-4 right-4 z-[400] bg-slate-950/90 border border-slate-800 p-2.5 rounded-lg shadow-xl text-xs font-mono backdrop-blur-md max-w-xs">
            <div className="flex items-center space-x-1.5 text-cyan-400 font-bold mb-2 pb-1 border-b border-slate-800">
              <Layers className="w-3.5 h-3.5" />
              <span>TACTICAL GIS LAYERS</span>
            </div>
            <div className="space-y-1 text-[11px]">
              {Object.keys(layersHUD).map(key => (
                <label key={key} className="flex items-center justify-between space-x-3 cursor-pointer text-slate-300 hover:text-white">
                  <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                  <input
                    type="checkbox"
                    checked={layersHUD[key]}
                    onChange={(e) => setLayersHUD({ ...layersHUD, [key]: e.target.checked })}
                    className="accent-cyan-500 rounded cursor-pointer"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Entity Quick Inspector Drawer (Bottom Left) */}
          {selectedEntity && (
            <div className="absolute bottom-4 left-4 z-[400] bg-slate-950/95 border border-slate-700 p-3 rounded-lg shadow-2xl text-xs font-mono max-w-sm backdrop-blur-md">
              <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-800">
                <span className="font-bold text-cyan-400 uppercase">
                  {selectedEntity.type} INSPECTOR: {selectedEntity.data.id || selectedEntity.data.name}
                </span>
                <button onClick={() => setSelectedEntity(null)} className="text-slate-400 hover:text-white">✕</button>
              </div>
              {selectedEntity.type === 'INCIDENT' && (
                <div className="space-y-1 text-[11px] text-slate-300">
                  <p><strong>Title:</strong> {selectedEntity.data.title}</p>
                  <p><strong>Threat:</strong> {selectedEntity.data.vulnerabilityLabel}</p>
                  <p><strong>Depth:</strong> {selectedEntity.data.inundationDepth_m}m • <strong>Trapped:</strong> ~{selectedEntity.data.populationTrapped}</p>
                  <p><strong>Assigned Unit:</strong> <span className="text-emerald-400">{selectedEntity.data.assignedTeamId || 'Unserved'}</span></p>
                </div>
              )}
              {selectedEntity.type === 'TEAM' && (
                <div className="space-y-1 text-[11px] text-slate-300">
                  <p><strong>Unit:</strong> {selectedEntity.data.callsign}</p>
                  <p><strong>Capabilities:</strong> {selectedEntity.data.capabilities.join(', ')}</p>
                  <p><strong>Equipment:</strong> {selectedEntity.data.gear}</p>
                  <p><strong>Battery/Fuel:</strong> {selectedEntity.data.batteryPct}% • <strong>Status:</strong> <span className="text-cyan-300">{selectedEntity.data.status}</span></p>
                </div>
              )}
              {selectedEntity.type === 'SHELTER' && (
                <div className="space-y-1 text-[11px] text-slate-300">
                  <p><strong>Shelter:</strong> {selectedEntity.data.name}</p>
                  <p><strong>Saturation:</strong> {selectedEntity.data.occupancy} / {selectedEntity.data.capacity} ({Math.round((selectedEntity.data.occupancy / selectedEntity.data.capacity) * 100)}%)</p>
                  {Math.round((selectedEntity.data.occupancy / selectedEntity.data.capacity) * 100) >= 90 && (
                    <p className="text-red-400 font-bold">⚠️ INTAKE DIVERTED to City Indoor Arena</p>
                  )}
                  <p><strong>Facilities:</strong> {selectedEntity.data.amenities}</p>
                </div>
              )}
            </div>
          )}

          {/* Leaflet Tactical GIS Map */}
          <div className="relative flex-1 w-full h-full min-h-0">
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              className="w-full h-full"
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              zoomControl={false}
            >
              <MapViewController center={mapCenter} zoom={mapZoom} />

              {/* CartoDB Dark Matter Base Tiles */}
              <TileLayer
                url={mapTileUrlWithApiKey}
                attribution={
                  import.meta.env.VITE_MAP_ATTRIBUTION ||
                  '&copy; <a href="https://carto.com/">CARTO</a>'
                }
                maxZoom={20}
              />

              {/* 1. Inundation Hazard Zones */}
              {layersHUD.inundation && INUNDATION_POLYGONS.map(poly => (
                <Polygon
                  key={poly.id}
                  positions={poly.coords}
                  pathOptions={{
                    color: poly.color,
                    fillColor: poly.color,
                    fillOpacity: poly.fillOpacity,
                    weight: 2,
                    dashArray: '4, 4'
                  }}
                >
                  <Popup className="tactical-popup">
                    <div className="font-mono text-xs p-1">
                      <strong className="text-cyan-400">{poly.name}</strong>
                      <p className="text-slate-300">Peak Flood Depth: <strong>{poly.depth}</strong></p>
                    </div>
                  </Popup>
                </Polygon>
              ))}

              {/* 2. Active Transit Corridors & Road Segments */}
              {layersHUD.transitCorridors && roadSegments.map(road => {
                const isSevered = road.status === 'SEVERED';
                const isWestBypass = road.id === 'ROAD-WEST-BYPASS';

                return (
                  <Polyline
                    key={road.id}
                    positions={road.waypoints}
                    pathOptions={{
                      color: isSevered ? '#ef4444' : isWestBypass && isPlanApproved ? '#10b981' : isWestBypass ? '#f59e0b' : '#38bdf8',
                      weight: isSevered ? 5 : 3,
                      dashArray: isSevered ? '8, 8' : isWestBypass && !isPlanApproved ? '4, 4' : null,
                      opacity: isSevered ? 0.95 : 0.8
                    }}
                  >
                    <Popup className="tactical-popup">
                      <div className="font-mono text-xs p-1">
                        <strong>{road.name}</strong>
                        <p className={isSevered ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                          Status: {road.status}
                        </p>
                      </div>
                    </Popup>
                  </Polyline>
                );
              })}

              {/* 3. Incidents Markers */}
              {layersHUD.incidents && incidents.map(inc => (
                <Marker
                  key={inc.id}
                  position={inc.pos}
                  icon={createIncidentPin(inc.priorityScore, selectedEntity?.data?.id === inc.id)}
                  eventHandlers={{
                    click: () => {
                      setSelectedEntity({ type: 'INCIDENT', data: inc });
                      setExpandedWhyIncidentId(inc.id);
                    }
                  }}
                >
                  <Popup className="tactical-popup">
                    <div className="font-mono text-xs p-1">
                      <div className="text-cyan-400 font-bold">{inc.id} - Priority {inc.priorityScore}</div>
                      <p className="text-slate-200 mt-1">{inc.title}</p>
                      <p className="text-slate-400">Trapped: ~{inc.populationTrapped} ({inc.vulnerabilityLabel})</p>
                      <p className="text-slate-400">Evidence Confidence: <strong>{inc.evidenceConfidence}%</strong></p>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* 4. Rescue Teams */}
              {layersHUD.teams && teams.map(team => (
                <Marker
                  key={team.id}
                  position={team.pos}
                  icon={createTeamPin(team)}
                  eventHandlers={{
                    click: () => setSelectedEntity({ type: 'TEAM', data: team })
                  }}
                >
                  <Popup className="tactical-popup">
                    <div className="font-mono text-xs p-1">
                      <strong className="text-emerald-400">{team.callsign}</strong>
                      <p className="text-slate-300">Status: {team.status}</p>
                      <p className="text-slate-300">Gear: {team.gear}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* 5. Highland Shelters */}
              {layersHUD.shelters && shelters.map(shelter => (
                <Marker
                  key={shelter.id}
                  position={shelter.pos}
                  icon={createShelterPin(shelter)}
                  eventHandlers={{
                    click: () => setSelectedEntity({ type: 'SHELTER', data: shelter })
                  }}
                >
                  <Popup className="tactical-popup">
                    <div className="font-mono text-xs p-1">
                      <strong className="text-cyan-400">{shelter.name}</strong>
                      <p className="text-slate-300">Occupancy: {shelter.occupancy} / {shelter.capacity} ({Math.round((shelter.occupancy/shelter.capacity)*100)}%)</p>
                      {shelter.occupancy / shelter.capacity >= 0.9 && (
                        <p className="text-red-400 font-bold">⚠️ INTAKE DIVERTED</p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* 6. Supply Depots */}
              {layersHUD.depots && depots.map(depot => (
                <Marker
                  key={depot.id}
                  position={depot.pos}
                  icon={L.divIcon({
                    html: `
                      <div class="flex flex-col items-center">
                        <div class="w-6 h-6 rounded bg-indigo-900 border border-indigo-400 flex items-center justify-center text-xs shadow">
                          📦
                        </div>
                        <div class="text-[7px] font-mono text-indigo-300 bg-slate-950 px-1 rounded mt-0.5 whitespace-nowrap">
                          ${depot.id}
                        </div>
                      </div>
                    `,
                    className: 'custom-depot-pin',
                    iconSize: [30, 30],
                    iconAnchor: [15, 15]
                  })}
                >
                  <Popup className="tactical-popup">
                    <div className="font-mono text-xs p-1">
                      <strong className="text-indigo-400">{depot.name}</strong>
                      <p className="text-slate-300 mt-1">{depot.stock}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}

            </MapContainer>
          </div>

        </main>

        {/* -------------------------------------------------------------------
            RIGHT PANEL: DYNAMIC COMMAND COCKPIT & OPTIMIZER (Pillars 3 & 5)
        ------------------------------------------------------------------- */}
        <aside className="w-88 md:w-96 bg-[#0a0f1d] border-l border-slate-800 flex flex-col z-10 shrink-0">
          
          {/* Top Tabs */}
          <div className="flex border-b border-slate-800 bg-slate-900/60 p-1">
            {[
              { id: 'ALLOCATOR', label: 'OPTIMIZER (P3)' },
              { id: 'SHELTERS', label: 'SHELTERS (P4)' },
              { id: 'REPLANNING', label: 'REPLANNING (P5)' }
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

          {/* TAB 1: RESOURCE ALLOCATOR SOLVER (FEATURE 3) */}
          {rightPanelTab === 'ALLOCATOR' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
              
              {/* Summary Bar */}
              <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                <div className="flex items-center justify-between text-xs font-bold text-slate-200 mb-1.5">
                  <span className="flex items-center space-x-1.5">
                    <Boxes className="w-4 h-4 text-cyan-400" />
                    <span>BIPARTITE CAPABILITY SOLVER</span>
                  </span>
                  <span className="text-emerald-400">{allocationResult.assignments.length} Matched</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Solves constrained knapsack matching between prioritized incidents and vehicle equipment profiles.
                </p>
              </div>

              {/* Active Assignments Matrix */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  Active Optimal Matches
                </div>
                {allocationResult.assignments.map((m, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-900/90 border border-slate-800 rounded-lg space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-cyan-300">{m.incidentTitle}</span>
                      <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950 px-1.5 py-0.5 rounded">
                        P{m.priority}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-300 flex items-center justify-between">
                      <span>Unit: <strong className="text-white">{m.teamCallsign}</strong></span>
                      <span>ETA: ~{m.etaMinutes}m</span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Capability Matched: {m.capability.replace('_', ' ')}
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottlenecks & Unserved Queue */}
              {allocationResult.unserved.length > 0 && (
                <div className="p-3 bg-red-950/40 border border-red-800/80 rounded-lg space-y-2">
                  <div className="flex items-center space-x-1.5 text-red-400 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4" />
                    <span>CAPACITY BOTTLENECKS DETECTED</span>
                  </div>
                  {allocationResult.unserved.map((u, i) => (
                    <div key={i} className="text-[11px] border-l-2 border-red-500 pl-2 py-0.5 text-slate-300">
                      <div className="font-bold text-red-300">{u.incidentTitle} (Priority {u.priority})</div>
                      <div className="text-[10px] text-red-200/80">{u.reason}</div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

          {/* TAB 2: SHELTERS & INTAKE DIVERSION (FEATURE 4) */}
          {rightPanelTab === 'SHELTERS' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                <span className="flex items-center space-x-1.5">
                  <Building2 className="w-4 h-4 text-cyan-400" />
                  <span>EVACUATION SHELTER INTAKE</span>
                </span>
                <span className="text-slate-400">2 HAVENS</span>
              </div>

              {shelters.map(s => {
                const satPct = Math.round((s.occupancy / s.capacity) * 100);
                const isDiverted = satPct >= 90;

                return (
                  <div 
                    key={s.id}
                    className={`p-3 rounded-lg border transition-all ${
                      isDiverted 
                        ? 'bg-red-950/40 border-red-800/80 shadow-[0_0_12px_rgba(239,68,68,0.2)]'
                        : 'bg-slate-900/80 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-200">{s.name}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isDiverted ? 'bg-red-500 text-slate-950 animate-pulse' : 'bg-slate-800 text-cyan-300'
                      }`}>
                        {satPct}% SATURATED
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 mb-2">
                      Headcount: <strong className="text-white">{s.occupancy}</strong> / {s.capacity} beds
                    </div>

                    {/* Saturation Progress Bar */}
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-2">
                      <div 
                        className={`h-full ${isDiverted ? 'bg-red-500' : satPct >= 80 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                        style={{ width: `${satPct}%` }}
                      ></div>
                    </div>

                    {/* Auto-diversion trigger notice at >= 90% */}
                    {isDiverted ? (
                      <div className="p-2 bg-red-950/80 border border-red-700/80 rounded text-[10px] text-red-200 space-y-1">
                        <div className="font-bold flex items-center space-x-1">
                          <Ban className="w-3.5 h-3.5 text-red-400" />
                          <span>INTAKE DIVERTED (THRESHOLD &ge; 90%)</span>
                        </div>
                        <p>All incoming evacuee convoys automatically redirected to City Indoor Arena Shelter (20% load).</p>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-500">
                        Amenities: {s.amenities}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: AUTONOMOUS REPLANNING & AUDIT TRAIL (FEATURE 5 - JURY CHALLENGE CORE) */}
          {rightPanelTab === 'REPLANNING' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
              
              {/* Jury Challenge Status Header */}
              <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-cyan-300 flex items-center space-x-1.5">
                    <Compass className="w-4 h-4 text-cyan-400" />
                    <span>JURY CHALLENGE EXECUTION MATRIX</span>
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    isSeveredTriggered ? 'bg-red-950 text-red-400 border border-red-800 animate-pulse' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {isSeveredTriggered ? 'CORRIDOR SEVERED' : 'NORMAL MONITORING'}
                  </span>
                </div>

                {!isSeveredTriggered ? (
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Click the red glowing <strong>[🚨 JURY CHALLENGE: SEVER CENTRAL BRIDGE]</strong> button in the top header bar to simulate flash flood road severance and trigger the autonomous replanner.
                  </p>
                ) : (
                  <div className="p-2.5 bg-red-950/60 border border-red-800 rounded space-y-2">
                    <div className="font-bold text-red-200 text-xs">
                      ⚡ Severance Detected on Central River Viaduct!
                    </div>
                    <div className="text-[11px] text-slate-300">
                      • Affected Unit: <strong className="text-white">NDRF Unit 1 (Zodiac Boat)</strong><br />
                      • Target: <strong className="text-white">City Hospital ICU (45 Trapped)</strong><br />
                      • Detour Selected: <strong className="text-amber-300">West Highland Elevated Bypass</strong><br />
                      • Delay: <strong className="text-amber-400">+12 mins (+5.2 km)</strong>
                    </div>

                    {!isPlanApproved ? (
                      <button
                        onClick={handleApproveRevisedPlan}
                        className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-black rounded font-mono shadow border border-emerald-400 flex items-center justify-center space-x-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4 text-slate-950" />
                        <span>APPROVE & EXECUTE REVISED PLAN (HITL)</span>
                      </button>
                    ) : (
                      <div className="text-emerald-400 text-center font-bold text-xs py-1 border border-emerald-700/80 rounded bg-emerald-950/60">
                        ✓ Revised Plan Committed by Incident Commander
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Immutable Mission Audit Trail */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Mission Audit Trail (Immutable)</span>
                  <span className="text-cyan-400">{auditLog.length} Events</span>
                </div>
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {auditLog.map((log) => (
                    <div key={log.id} className="p-2 bg-slate-950 border-l-2 border-cyan-500 text-[10px] space-y-0.5">
                      <div className="text-cyan-400 font-bold flex items-center justify-between">
                        <span>{log.id}</span>
                        <span>{log.time}</span>
                      </div>
                      <p className="text-slate-300">{log.text}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </aside>

      </div>

      {/* =====================================================================
          3. HITL PLAN DIFF COMPARISON MODAL (FEATURE 5 CORE)
      ===================================================================== */}
      {showReplanningDiffModal && (
        <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1324] border-2 border-cyan-500/80 rounded-xl max-w-2xl w-full p-6 shadow-2xl space-y-5 font-mono text-xs">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <AlertOctagon className="w-6 h-6 text-amber-400" />
                <h3 className="text-sm font-black text-white tracking-wide">
                  AUTONOMOUS REPLANNING: BEFORE VS AFTER EXECUTION MATRIX
                </h3>
              </div>
              <button 
                onClick={() => setShowReplanningDiffModal(false)}
                className="text-slate-400 hover:text-white text-base"
              >
                ✕
              </button>
            </div>

            {/* Explanatory Context */}
            <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800 text-slate-300 space-y-1 text-[11px]">
              <strong className="text-cyan-300">Hazard Event:</strong> Central River Viaduct impassable due to 2.4m Adyar River breach.
              <p>The routing solver has verified an alternate dry corridor traversing the West Highland Bypass without intersecting active flood hazard polygons.</p>
            </div>

            {/* Side-by-Side Comparison Table */}
            <div className="grid grid-cols-2 gap-4">
              
              {/* Original Plan (Infeasible) */}
              <div className="p-3 bg-red-950/40 border border-red-800/80 rounded-lg space-y-2">
                <div className="text-red-400 font-bold flex items-center justify-between border-b border-red-800 pb-1">
                  <span>ORIGINAL PLAN (PLAN-DELTA-01)</span>
                  <span className="text-[9px] bg-red-900 text-white px-1.5 rounded">INFEASIBLE</span>
                </div>
                <div className="space-y-1 text-[11px] text-slate-300">
                  <p><strong>Corridor:</strong> Central River Viaduct</p>
                  <p><strong>Travel Distance:</strong> 6.4 km</p>
                  <p><strong>Estimated ETA:</strong> 14 mins</p>
                  <p><strong>Status:</strong> <span className="text-red-400 font-bold">BLOCKED / SEVERED</span></p>
                  <p><strong>Safety Score:</strong> 0% (Fatal Submersion)</p>
                </div>
              </div>

              {/* Proposed Revised Plan (Feasible) */}
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/80 rounded-lg space-y-2">
                <div className="text-emerald-400 font-bold flex items-center justify-between border-b border-emerald-700 pb-1">
                  <span>REVISED PLAN (PLAN-DELTA-02)</span>
                  <span className="text-[9px] bg-emerald-600 text-slate-950 px-1.5 rounded font-black">RECOMMENDED</span>
                </div>
                <div className="space-y-1 text-[11px] text-slate-300">
                  <p><strong>Corridor:</strong> West Highland Bypass</p>
                  <p><strong>Travel Distance:</strong> 11.6 km (+5.2 km)</p>
                  <p><strong>Estimated ETA:</strong> 26 mins (+12 mins)</p>
                  <p><strong>Status:</strong> <span className="text-emerald-400 font-bold">100% DRY / ACCESSIBLE</span></p>
                  <p><strong>Safety Score:</strong> 98% (High Elevation)</p>
                </div>
              </div>

            </div>

            {/* HITL Commander Sign-Off Controls */}
            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowReplanningDiffModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold transition-all"
              >
                Manual Override / Defer
              </button>
              <button
                onClick={handleApproveRevisedPlan}
                className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black rounded shadow-lg border border-emerald-300 transition-all active:scale-95 flex items-center space-x-1.5"
              >
                <CheckCircle2 className="w-4 h-4 text-slate-950" />
                <span>APPROVE & EXECUTE REVISED PLAN</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* =====================================================================
          4. INJECT REPORT MODAL (FEATURE 1 LIVE DEMONSTRATION)
      ===================================================================== */}
      {showInjectModal && (
        <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form 
            onSubmit={handleInjectReport}
            className="bg-[#0b1324] border border-purple-500/80 rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4 font-mono text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-purple-300 text-sm flex items-center space-x-1.5">
                <Plus className="w-4 h-4" />
                <span>INJECT CITIZEN / FIELD EVIDENCE REPORT</span>
              </span>
              <button 
                type="button" 
                onClick={() => setShowInjectModal(false)} 
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Target Incident Selection */}
            <div>
              <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Target Sector / Incident</label>
              <select
                value={injectForm.incidentId}
                onChange={(e) => setInjectForm({ ...injectForm, incidentId: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
              >
                {incidents.map(inc => (
                  <option key={inc.id} value={inc.id}>{inc.id} - {inc.title}</option>
                ))}
              </select>
            </div>

            {/* Source Category Tier */}
            <div>
              <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Source Category (Trust Tier)</label>
              <select
                value={injectForm.source}
                onChange={(e) => setInjectForm({ ...injectForm, source: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
              >
                <option value="GOVT_FEED">Tier 1: Government Control Room Feed (Trust: 96%)</option>
                <option value="FIELD_OFFICER">Tier 2: Field Officer / SDRF Scout (Trust: 90%)</option>
                <option value="IOT_SENSOR">Tier 3: River Telemetry IoT Gauge (Trust: 86%)</option>
                <option value="CITIZEN_CROWDSOURCE">Tier 4: Citizen Crowdsourced Mobile SOS (Trust: 42%)</option>
              </select>
            </div>

            {/* Reporter Name */}
            <div>
              <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Reporter Callsign / Identification</label>
              <input
                type="text"
                value={injectForm.reporterName}
                onChange={(e) => setInjectForm({ ...injectForm, reporterName: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                required
              />
            </div>

            {/* Report Content */}
            <div>
              <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Incident Report Details</label>
              <textarea
                value={injectForm.text}
                onChange={(e) => setInjectForm({ ...injectForm, text: e.target.value })}
                rows={3}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs"
                required
              />
            </div>

            {/* Conflicting Report Toggle */}
            <div className="flex items-center space-x-2 pt-1">
              <input
                type="checkbox"
                id="conflictCheck"
                checked={injectForm.isConflicting}
                onChange={(e) => setInjectForm({ ...injectForm, isConflicting: e.target.checked })}
                className="accent-red-500 rounded cursor-pointer"
              />
              <label htmlFor="conflictCheck" className="text-red-300 font-bold cursor-pointer text-[11px]">
                Simulate Contradictory / Conflicting Report (-25% Penalty)
              </label>
            </div>

            {/* Submit */}
            <div className="pt-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowInjectModal(false)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded shadow transition-all"
              >
                Ingest & Recalculate
              </button>
            </div>

          </form>
        </div>
      )}

    </div>
  );
}