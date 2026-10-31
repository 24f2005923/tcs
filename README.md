# Emergency Command Center (ECC) - Flood Disaster Intelligence & Autonomous Relief Coordination
**Challenge 11: AI Disaster Intelligence & Dynamic Route Invalidation**

---

## 🏛️ System Architecture Overview

The Emergency Command Center (ECC) is a fully live, event-driven, real-time command dashboard engineered for high-consequence flood disasters. Unlike static JSON visualizers or mock prototypes, this system operates on a continuous event-driven loop powered by **FastAPI WebSockets**, **NetworkX Dynamic Graph Routing (Dijkstra)**, and **Bayesian Spatio-Temporal Clustering**.

### Architecture Stack:
- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, Leaflet / React-Leaflet with CartoDB Dark Matter tiles.
- **Backend / Real-Time Engine**: FastAPI (Python 3.13), WebSockets (`ws://127.0.0.1:8000/ws`), Asyncio background concurrency.
- **Routing & Graph Engine**: Dynamic NetworkX In-Memory Topology Graph with live Dijkstra / A* edge invalidation.
- **Inference & Probabilistic Modeling**: Bayesian Spatio-Temporal Ingestion Engine with likelihood updates ($35\% \to 72\% \to 94\%$).

---

## 🚀 Quick Start Instructions

### 1. Prerequisites & Dependencies
Ensure Python 3.10+ and Node.js 18+ are available on your system.

```bash
# Python dependencies
pip install fastapi uvicorn networkx websockets

# Frontend dependencies (already pre-built in /frontend/dist)
cd frontend
npm install lucide-react leaflet react-leaflet
```

### 2. Run the Full Real-Time System
You have two execution modes:

#### Option A: Unified Full-Stack Run (Recommended)
FastAPI natively serves both the WebSockets API and the compiled React production frontend directly on port 8000:
```bash
python server.py
```
Open your browser at: **[http://localhost:8000](http://localhost:8000)**

#### Option B: Vite Hot-Reload Development Server
Run backend and frontend independently:
```bash
# Terminal 1: Backend WebSocket Server
python server.py

# Terminal 2: React Vite Dev Server
cd frontend
npm run dev
```
Open your browser at: **[http://localhost:5173](http://localhost:5173)**

---

## ⚙️ Real-Time Event Engine & Background Loops

1. **Global Timeline Ticker Loop (1 Hz / 1-second pulse)**:
   - Advances emergency phase timeline: `T+02:14:10 into Flood Warning Phase`.
   - Steps moving convoys along their assigned graph polylines with updated GPS coordinates.
   - Pushes live operational metrics to the UI.
2. **Dynamic River Gauge Telemetry Loop (0.33 Hz / 3-second cycle)**:
   - Monitored river gauges (`RG-01`, `RG-02`, `RG-03`) rise and fall dynamically.
   - When water levels exceed the critical **1.5m threshold**, automated threshold alerts trigger instant warnings.
3. **Citizen SOS Ingestion & Bayesian Clustering (5–9 second interval)**:
   - Incoming citizen distress calls, telemetry pings, and police dispatches are ingested asynchronously.
   - **Spatio-Temporal Clustering (Haversine $\le 300\text{m}$)**: Pings within 300m merge automatically into existing incident clusters.
   - **Bayesian Probability Update**:
     $$P(\text{Crisis} \mid E) = \frac{\text{Prior Odds} \times \prod \text{LR}}{1 + \text{Prior Odds} \times \prod \text{LR}}$$
     - Single unverified call: **35% confidence**
     - Second correlated call: **72% confidence**
     - Third correlated call / sensor alert: **94% confidence**
4. **Live Operator Load & Realtime Badge**:
   - `OPERATOR LOAD` dynamically tracks pending unapproved critical dispatches.
   - Pulsing green `● LIVE / REALTIME` badge blinks with every incoming network packet.

---

## 🏆 Jury Challenge: Road Severance & Dynamic Re-Route

### The Scenario:
1. Convoy #3 ("Relief Fleet #3 - Heavy Supply & Amphibious Support") is traversing the arterial corridor across **Arterial Highway Bridge (Node B $\to$ Zone North)**.
2. Click **[Trigger Road Severance (Jury Challenge)]** on the Demo Toolbar.
3. The server emits a `ROAD_SUBMERGED` broadcast event:
   - Edge `(BRIDGE_B, ZONE_N)` is invalidated in NetworkX ($\text{weight} = \infty$, status `SUBMERGED`).
   - Dijkstra engine recalculates alternative path via **West River Bypass Arterial (Nodes W1 $\to$ W2 $\to$ W3)**.
   - Travel time increases from 6.0 mins to 20.0 mins (**+14 mins delay penalty**).
4. Audio-visual alert payload flashes on the UI:
   > *"Convoy #3 land artery severed! Re-routing via West Bypass (+14 mins ETA). Amphibious boat requested for final 300m."*
5. Leaflet map updates polyline to dashed amber and animates convoy along the new detour.

---

## 🎛️ Three-Panel Tactical Layout

- **Header Bar**: Title, Persona Selector (`Commander`, `Field Agent`, `Developer`), Filter Tabs (`[All]`, `[Sensor Verified]`, `[Citizen SOS]`, `[Evacuation Active]`), Realtime Ticker, and Live Counters.
- **Demo Toolbar**: `[Simulate Flood Surge]`, `[Trigger Road Severance]`, `[Inject Citizen SOS]`, `[Reset View]`, `[Clear]`.
- **Left Panel (Live Incident Queue)**: Scrollable list with category badges (`CRITICAL`, `HIGH`, `NORMAL`), Bayesian progress meter (35% $\to$ 72% $\to$ 94%), cluster counts, and elapsed time. Clicking card centers map.
- **Center Panel (Tactical Map & HUD)**: Dark CartoDB Leaflet canvas, pulsating GeoJSON flood heatmaps, live incident pins, moving convoy markers, river gauge tags, and floating "TACTICAL LAYERS" toggle HUD.
- **Right Panel (Human-in-the-Loop Triage Hub)**:
  - Tabs: `[TRIAGE]`, `[OPERATOR DISPATCH]`, `[EXPLAINABILITY]`, `[RESOURCES]`.
  - `[TRIAGE]`: AI Recommendation dossier, verification checklist, allocation steppers for Amphibious Boats, Ambulances, and Rations, and `[Approve Dispatch Plan & Lock Route]` button.
  - `[EXPLAINABILITY]`: Bayesian formula trace and Dijkstra edge cost matrix.
