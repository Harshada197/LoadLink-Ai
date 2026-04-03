import React, { useState, useEffect } from "react";
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
  mini:   { width: 200, height: 210, depth: 320,  maxWeight: 5000  }, 
  medium: { width: 240, height: 240, depth: 620,  maxWeight: 12000 }, 
  large:  { width: 245, height: 260, depth: 1250, maxWeight: 24000 }, 
  jumbo:  { width: 250, height: 280, depth: 1850, maxWeight: 40000 }, 
};

const CITIES = ["Pune", "Mumbai", "Bangalore", "Delhi", "Hyderabad", "Chennai", "Kolkata", "Ahmedabad", "Nashik", "Surat"];

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
  const { setPackResult, setLoading, isLoading } = useStore();
  
  // -- Route --
  const [route, setRoute] = useState({ source: "Pune", destination: "Mumbai", stops: [] });
  
  // -- Truck & Containers --
  const [truckType, setTruckType] = useState("large");
  const [numContainers, setNumContainers] = useState(1);
  const [containerBus, setContainerBus] = useState({ width: 230, height: 230, depth: 580, maxWeight: 5000 });
  
  // -- Packages & Selection --
  const [activeContainerIndex, setActiveContainerIndex] = useState(0);
  const [packagesData, setPackagesData] = useState({ truck: DEFAULT_PACKAGES }); 
  
  const [globalResult, setGlobalResult] = useState(null); // Truck view
  const [localResult, setLocalResult] = useState(null);   // Selected container view
  
  const [options, setOptions] = useState({ fuelType: "diesel" });
  const [newPkg, setNewPkg] = useState(STANDARD_BOXES[0]);
  
  const busy = isLoading("optimize");

  // Initializing or updating containers when numContainers changes
  useEffect(() => {
    if (numContainers > 0) {
      setPackagesData(prev => {
        const newData = { ...prev };
        for (let i = 0; i < numContainers; i++) {
          if (!newData[i]) newData[i] = [];
        }
        return newData;
      });
    } else {
       setActiveContainerIndex(0);
    }
  }, [numContainers]);

  const addStop = () => setRoute(r => ({ ...r, stops: [...r.stops, ""] }));
  const updateStop = (val, idx) => setRoute(r => {
    const s = [...r.stops];
    s[idx] = val;
    return { ...r, stops: s };
  });
  const removeStop = (idx) => setRoute(r => ({ ...r, stops: r.stops.filter((_, i) => i !== idx) }));

  const currentPackages = numContainers === 0 ? (packagesData.truck || []) : (packagesData[activeContainerIndex] || []);

  const addPackage = () => {
    if (!newPkg.name || !newPkg.width || !newPkg.height || !newPkg.depth || !newPkg.weight) {
      alert("Missing Information");
      return;
    }
    const newPkgItem = {
      ...newPkg,
      id: `p${Date.now()}`,
      width: +newPkg.width, height: +newPkg.height,
      depth: +newPkg.depth, weight: +newPkg.weight,
      color: ITEM_COLORS[(currentPackages.length) % ITEM_COLORS.length],
    };
    setPackagesData(prev => ({
      ...prev,
      [numContainers === 0 ? "truck" : activeContainerIndex]: [...(prev[numContainers === 0 ? "truck" : activeContainerIndex] || []), newPkgItem]
    }));
  };

  const removePackage = (id) => {
    setPackagesData(prev => ({
      ...prev,
      [numContainers === 0 ? "truck" : activeContainerIndex]: prev[numContainers === 0 ? "truck" : activeContainerIndex].filter(p => p.id !== id)
    }));
  };

  const runOptimization = async () => {
    setLoading("optimize", true);
    try {
      const truckDim = TRUCK_DIMENSIONS[truckType];
      
      if (numContainers > 0) {
        const containerItems = [];
        let activeContainerRes = null;

        for (let i = 0; i < numContainers; i++) {
          const pkgs = packagesData[i] || [];
          const res = await optimizeLoad(containerBus, pkgs, options);
          
          if (i === activeContainerIndex) activeContainerRes = res;

          containerItems.push({
            ...containerBus,
            id: `container_${i}`,
            name: `Container ${i+1}`,
            weight: res.packing.weightUsed || 0,
            color: ITEM_COLORS[i % ITEM_COLORS.length],
            isContainer: true
          });
        }
        
        const truckRes = await optimizeLoad(truckDim, containerItems, options);
        setGlobalResult(truckRes);
        setLocalResult(activeContainerRes);
        setPackResult(truckRes);
      } else {
        const res = await optimizeLoad(truckDim, packagesData.truck || [], options);
        setGlobalResult(res);
        setLocalResult(null);
        setPackResult(res);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading("optimize", false);
    }
  };

  useEffect(() => {
    runOptimization();
  }, [truckType, numContainers, containerBus, packagesData, activeContainerIndex]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 min-h-screen pb-12 fade-up">
      {/* Sidebar Controls (4 cols) */}
      <div className="xl:col-span-4 space-y-6">
        <div className="px-2">
          <div className="font-mono text-[10px] text-cyan-400 mb-1 tracking-[0.25em] font-bold uppercase">— CORE ENGINE v2</div>
          <h1 className="font-syne font-extrabold text-3xl tracking-tight leading-none mb-2">Simulate Load</h1>
          <p className="text-[12px] text-white/30 font-medium leading-relaxed">Hierarchical 3D packing simulation for multi-modal logistics.</p>
        </div>

        {/* Route Card */}
        <div className="glass rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
             <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_var(--cyan)]" />
             <span className="text-[10px] font-mono font-bold text-white/50 tracking-widest uppercase">Route Mapping</span>
          </div>
          <div className="space-y-3">
             <div className="relative">
                <span className="absolute left-3 top-3 text-cyan-400/40 text-[10px]">📍</span>
                <select value={route.source} onChange={e => setRoute({...route, source: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 pl-8 text-sm outline-none focus:border-cyan-400/40 appearance-none cursor-pointer">
                   {CITIES.map(c => <option key={c}>{c}</option>)}
                </select>
             </div>
             {route.stops.map((stop, i) => (
                <div key={i} className="flex gap-2 group relative">
                   <span className="absolute left-3 top-3 text-amber-400/40 text-[10px]">⊙</span>
                   <select value={stop} onChange={e => updateStop(e.target.value, i)} className="flex-1 bg-white/5 border border-white/10 rounded-xl p-2.5 pl-8 text-sm outline-none focus:border-cyan-400/40 appearance-none cursor-pointer">
                      <option value="">Select Stop...</option>
                      {CITIES.map(c => <option key={c}>{c}</option>)}
                   </select>
                   <button onClick={() => removeStop(i)} className="text-red-400/30 hover:text-red-400 transition-colors px-2 text-xs">✕</button>
                </div>
             ))}
             <button onClick={addStop} className="w-full py-2 border border-dashed border-cyan-400/20 rounded-xl text-[10px] text-cyan-400 font-mono hover:bg-cyan-400/5 transition-all uppercase tracking-tighter">
                + Add Intermediate Hub
             </button>
             <div className="relative">
                <span className="absolute left-3 top-3 text-green-400/40 text-[10px]">🏁</span>
                <select value={route.destination} onChange={e => setRoute({...route, destination: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 pl-8 text-sm outline-none focus:border-cyan-400/40 appearance-none cursor-pointer">
                   {CITIES.map(c => <option key={c}>{c}</option>)}
                </select>
             </div>
          </div>
        </div>

        {/* Vehicle Selection */}
        <div className="glass rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
             <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_var(--amber)]" />
             <span className="text-[10px] font-mono font-bold text-white/50 tracking-widest uppercase">Vehicle Details</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(TRUCK_DIMENSIONS).map(([type, d]) => (
              <button key={type} onClick={() => setTruckType(type)}
                className={`card-v2 ${truckType === type ? "selected" : ""}`}>
                <div className="text-[11px] font-bold uppercase mb-0.5">{type}</div>
                <div className="text-[9px] text-white/30 font-mono italic">{d.width}x{d.height}x{d.depth}</div>
              </button>
            ))}
          </div>
          <div className="pt-2">
             <label className="text-[10px] text-white/30 block mb-2 font-mono tracking-widest uppercase">Container Units</label>
             <div className="flex items-center gap-3">
                <button onClick={() => setNumContainers(Math.max(0, numContainers-1))} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-400/40 transition-all text-xl text-white/40">−</button>
                <div className="flex-1 h-10 bg-cyan-400/10 border border-cyan-400/30 rounded-xl flex items-center justify-center font-syne font-black text-xl text-cyan-400">{numContainers}</div>
                <button onClick={() => setNumContainers(Math.min(6, numContainers+1))} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-400/40 transition-all text-xl text-white/40">+</button>
             </div>
          </div>
        </div>

        {/* Cargo Management */}
        <div className="glass rounded-2xl p-6 flex flex-col max-h-[500px]">
          <div className="flex items-center gap-2 mb-4">
             <div className="w-1.5 h-1.5 rounded-full bg-violet-400 shadow-[0_0_8px_var(--violet)]" />
             <span className="text-[10px] font-mono font-bold text-white/50 tracking-widest uppercase">Cargo Loadout</span>
          </div>
          
          {numContainers > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-4 mb-2 custom-scrollbar">
              {[...Array(numContainers)].map((_, i) => (
                <button key={i} onClick={() => setActiveContainerIndex(i)}
                  className={`px-3 py-2 rounded-xl text-[10px] whitespace-nowrap transition-all border font-bold ${activeContainerIndex === i ? "bg-violet-400 text-black border-violet-400 shadow-[0_0_15px_rgba(167,139,250,0.3)]" : "bg-white/5 text-white/40 border-white/5 hover:border-white/20"}`}>
                  CONT {i+1}
                </button>
              ))}
            </div>
          )}

          <div className="bg-white/3 border border-white/5 rounded-2xl p-4 space-y-3 mb-4">
            <div className="flex justify-between items-center text-[9px] font-mono text-white/20 uppercase tracking-widest">
              <span>Quick Add</span>
              <select onChange={(e) => setNewPkg(STANDARD_BOXES[e.target.value])} className="bg-transparent border-none text-violet-400 outline-none cursor-pointer">
                <option value="" disabled>Presets...</option>
                {STANDARD_BOXES.map((b, i) => <option key={i} value={i}>{b.name}</option>)}
              </select>
            </div>
            <input placeholder="Item Label" value={newPkg.name} onChange={e => setNewPkg({...newPkg, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs outline-none focus:border-violet-400/30 transition-all" />
            <div className="grid grid-cols-4 gap-2">
              {["width","height","depth","weight"].map(k => (
                <div key={k} className="space-y-1">
                  <div className="text-[7px] text-white/20 font-bold uppercase">{k}</div>
                  <input type="number" value={newPkg[k]} onChange={e => setNewPkg({...newPkg, [k]: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg p-1.5 text-[10px] outline-none font-mono" />
                </div>
              ))}
            </div>
            <button onClick={addPackage} className="w-full py-3 bg-violet-400 text-black text-[11px] font-black rounded-xl hover:shadow-[0_0_20px_rgba(167,139,250,0.4)] transition-all uppercase tracking-tighter">
              Commit To {numContainers > 0 ? `Container ${activeContainerIndex + 1}` : "Truck"}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
            {currentPackages.map(pkg => (
              <div key={pkg.id} className="flex items-center gap-3 bg-white/3 border border-white/5 rounded-xl p-2.5 group hover:bg-white/5 transition-colors">
                <div className="w-2 h-2 rounded-full" style={{ background: pkg.color }} />
                <div className="flex-1 text-[11px] font-medium truncate">{pkg.name}</div>
                <div className="text-[9px] text-white/30 font-mono tracking-tighter">{pkg.width}×{pkg.height}×{pkg.depth} cm</div>
                <button onClick={() => removePackage(pkg.id)} className="text-red-400/10 group-hover:text-red-400 transition-colors px-1 text-sm">✕</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Simulators Area (8 cols) */}
      <div className="xl:col-span-8 space-y-6">
        
        {/* Route Strip */}
        <div className="glass rounded-[1.5rem] p-4 flex items-center justify-between shadow-xl overflow-hidden relative">
           <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
           <div className="flex items-center gap-6 overflow-x-auto whitespace-nowrap custom-scrollbar">
              <div className="flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_var(--cyan)]" />
                 <span className="text-sm font-syne font-bold text-white/90">{route.source}</span>
              </div>
              {route.stops.map((s, i) => s && (
                 <React.Fragment key={i}>
                    <span className="text-white/10 font-mono text-xs">→</span>
                    <div className="flex items-center gap-3">
                       <div className="w-2 h-2 rounded-full bg-amber-400" />
                       <span className="text-sm font-syne font-bold text-white/60">{s}</span>
                    </div>
                 </React.Fragment>
              ))}
              <span className="text-white/10 font-mono text-xs">→</span>
              <div className="flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-green-400" />
                 <span className="text-sm font-syne font-bold text-white/90">{route.destination}</span>
              </div>
           </div>
           <div className="pl-6 border-l border-white/10 ml-6 hidden md:block">
              <div className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest font-bold">Logistics Hub Status</div>
              <div className="text-xs font-mono text-white/40 uppercase">Calculating Capacity...</div>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[calc(100vh-250px)]">
           {/* Global Fleet View */}
           <div className="glass rounded-[2rem] flex flex-col relative overflow-hidden group border-b-4 border-cyan-400/20">
              <div className="p-6 pb-2">
                 <div className="font-mono text-[9px] text-cyan-400 tracking-[0.4em] font-bold uppercase mb-1">Global Fleet View</div>
                 <h3 className="font-syne font-extrabold text-xl text-white/90 italic uppercase">Vehicle Loadout</h3>
              </div>
              
              <div className="flex-1 bg-[#07090f] relative mt-2">
                 <PackingViewer3D 
                    container={TRUCK_DIMENSIONS[truckType]}
                    placed={globalResult?.packing?.placed || []}
                  />
              </div>

              {/* Stats Bar V2 */}
              <div className="stats-bar">
                 <div className="stat-item">
                    <div className="text-[8px] text-white/20 font-bold mb-0.5 font-mono uppercase tracking-widest">Efficiency</div>
                    <div className="text-lg font-syne font-extrabold text-cyan-400">{globalResult?.packing?.efficiency || 0}%</div>
                 </div>
                 <div className="stat-item">
                    <div className="text-[8px] text-white/20 font-bold mb-0.5 font-mono uppercase tracking-widest">Entities</div>
                    <div className="text-lg font-syne font-extrabold text-white">{globalResult?.packing?.placedCount || 0}</div>
                 </div>
                 <div className="stat-item">
                    <div className="text-[8px] text-white/20 font-bold mb-0.5 font-mono uppercase tracking-widest">Total kg</div>
                    <div className="text-lg font-syne font-extrabold text-amber-500">{globalResult?.packing?.weightUsed || 0}</div>
                 </div>
              </div>
           </div>

           {/* Local Cargo View */}
           <div className="glass rounded-[2rem] flex flex-col relative overflow-hidden group border-b-4 border-violet-400/20">
              <div className="p-6 pb-2">
                 <div className="font-mono text-[9px] text-violet-400 tracking-[0.4em] font-bold uppercase mb-1">Local Cargo View</div>
                 <h3 className="font-syne font-extrabold text-xl text-white/90 italic uppercase">
                    {numContainers > 0 ? `Container ${activeContainerIndex + 1}` : "Indirect Unit"}
                 </h3>
              </div>
              
              <div className="flex-1 bg-[#07090f] relative mt-2 flex flex-col">
                 {numContainers > 0 ? (
                    <PackingViewer3D 
                      container={containerBus}
                      placed={localResult?.packing?.placed || []}
                    />
                 ) : (
                    <div className="flex-1 flex items-center justify-center flex-col opacity-10">
                       <span className="text-6xl mb-4">⊙</span>
                       <span className="text-[10px] font-mono uppercase tracking-[0.4em]">Unit Bypassed</span>
                    </div>
                 )}
              </div>

              {/* Stats Bar V2 Local */}
              <div className="stats-bar border-violet-400/10">
                 <div className="stat-item">
                    <div className="text-[8px] text-white/20 font-bold mb-0.5 font-mono uppercase tracking-widest">Local Eff.</div>
                    <div className="text-lg font-syne font-extrabold text-violet-400">{localResult?.packing?.efficiency || 0}%</div>
                 </div>
                 <div className="stat-item">
                    <div className="text-[8px] text-white/20 font-bold mb-0.5 font-mono uppercase tracking-widest">Dead Space</div>
                    <div className="text-lg font-syne font-extrabold text-red-500">{localResult ? 100 - localResult.packing.efficiency : 100}%</div>
                 </div>
                 <div className="stat-item">
                    <div className="text-[8px] text-white/20 font-bold mb-0.5 font-mono uppercase tracking-widest">KG Used</div>
                    <div className="text-lg font-syne font-extrabold text-white">{localResult?.packing?.weightUsed || 0}</div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}


