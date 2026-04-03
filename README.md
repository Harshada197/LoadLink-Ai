<div align="center">

# ⚡ LOADLINK AI
### SmartLoad Intelligence Platform
**Real-time 3D cargo optimization for logistics operations**

*Stop-aware bin packing · Fleet intelligence · Carbon tracking · CV load validation*

Built for the **DP World National Hackathon** · Team CoreCoders

---

![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-3D_Engine-black?style=flat-square&logo=three.js&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-Build-646CFF?style=flat-square&logo=vite&logoColor=white)
![WebSocket](https://img.shields.io/badge/WebSocket-Real--time-brightgreen?style=flat-square)
![XGBoost](https://img.shields.io/badge/AI-Smart_Pack-FF6F00?style=flat-square)

---

LoadLink AI identifies wasted cargo space and inefficient load sequences **before the truck leaves the dock** — and generates a fully optimized, stop-aware 3D load plan in seconds.

→ [Live Demo](#) · [Project Deck](#) · [GitHub Repository](#)

</div>

---

## 🎯 Problem Statement

Logistics operations lose 20–40% of cargo capacity on every shipment — not because the cargo doesn't fit, but because there is no intelligent system guiding how it is physically loaded. Planning-level tools calculate whether freight fits in theory; they provide zero guidance on *how* to load it in practice.

**Target Customers:** Logistics companies · Warehouse operators · Port authorities (DP World ecosystem) · Manufacturers & distributors

### The Problem

- **20–40%** cargo space remains unused in typical logistics operations
- Existing systems optimize only at the planning level — no real-time physical load guidance
- No validation of how goods are actually loaded inside the container
- Packages are loaded without regard for drop-stop sequence, causing delays at every stop
- Increased fuel consumption from sub-optimal weight distribution raises carbon emissions

### Pain Points

| Pain Point | Impact |
|---|---|
| Wasted cargo space | Higher cost per shipment, lower fleet ROI |
| No real-time load validation | Human errors, weight imbalance, cargo damage |
| Poor unloading sequence | Delays and extra labor at every drop stop |
| No carbon tracking | Hidden environmental impact, growing regulatory exposure |
| Disconnected systems | Planners, drivers, and warehouse teams have no shared visibility |

---

## 💡 Solution

LoadLink AI introduces a **packing intelligence layer** that sits between route planning and physical loading. It evaluates, visualizes, and optimizes how cargo is actually packed inside containers — in real time, with full 3D visibility.

**Core Pipeline:**

```
Container Specs + Packages + Route Stops
    → Stop-Priority Sort (LIFO)
        → 3D Bin-Pack Engine
            → Placement Manifest
                → Three.js 3D Render + AI Suggestions + Carbon Report
                    → Operator Dashboard → Physical Loading
```

**Signals Optimized:** Stop drop sequence · Package dimensions & weight · Fragility constraints · Weight distribution (front/rear balance) · Volume utilization · Carbon per kg·km

---

## 🔄 System Transformation

| ❌ Before LoadLink AI | ✅ After LoadLink AI |
|---|---|
| Load order decided by warehouse staff guesswork | Stop-priority LIFO ensures first-drop packages are always nearest the door |
| No 3D visibility into container packing | Interactive Three.js 3D view of every load plan, per truck |
| Single truck — no fleet management | Multi-truck fleet selector with per-truck isolated state |
| No carbon measurement per shipment | Carbon calculated per route by fuel type and load weight |
| Manual package validation | Hard-constraint validation: weight, volume, and dimension guards on every add |
| No AI guidance for operators | Smart Pack AI suggestions with estimated % gains per action |
| Optimization rerun manually | Auto re-optimization on every package or stop change (debounced 300ms) |

---

## 🏗️ System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         INPUT LAYER                               │
│                                                                   │
│   Fleet Configuration         Packages            Route Stops    │
│   • Truck dimensions          • Dimensions        • Drop order   │
│   • Max weight                • Weight            • Stop labels  │
│   • Fuel type                 • Fragile flag      • Priority map │
│   • Status (idle/loaded)      • Stop assignment                  │
└────────────────────────────┬─────────────────────────────────────┘
                              │
┌─────────────────────────────▼────────────────────────────────────┐
│                   OPTIMIZATION ENGINE LAYER                       │
│                                                                   │
│  ┌──────────────────┐  ┌────────────────┐  ┌──────────────────┐  │
│  │  Stop-Priority   │─▶│  3D Bin-Pack   │─▶│   Placement      │  │
│  │  Pre-Processor   │  │  (LIFO Extreme │  │   Manifest       │  │
│  │                  │  │   Points)      │  │                  │  │
│  │ priority =       │  │                │  │ {id, x, y, z,    │  │
│  │ totalStops −     │  │ • All 6 rotations│ │  rotation,       │  │
│  │ stopIndex        │  │ • Gravity-first │  │  stopZone}       │  │
│  │                  │  │ • Fragility    │  │                  │  │
│  └──────────────────┘  │   hard-constraint│ └──────────────────┘  │
│                         └────────────────┘                        │
└─────────────────────────────┬────────────────────────────────────┘
                               │ Single source of truth
┌──────────────────────────────▼────────────────────────────────────┐
│                     RENDERING & INTELLIGENCE LAYER                 │
│                                                                    │
│  ┌────────────────┐  ┌───────────────┐  ┌──────────────────────┐  │
│  │  Three.js 3D   │  │  Smart Pack   │  │   Carbon Tracker     │  │
│  │  Scene         │  │  AI Engine    │  │                      │  │
│  │                │  │               │  │ CO₂ = distance ×     │  │
│  │ • Wireframe    │  │ • Stack small │  │ weight ×             │  │
│  │ • Zone dividers│  │   vertically  │  │ fuel_factor          │  │
│  │ • Box colors   │  │ • Redistribute│  │                      │  │
│  │   by stop      │  │ • Use upper   │  │ Per truck, per route │  │
│  │ • Rear door    │  │   space       │  │                      │  │
│  │   indicator    │  └───────────────┘  └──────────────────────┘  │
│  └────────────────┘                                                │
└─────────────────────────────┬──────────────────────────────────────┘
                               │
┌──────────────────────────────▼────────────────────────────────────┐
│                      OPERATOR DASHBOARD                            │
│     Efficiency Stats · Breakdown Panel · Alerts · Fleet View       │
│              WebSocket Real-Time Sync · Dark Theme UI              │
└───────────────────────────────────────────────────────────────────┘
```

---

## ⚙️ Operation Workflow

| Stage | Details |
|---|---|
| **1. Fleet Selection** | Operator selects a truck from the fleet grid; container specs auto-populate; trucks marked `in-transit` are locked |
| **2. Route Configuration** | Define named stops in drop sequence order; first stop = first unload = packages loaded nearest the rear door |
| **3. Package Assignment** | Add packages with dimensions, weight, fragility flag, and drop stop; hard validation on every add |
| **4. Stop-Priority Sort** | Pre-processor computes `priority = totalStops − stopIndex`; packages sorted LIFO so first-drop cargo ends up at the door |
| **5. 3D Bin Packing** | Extreme Points algorithm places sorted packages in all 6 rotations; fragility constraints enforced as hard rules |
| **6. 3D Visualization** | Three.js renders placement manifest — color-coded by stop zone, zone dividers visible, rear door framed |
| **7. AI Suggestions** | Smart Pack engine generates 2–3 specific recovery actions with estimated % gain each |
| **8. Carbon Report** | Emissions calculated from route distance × total load weight × fuel emission factor |
| **9. Export & Load** | Operator receives printed load order manifest; packages loaded in sequence; CV Vision validates physical load |

---

## ✨ Key Innovations

| Innovation | Description |
|---|---|
| 🗺️ **Stop-Priority LIFO Packing** | Industry-first: load order is driven by drop sequence, not just volume. First-drop packages always land nearest the rear door — zero manual planning needed |
| 📦 **Fragility Hard Constraints** | No heavier package can be placed above a fragile item — enforced at the algorithm level, not as a suggestion |
| 🚛 **Multi-Truck State Isolation** | Each truck holds its own independent package list, stops, and placement manifest. Switching trucks is instant and non-destructive |
| 🔄 **Auto Re-Optimization** | Any change to packages or stops triggers a debounced re-run — the operator always sees a live, valid plan |
| 📊 **Split Dead Space Reporting** | Distinguishes *unavoidable* dead space (from zone separation) from *optimizable* dead space — a more honest efficiency metric |
| 🌿 **Per-Load Carbon Intelligence** | Carbon calculated per shipment by fuel type and actual loaded weight — not a fleet average estimate |

---

## 🧠 Optimization Engine — LIFO 3D Bin Packing

### Algorithm Overview

| Attribute | Detail |
|---|---|
| Algorithm | 3D Bin Packing — Extreme Points Method |
| Strategy | LIFO (Last-In First-Out) aligned to stop drop order |
| Rotations tested | All 6 axis permutations per package per candidate point |
| Placement heuristic | Gravity-first — minimizes wasted vertical space |
| Fragility constraint | Hard rule — no heavier item above a fragile package |
| Output | Placement manifest: `{id, x, y, z, w, h, d, rotation, stopZone}` |

### Priority Formula

```
priority = totalStops − stopIndex
```

Where `stopIndex` is 0-based from the first drop (index 0 = first stop unloaded = highest priority = placed last = nearest door).

### Stop Priority Table

| Stop | Index | Priority | Physical Position |
|---|---|---|---|
| First drop (Stop A) | 0 | Highest | Nearest rear door |
| Second drop (Stop B) | 1 | Medium | Middle zone |
| Last drop (Stop C) | 2 | Lowest | Deepest inside truck |

### Within-Stop Tiebreaker (applied in order)

1. **Fragile items first** — placed on top of the zone (hard constraint)
2. **Heaviest items** — placed at the bottom of the zone
3. **Largest volume** — placed before smaller items

### Risk Scoring Signals (Efficiency Metrics)

| Metric | Formula |
|---|---|
| Efficiency % | `(usedVolume / containerVolume) × 100` |
| Total dead space % | `((containerVolume − usedVolume) / containerVolume) × 100` |
| Unavoidable dead space | Volume lost to stop-zone boundary separation |
| Optimizable dead space | `totalDeadSpace − unavoidableDeadSpace` |
| Weight balance | Front/rear % split of total load weight |

---

## 🔬 Hardship Classification — Validation Rules

Package add validation enforces these rules as hard blocks (not warnings):

| Check | Condition | Error |
|---|---|---|
| Weight guard | `currentWeight + pkg.weight > truck.maxWeight` | `"Exceeds weight limit by X kg"` |
| Volume guard | `currentVolume + pkgVolume > containerVolume` | `"Exceeds volume capacity"` |
| Dimension guard | Any pkg dimension > truck dimension | `"Package [dim] exceeds truck container"` |
| Zero values | Any dimension or weight ≤ 0 | Inline field error before submission |
| Stop missing | Package has no stop when stops are defined | `"Assign a drop stop before saving"` |
| In-transit lock | Truck status = `in-transit` | `"This truck is currently in transit"` |

---

## 🔐 Security & Compliance

| Control | Implementation |
|---|---|
| 🛡️ **State Isolation** | Per-truck state is independently keyed — no cross-contamination between fleet vehicles |
| 🔗 **WebSocket Auth** | Real-time sync channel uses token-based authentication |
| 📄 **Audit Trail** | Every optimization run is timestamped; placement manifest versioned per run |
| 🔑 **Access Control** | Role-based dashboard access — operators see their assigned trucks only |
| 👤 **Human Governance** | Stop reordering and package transfer require explicit user confirmation modals |

---

## ⚠️ Risk Mitigation

**Algorithm-Level Risks**

- **Suboptimal packing for large loads (30+ packages)** → Bin packing is NP-hard; the Extreme Points heuristic is fast but not globally optimal for very dense loads. Mitigation: pre-sort pass + rotation testing keeps quality high in practice; ML upgrade planned (Phase 2)
- **Fragility false positives** → Hard constraint may leave small gaps above fragile items. Mitigation: constraint applies only to direct stacking; lateral adjacency is allowed

**Infrastructure-Level Risks**

- **Stale 3D view** → Debounced 300ms auto re-optimization on every state change; spinner overlay ensures operator never acts on an outdated plan
- **State loss on refresh** → Current version is in-memory client-side. Mitigation: persistent backend is Phase 1 priority
- **Large manifest performance** → Manifests of 50+ packages may cause Three.js frame drops. Mitigation: InstancedMesh rendering upgrade planned

**User-Level Risks**

- **Stop reassignment errors** → Reordering stops immediately recalculates priorities and shows a confirmation before re-optimizing
- **Wrong truck selection** → Confirmation modal on truck switch when unsaved changes exist; `in-transit` trucks are locked

---

## 📊 Dashboard Modules

The operations dashboard provides a unified view across 7 modules:

**🏠 Load Optimizer** — Container specs, package management, run optimization button, live stats (efficiency %, dead space %, packages placed, weight used).

**🚛 Fleet Selector** — Visual truck card grid with capacity bars and status badges. Click to switch active truck instantly.

**🗺️ Route Builder** — Drag-to-reorder stop list. Add / remove / rename stops. Package counts per stop shown inline.

**📦 3D Container View** — Interactive Three.js scene. Empty wireframe or fully packed view. Color-coded by stop zone. Zone divider planes. Click any box for full detail.

**📈 Optimization Breakdown** — Before vs. after vs. industry average bars. Unavoidable vs. optimizable dead space. Per-stop zone efficiency. Weight balance split.

**🤖 Smart Pack Suggestions** — 2–3 AI-generated recovery actions with estimated % gain each.

**🌿 Carbon Tracker** — CO₂ per shipment by fuel type. Savings from improved utilization. Per-route emissions trend.

---

## 🗂️ Project Structure

```
loadlink-ai/
│
├── src/
│   ├── components/
│   │   ├── LoadOptimizer/            # Core module — container specs + run button
│   │   ├── FleetSelector/            # Multi-truck fleet card grid
│   │   ├── RouteBuilder/             # Drag-to-reorder stop builder
│   │   ├── ThreeScene/               # Three.js container renderer
│   │   │   ├── TruckScene.tsx        # Main scene: wireframe, grid, rear door
│   │   │   ├── PackageBox.tsx        # Individual box mesh with click handler
│   │   │   └── ZoneDivider.tsx       # Translucent stop-boundary planes
│   │   ├── PackagePanel/             # Package list + add/edit form
│   │   ├── BreakdownPanel/           # Efficiency stats + bar charts
│   │   ├── SmartPackSuggestions/     # AI suggestion cards
│   │   ├── CarbonTracker/            # Emissions calculation + display
│   │   ├── SmartLoadVision/          # CV validation module
│   │   └── Alerts/                   # Real-time WebSocket alert panel
│   │
│   ├── engine/
│   │   ├── binPack.ts                # Core 3D LIFO Extreme Points algorithm
│   │   ├── stopPriority.ts           # Pre-processing: stop-priority sort
│   │   ├── validation.ts             # All package + truck validation rules
│   │   ├── carbonCalc.ts             # CO₂ calculation by fuel type + weight
│   │   └── smartPack.ts              # Heuristic AI suggestion generator
│   │
│   ├── state/
│   │   ├── truckState.ts             # Per-truck state map + useReducer
│   │   ├── fleetConfig.ts            # TRUCK_FLEET seed data (4+ trucks)
│   │   └── wsContext.ts              # WebSocket context + event handlers
│   │
│   ├── types/
│   │   └── index.ts                  # All TypeScript interfaces (Truck, Package, Stop, PlacementResult)
│   │
│   └── App.tsx
│
├── public/
├── .env.example
├── vite.config.ts
├── tailwind.config.ts
└── package.json
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm 9+ or yarn 1.22+

### Installation

```bash
git clone https://github.com/your-org/loadlink-ai.git
cd loadlink-ai
npm install
```

### Development Server

```bash
npm run dev
# App runs at http://localhost:5173
```

### Production Build

```bash
npm run build
npm run preview    # Preview production build locally
```

### Environment Variables

Create a `.env` file in the root:

```env
VITE_WS_URL=ws://localhost:8080
VITE_API_BASE_URL=http://localhost:3000
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend Framework | React 18 + TypeScript | Component UI, strict typing |
| 3D Engine | Three.js r128 | Container visualization, box rendering, zone dividers |
| Styling | Tailwind CSS | Dark-theme utility-first styling |
| State Management | React Context + useReducer | Per-truck isolated state, no shared mutation |
| Real-time | WebSocket (native browser API) | Live alerts, multi-user sync |
| Bin Packing Engine | Custom LIFO 3D — Extreme Points | Spatial placement with fragility + stop constraints |
| AI Suggestions | LoadLink AI v1.0 (heuristics + CV) | Smart Pack recovery recommendations |
| Build Tool | Vite 5 | Fast dev server, tree-shaken production builds |

---

## 📈 Feasibility Assessment

### Implementation Score

| Dimension | Score | Notes |
|---|---|---|
| Technical Feasibility | 9 / 10 | All core modules functional; Three.js 3D view fully working end-to-end |
| Algorithm Accuracy | 7 / 10 | LIFO + stop-priority packing solid; edge cases in fragility stacking need hardening for very dense (50+ item) loads |
| Real-Time Performance | 8 / 10 | Debounced re-renders and WebSocket sync perform well; 50+ package manifests need InstancedMesh profiling |
| UI/UX Completeness | 8 / 10 | Dark-theme dashboard is polished; mobile responsiveness not yet addressed |
| Scalability | 6 / 10 | In-memory client-side state; no persistent backend or multi-user database yet |
| Integration Readiness | 5 / 10 | API contracts defined; no live ERP/TMS connectors exist yet |
| Carbon Calculation | 7 / 10 | Heuristic model functional; needs validation against real fleet telematics data |
| **Overall Score** | **7.1 / 10** | **Strong prototype — production-ready with ~3 months of backend + integration work** |

### Strengths

- Bin-packing engine is architecturally extensible — stop-priority was added as a pure pre-processing step, zero changes to the core packer
- Stop-priority LIFO solves a real operational problem that major TMS competitors (SAP EWM, Oracle TMS, Manhattan Associates) do not address
- Three.js 3D view provides genuine differentiating value over 2D grid or spreadsheet-based load planners
- Single placement manifest as source of truth is clean, testable, and easy to extend

### Known Limitations

- Bin packing is NP-hard — the Extreme Points heuristic is fast but not globally optimal for highly constrained, very large loads
- No persistent storage in current version — state is lost on page refresh
- SmartLoad Vision is a prototype; real deployment requires camera hardware integration and domain-specific model training
- Carbon calculations use estimated emission factors; real accuracy requires fleet telematics integration

---

## 🔭 Future Roadmap

### Phase 1 — Production Hardening *(0–3 months)*

| Enhancement | Priority | Complexity |
|---|---|---|
| Persistent backend (Node.js + PostgreSQL) | Critical | Medium |
| User authentication and team workspaces | Critical | Medium |
| Mobile-responsive layout | High | Medium |
| Export load plan as printable PDF manifest | High | Low |
| Unit + integration tests for bin-pack engine | High | Medium |
| InstancedMesh rendering for 50+ package performance | Medium | Low |

### Phase 2 — Intelligence Upgrade *(3–6 months)*

| Enhancement | Priority | Complexity |
|---|---|---|
| ML-based packing optimizer — replace heuristic with trained model | High | High |
| SmartLoad Vision — full CV pipeline with real cargo detection | High | High |
| API integrations: SAP EWM, Oracle TMS, DP World port systems | High | High |
| Driver mobile app — step-by-step load order guidance | High | Medium |
| Historical load analytics dashboard + trend analysis | Medium | Medium |
| Predictive weight imbalance alerts before loading begins | Medium | Medium |

### Phase 3 — Platform Expansion *(6–12 months)*

| Enhancement | Priority | Complexity |
|---|---|---|
| Multi-warehouse route optimization (across facilities) | High | High |
| IoT weight sensor integration (smart pallet scales) | Medium | High |
| Carbon offset marketplace integration | Low | Medium |
| AI-assisted fleet dispatch recommendation | Medium | High |
| White-label SaaS offering for logistics providers | High | High |
| Customer-facing shipment visibility portal | Medium | Medium |

### Long-Term Vision

- **Autonomous load planning** — zero human input; AI plans, validates, and adjusts loads end-to-end
- **Digital twin integration** — full warehouse and fleet digital twin with LoadLink as the packing intelligence layer
- **Industry-standard Packing API** — become the container intelligence API that other logistics SaaS platforms plug into
- **Global carbon ledger** — aggregate emissions data across customers for regulatory reporting and industry benchmarking

---

## 📈 Impact & Business Case

The global logistics market is valued at **$9.6 trillion** (2023). Cargo space inefficiency costs the industry an estimated **$150–200 billion annually**. Growing carbon regulation in EU, India, and SE Asia creates additional urgency for emissions tooling.

### ROI for Customers

| Metric | Estimated Improvement |
|---|---|
| Cargo space utilization | +20–35% per shipment |
| Fuel cost reduction | 5–12% (fewer vehicles needed per load volume) |
| Loading / unloading labor time | −25–40% (correct sequence reduces handling) |
| Carbon emissions per ton-km | −8–15% |
| Cargo damage claims (fragile goods) | −30–50% (fragility constraints enforced at algorithm level) |

### Competitive Differentiation

Major competitors (Manhattan Associates, Oracle TMS, SAP EWM) offer route optimization and warehouse management. **None provide physical container-level 3D load planning with stop-sequence awareness and real-time CV validation.** That gap is LoadLink AI's core wedge.

---

## 📚 References

[1] Y. Zhang, J. Chen, and L. Wang, "3D bin packing with practical constraints," *Eur. J. Oper. Res.*, vol. 291, no. 3, pp. 927–946, 2021.

[2] G. Wascher, H. Haussner, and H. Schumann, "An improved typology of cutting and packing problems," *Eur. J. Oper. Res.*, vol. 183, no. 3, pp. 1109–1130, 2007.

[3] E. Hopper and B. Turton, "An empirical investigation of meta-heuristic and heuristic algorithms for a 2D and 3D bin packing problem," *Eur. J. Oper. Res.*, vol. 128, no. 1, pp. 34–57, 2001.

[4] DP World, "Logistics Innovation Report 2023," DP World Group, Dubai, 2023.

[5] McKinsey & Company, "Logistics automation: Opportunities for scale," McKinsey Global Institute, 2022.

---

## 👥 Team CoreCoders

| Member |
|---|
| Srushti Kotgire |
| Zahara Bohari |
| Kasturi Deo |
| Anushree Surve |
| Harshada Dhas |

Built with ❤️ for the **DP World National Hackathon**

---

<div align="center">

*Optimize the load. Protect the cargo. Cut the carbon.*

</div>
