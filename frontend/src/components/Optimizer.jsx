import React, { useState } from "react";
import { useStore } from "../store/useStore";
import { optimizeLoad } from "../services/api";
import PackingViewer3D from "./PackingViewer3D";

const ITEM_COLORS = ["#00e5ff","#ffb800","#00e676","#a78bfa","#ff7043","#ff4d6d","#64748b","#06b6d4"];

const DEFAULT_CONTAINER = { width: 240, height: 160, depth: 600, maxWeight: 10000 };

const DEFAULT_PACKAGES = [
  { id:"p1", name:"Electronics Box",   width:60,  height:60,  depth:80,  weight:15, fragile:true,  priority:1 },
  { id:"p2", name:"Clothing Bundle",   width:80,  height:50,  depth:100, weight:8,  fragile:false, priority:2 },
  { id:"p3", name:"Machine Parts",     width:100, height:80,  depth:120, weight:45, fragile:false, priority:1 },
  { id:"p4", name:"Books Carton",      width:40,  height:40,  depth:60,  weight:20, fragile:false, priority:3 },
  { id:"p5", name:"Fragile Glassware", width:50,  height:70,  depth:50,  weight:6,  fragile:true,  priority:1 },
  { id:"p6", name:"Spare Parts Box",   width:70,  height:60,  depth:90,  weight:30, fragile:false, priority:2 },
];

const STANDARD_BOXES = [
  { name: "[Custom Box]", width: "", height: "", depth: "", weight: "", fragile: false, priority: 2 },
  { name: "Small Carton", width: 30, height: 30, depth: 30, weight: 5, fragile: false, priority: 3 },
  { name: "Medium Crate", width: 50, height: 40, depth: 40, weight: 15, fragile: false, priority: 2 },
  { name: "Large Pallet", width: 100, height: 100, depth: 100, weight: 80, fragile: false, priority: 2 },
  { name: "Fragile Electronics", width: 60, height: 40, depth: 40, weight: 10, fragile: true, priority: 1 },
];

const TRUCK_DIMENSIONS = {
  mini: { width: 180, height: 140, depth: 300, maxWeight: 3000 },
  medium: { width: 220, height: 150, depth: 450, maxWeight: 6000 },
  large: { width: 240, height: 160, depth: 600, maxWeight: 10000 },
  jumbo: { width: 260, height: 200, depth: 1200, maxWeight: 24000 },
};

function EfficiencyBar({ value, color, label }) {
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="font-mono text-xs" style={{ color: "rgba(238,242,255,0.4)" }}>{label}</span>
        <span className="font-mono text-xs font-medium" style={{ color }}>{value}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${value}%`, background: `linear-gradient(90deg, ${color}, ${color}80)` }} />
      </div>
    </div>
  );
}

export default function Optimizer() {
  const { setPackResult, setCarbonReport, setLoading, isLoading } = useStore();
  const [container, setContainer] = useState(DEFAULT_CONTAINER);
  const [packages, setPackages] = useState(DEFAULT_PACKAGES);
  const [result, setResult] = useState(null);
  const [options, setOptions] = useState({ truckType: "large", fuelType: "diesel", routeKey: "pune-mumbai" });
  const [newPkg, setNewPkg] = useState(STANDARD_BOXES[0]);
  const [pkgCount, setPkgCount] = useState(1);
  const busy = isLoading("optimize");

  const handleBoxSelect = (idx) => {
    setNewPkg({ ...STANDARD_BOXES[idx] });
  };

  const addPackage = () => {
    if (!newPkg.name || !newPkg.width || !newPkg.height || !newPkg.depth || !newPkg.weight) {
      alert("Missing Information: Please ensure all package dimensions and weight are filled out.");
      return;
    }
    
    // 1. Verify single package dimension is not intrinsically larger than the container
    const bDims = [Number(newPkg.width), Number(newPkg.height), Number(newPkg.depth)].sort((a,b)=>b-a);
    const cDims = [Number(container.width), Number(container.height), Number(container.depth)].sort((a,b)=>b-a);
    if (bDims[0] > cDims[0] || bDims[1] > cDims[1] || bDims[2] > cDims[2]) {
      alert(`Validation Warning: The box "${newPkg.name}" (${newPkg.width}x${newPkg.height}x${newPkg.depth}cm) is strictly larger than the container dimensions. It cannot possibly fit and will not be accepted.`);
      return;
    }

    const count = parseInt(pkgCount) || 1;
    
    // 2. Verify total weight constraint
    const currentWeight = packages.reduce((sum, p) => sum + p.weight, 0);
    const newAddedWeight = Number(newPkg.weight) * count;
    if (currentWeight + newAddedWeight > container.maxWeight) {
      alert(`Capacity Warning: Adding ${count}x "${newPkg.name}" would add ${newAddedWeight}kg, exceeding the total container max weight of ${container.maxWeight}kg (Currently at ${currentWeight}kg).`);
      return;
    }

    const newPackages = [];
    
    for (let i = 0; i < count; i++) {
        const pkg = {
          ...newPkg,
          id: `p${Date.now()}_${i}`,
          width: +newPkg.width, height: +newPkg.height,
          depth: +newPkg.depth, weight: +newPkg.weight,
          priority: +newPkg.priority,
          color: ITEM_COLORS[(packages.length + i) % ITEM_COLORS.length],
        };
        newPackages.push(pkg);
    }
    
    setPackages((p) => [...p, ...newPackages]);
    setNewPkg({ ...STANDARD_BOXES[0] });
    setPkgCount(1);
    setResult(null); // Clear optimized view because input changed
  };

  const removePackage = (id) => {
    setPackages((p) => p.filter((x) => x.id !== id));
    setResult(null); // Clear optimized view because input changed
  };

  const run = async () => {
    setLoading("optimize", true);
    try {
      const res = await optimizeLoad(container, packages, options);
      // Assign colors if missing
      res.packing.placed.forEach((it, i) => {
        if (!it.color) it.color = ITEM_COLORS[i % ITEM_COLORS.length];
      });
      setResult(res);
      setPackResult(res);
      if (res.carbon) setCarbonReport(res.carbon);
    } catch (e) {
      alert("Optimization error: " + e.message);
    } finally {
      setLoading("optimize", false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="fade-up">
        <div className="font-mono text-xs mb-2" style={{ color: "#00e5ff", letterSpacing: "0.13em" }}>— CORE MODULE</div>
        <h1 className="font-syne font-extrabold text-4xl tracking-tight mb-2">Load Optimizer</h1>
        <p style={{ color: "rgba(238,242,255,0.45)", fontSize: "0.95rem" }}>
          3D bin packing with priority, weight, and fragility constraints.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Container Config */}
        <div className="glass rounded-xl p-5">
          <div className="font-mono text-xs mb-4" style={{ color: "#00e5ff", letterSpacing: "0.1em" }}>CONTAINER SPECS</div>
          <div className="grid grid-cols-2 gap-3">
            {["width","height","depth"].map((k) => (
              <div key={k}>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "rgba(238,242,255,0.5)" }}>
                  {k.toUpperCase()} (cm)
                </label>
                <input type="number" value={container[k]}
                  onChange={(e) => { setContainer({ ...container, [k]: +e.target.value }); setResult(null); }}
                  className="w-full px-3 py-2 rounded-lg text-sm font-mono"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#eef2ff", outline: "none" }} />
              </div>
            ))}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "rgba(238,242,255,0.5)" }}>
                MAX WEIGHT (kg)
              </label>
              <input type="number" value={container.maxWeight}
                onChange={(e) => { setContainer({ ...container, maxWeight: +e.target.value }); setResult(null); }}
                className="w-full px-3 py-2 rounded-lg text-sm font-mono"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#eef2ff", outline: "none" }} />
            </div>
          </div>
          {/* Route options */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { k:"truckType", opts:["mini","medium","large","jumbo"], label:"TRUCK TYPE" },
              { k:"fuelType",  opts:["diesel","petrol","cng","electric"], label:"FUEL" },
              { k:"routeKey",  opts:["pune-mumbai","mumbai-delhi","bangalore-chennai","hyderabad-pune","delhi-jaipur"], label:"ROUTE" },
            ].map(({ k, opts, label }) => (
              <div key={k}>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "rgba(238,242,255,0.5)" }}>{label}</label>
                <select value={options[k]} onChange={(e) => {
                    const val = e.target.value;
                    setOptions({ ...options, [k]: val });
                    if (k === "truckType") setContainer(TRUCK_DIMENSIONS[val]);
                    setResult(null); // Clear 3D view because truck config changed
                  }}
                  className="w-full px-3 py-2 rounded-lg text-xs"
                  style={{ background: "#0e1424", border: "1px solid rgba(255,255,255,0.1)", color: "#eef2ff", outline: "none" }}>
                  {opts.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* Package list */}
        <div className="glass rounded-xl p-5">
          <div className="font-mono text-xs mb-4" style={{ color: "#ffb800", letterSpacing: "0.1em" }}>PACKAGES ({packages.length})</div>
          <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
            {packages.map((pkg, i) => (
              <div key={pkg.id} className="flex items-center gap-3 px-3 py-2 rounded-lg"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="w-3 h-3 rounded-sm flex-shrink-0"
                  style={{ background: pkg.color || ITEM_COLORS[i % ITEM_COLORS.length] }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{pkg.name}</div>
                  <div className="font-mono text-xs" style={{ color: "rgba(238,242,255,0.35)" }}>
                    {pkg.width}×{pkg.height}×{pkg.depth}cm · {pkg.weight}kg
                    {pkg.fragile && " · 🔴 FRAGILE"}
                    {" · P" + pkg.priority}
                  </div>
                </div>
                <button onClick={() => removePackage(pkg.id)}
                  className="text-xs px-2 py-1 rounded" style={{ color: "#ff4d6d", background: "rgba(255,77,109,0.08)" }}>✕</button>
              </div>
            ))}
          </div>
          {/* Add package form */}
          <div className="pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex justify-between items-center mb-3">
              <div className="font-mono text-xs" style={{ color: "rgba(238,242,255,0.3)" }}>ADD PACKAGE</div>
              <select onChange={(e) => handleBoxSelect(e.target.value)}
                className="px-2 py-1 rounded text-xs transition-colors hover:bg-opacity-20"
                style={{ background: "rgba(255,184,0,0.1)", border: "1px solid rgba(255,184,0,0.25)", color: "#ffb800", outline: "none", cursor: "pointer" }}>
                <option value="" disabled style={{display: 'none'}}>Choose standard box...</option>
                {STANDARD_BOXES.map((b, i) => (
                  <option key={i} value={i} style={{background: "#0e1424", color: "#eef2ff"}}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <input placeholder="Name" value={newPkg.name}
                onChange={(e) => setNewPkg({ ...newPkg, name: e.target.value })}
                className="px-2.5 py-2 rounded-lg text-sm col-span-2"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#eef2ff", outline: "none" }} />
              {["width","height","depth","weight"].map((k) => (
                <input key={k} type="number" placeholder={k}
                  value={newPkg[k]} onChange={(e) => setNewPkg({ ...newPkg, [k]: e.target.value })}
                  className="px-2.5 py-2 rounded-lg text-sm font-mono"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#eef2ff", outline: "none" }} />
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 mt-3">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={newPkg.fragile}
                    onChange={(e) => setNewPkg({ ...newPkg, fragile: e.target.checked })} />
                  <span style={{ color: "rgba(238,242,255,0.6)" }}>Fragile</span>
                </label>
                <select value={newPkg.priority} onChange={(e) => setNewPkg({ ...newPkg, priority: +e.target.value })}
                  className="px-2 py-1 rounded text-xs"
                  style={{ background: "#0e1424", border: "1px solid rgba(255,255,255,0.1)", color: "#eef2ff" }}>
                  <option value={1}>Priority 1 (High)</option>
                  <option value={2}>Priority 2 (Med)</option>
                  <option value={3}>Priority 3 (Low)</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: "rgba(238,242,255,0.5)" }}>QTY:</span>
                <input type="number" min="1" value={pkgCount} onChange={(e) => setPkgCount(e.target.value)}
                  className="px-2 py-1 w-16 rounded-lg text-sm font-mono text-center"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#eef2ff", outline: "none" }} />
              </div>
            </div>
            <button onClick={addPackage}
              className="w-full py-2 rounded-lg text-sm font-bold transition-all"
              style={{ background: "rgba(255,184,0,0.1)", border: "1px solid rgba(255,184,0,0.25)", color: "#ffb800" }}>
              + Add Package
            </button>
          </div>
        </div>
      </div>

      {/* Run button */}
      <div className="flex justify-center">
        <button onClick={run} disabled={busy}
          className="px-10 py-4 rounded-xl font-syne font-bold text-lg transition-all"
          style={{
            background: busy ? "rgba(0,229,255,0.1)" : "linear-gradient(135deg,#00c8e6,#00e5ff)",
            color: busy ? "#00e5ff" : "#030810",
            boxShadow: busy ? "none" : "0 4px 24px rgba(0,229,255,0.3)",
            cursor: busy ? "not-allowed" : "pointer",
          }}>
          {busy ? "⟳ Running AI Optimizer..." : "◈ Run 3D Optimization"}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-5 fade-up">
          {/* Metrics row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label:"EFFICIENCY",  v: result.packing.efficiency,   unit:"%",  color:"#00e5ff" },
              { label:"DEAD SPACE",  v: result.packing.deadSpace,    unit:"%",  color:"#ff4d6d" },
              { label:"PLACED",      v: result.packing.placedCount,  unit:"",   color:"#00e676" },
              { label:"WEIGHT USED", v: result.packing.weightUsed,   unit:"kg", color:"#ffb800" },
            ].map((m) => (
              <div key={m.label} className="glass rounded-xl p-4 text-center">
                <div className="font-syne font-extrabold text-3xl" style={{ color: m.color }}>{m.v}{m.unit}</div>
                <div className="font-mono text-xs mt-1" style={{ color: "rgba(238,242,255,0.35)", letterSpacing: "0.08em" }}>{m.label}</div>
              </div>
            ))}
          </div>

          {/* 3D Viewer */}
          <div className="glass rounded-xl p-4">
            <div className="font-mono text-xs mb-3" style={{ color: "#00e5ff", letterSpacing: "0.1em" }}>3D CONTAINER VIEW</div>
            <PackingViewer3D placed={result.packing.placed} container={container} label={`${result.packing.placedCount} items placed · ${result.packing.efficiency}% efficient`} />
          </div>

          {/* Efficiency bars */}
          <div className="glass rounded-xl p-5">
            <div className="font-mono text-xs mb-4" style={{ color: "#00e5ff", letterSpacing: "0.1em" }}>OPTIMIZATION BREAKDOWN</div>
            <div className="space-y-4">
              <EfficiencyBar value={62}                        color="#ff4d6d" label="Before Optimization" />
              <EfficiencyBar value={result.packing.efficiency} color="#00e5ff" label="After Optimization" />
              <EfficiencyBar value={75}                        color="#ffb800" label="Industry Average" />
            </div>
          </div>

          {/* Unplaced */}
          {result.packing.unplaced?.length > 0 && (
            <div className="rounded-xl p-4" style={{ background: "rgba(255,77,109,0.06)", border: "1px solid rgba(255,77,109,0.2)" }}>
              <div className="font-mono text-xs mb-3" style={{ color: "#ff4d6d", letterSpacing: "0.1em" }}>UNPLACED CAPACITY WARNINGS</div>
              <div className="space-y-2">
                {Object.values(result.packing.unplaced.reduce((acc, u) => {
                  const key = `${u.name}-${u.reason}`;
                  if (!acc[key]) acc[key] = { name: u.name, reason: u.reason, unplacedCount: 0 };
                  acc[key].unplacedCount++;
                  return acc;
                }, {})).map((group, idx) => {
                  const totalAttempted = packages.filter(p => p.name === group.name).length;
                  const placedCount = totalAttempted - group.unplacedCount;
                  return (
                    <div key={idx} className="flex flex-col sm:flex-row justify-between text-sm py-2 border-b border-red-500/10 last:border-0">
                      <div>
                        <span className="font-bold">{group.name}</span> 
                        <span className="text-xs ml-2 px-2 py-0.5 rounded-md" style={{ background: "rgba(255,77,109,0.15)", color: "#ff4d6d" }}>
                          {group.unplacedCount} Rejected
                        </span>
                      </div>
                      <span className="font-mono text-xs text-right mt-1 sm:mt-0" style={{ color: "#ff4d6d" }}>
                        {placedCount > 0 
                          ? `Only ${placedCount} out of ${totalAttempted} can be loaded. ${group.reason}` 
                          : `0 out of ${totalAttempted} loaded. ${group.reason}`
                        }
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI Suggestions */}
          {result.packing.deadSpace > 10 && (
            <div className="glass rounded-xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="font-mono text-xs" style={{ color: "#a78bfa", letterSpacing: "0.1em" }}>AI SUGGESTIONS</div>
                <div className="font-mono text-xs px-2.5 py-1 rounded-full"
                  style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)", color: "#a78bfa" }}>✦ SMART PACK</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { ico:"📐", title:"Stack small boxes vertically", desc:"Reduces floor footprint by ~34% and stabilises items above." },
                  { ico:"⚖️", title:"Redistribute medium boxes", desc:"Balance weight distribution, cutting fuel consumption ~8%." },
                  { ico:"↑",  title:"Utilise upper container space", desc:"Lightweight items shifted upward recover 26% unused volume." },
                ].map((s, i) => (
                  <div key={i} className="flex gap-3 p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <span className="text-lg flex-shrink-0">{s.ico}</span>
                    <div>
                      <div className="text-sm font-semibold mb-1">{s.title}</div>
                      <div className="text-xs" style={{ color: "rgba(238,242,255,0.45)" }}>{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
