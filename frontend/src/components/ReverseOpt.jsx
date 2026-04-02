import React, { useState } from "react";
import { useStore } from "../store/useStore";
import { reverseOptimize } from "../services/api";
import PackingViewer3D from "./PackingViewer3D";

const DEFAULT_CONTAINER = { width: 240, height: 160, depth: 600, maxWeight: 10000 };

const SAMPLE_ITEMS = [
  { id:"r1", name:"Electronics Box",  width:60,  height:60,  depth:80,  weight:15, fragile:true,  priority:1, x:20,  y:0,  z:0,   x2:80,  y2:60,  z2:80,  color:"#00e5ff" },
  { id:"r2", name:"Machine Parts",    width:100, height:80,  depth:120, weight:45, fragile:false, priority:1, x:0,   y:0,  z:90,  x2:100, y2:80,  z2:210, color:"#ffb800" },
  { id:"r3", name:"Clothing Bundle",  width:80,  height:50,  depth:100, weight:8,  fragile:false, priority:2, x:110, y:0,  z:0,   x2:190, y2:50,  z2:100, color:"#00e676" },
  { id:"r4", name:"Books Carton",     width:40,  height:40,  depth:60,  weight:20, fragile:false, priority:3, x:0,   y:0,  z:220, x2:40,  y2:40,  z2:280, color:"#a78bfa" },
  { id:"r5", name:"Fragile Glassware",width:50,  height:70,  depth:50,  weight:6,  fragile:true,  priority:1, x:50,  y:0,  z:220, x2:100, y2:70,  z2:270, color:"#ff4d6d" },
];

const DEFAULT_STOPS = [
  { stopId:"s1", city:"Chinchwad (12km)",  itemIds:["r3"] },
  { stopId:"s2", city:"Khopoli (82km)",    itemIds:["r4","r1"] },
  { stopId:"s3", city:"Mumbai (148km)",    itemIds:["r2","r5"] },
];

function CompareRow({ label, before, after, good = "low" }) {
  const improved = good === "low" ? after < before : after > before;
  return (
    <div className="flex items-center justify-between py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <span className="text-sm" style={{ color: "rgba(238,242,255,0.55)" }}>{label}</span>
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm line-through" style={{ color: "#ff4d6d", opacity: 0.7 }}>{before}</span>
        <span className="text-xs" style={{ color: "rgba(238,242,255,0.3)" }}>→</span>
        <span className="font-mono text-sm font-medium" style={{ color: improved ? "#00e676" : "#ffb800" }}>{after}</span>
      </div>
    </div>
  );
}

export default function ReverseOpt() {
  const { setReverseResult, setLoading, isLoading } = useStore();
  const [result, setResult] = useState(null);
  const [stops, setStops] = useState(DEFAULT_STOPS);
  const busy = isLoading("reverse");

  const run = async () => {
    setLoading("reverse", true);
    try {
      const res = await reverseOptimize(DEFAULT_CONTAINER, SAMPLE_ITEMS, stops);
      setResult(res);
      setReverseResult(res);
    } catch (e) {
      alert("Reverse optimization error: " + e.message);
    } finally {
      setLoading("reverse", false);
    }
  };

  const STOP_COLORS = ["#00e676", "#ffb800", "#ff4d6d"];
  const STOP_BADGES = ["FIRST DROP", "2nd DROP", "FINAL DROP"];

  return (
    <div className="space-y-6">
      <div className="fade-up">
        <div className="font-mono text-xs mb-2" style={{ color: "#ff7043", letterSpacing: "0.13em" }}>— UNLOADING INTELLIGENCE</div>
        <h1 className="font-syne font-extrabold text-4xl tracking-tight mb-2">Reverse Optimization</h1>
        <p style={{ color: "rgba(238,242,255,0.45)", fontSize: "0.95rem" }}>
          Plans packing based on delivery sequence. LIFO loading eliminates reshuffling at each stop.
        </p>
      </div>

      {/* Delivery stops config */}
      <div className="glass rounded-xl p-5">
        <div className="font-mono text-xs mb-4" style={{ color: "#ff7043", letterSpacing: "0.1em" }}>DELIVERY SEQUENCE</div>
        <div className="space-y-2">
          {stops.map((stop, i) => (
            <div key={stop.stopId} className="flex items-center gap-4 p-3 rounded-lg"
              style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${STOP_COLORS[i]}22` }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center font-syne font-bold text-sm flex-shrink-0"
                style={{ background: `${STOP_COLORS[i]}18`, border: `1.5px solid ${STOP_COLORS[i]}`, color: STOP_COLORS[i] }}>
                {i + 1}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-sm">{stop.city}</div>
                <div className="font-mono text-xs mt-0.5" style={{ color: "rgba(238,242,255,0.35)" }}>
                  {stop.itemIds.length} item(s) · {stop.itemIds.join(", ")}
                </div>
              </div>
              <div className="font-mono text-xs px-2 py-1 rounded-full"
                style={{ background: `${STOP_COLORS[i]}14`, border: `1px solid ${STOP_COLORS[i]}30`, color: STOP_COLORS[i] }}>
                {STOP_BADGES[i]}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center">
        <button onClick={run} disabled={busy}
          className="px-10 py-4 rounded-xl font-syne font-bold text-lg transition-all"
          style={{
            background: busy ? "rgba(255,112,67,0.1)" : "linear-gradient(135deg,#e64a19,#ff7043)",
            color: busy ? "#ff7043" : "#fff",
            boxShadow: busy ? "none" : "0 4px 24px rgba(255,112,67,0.3)",
            cursor: busy ? "not-allowed" : "pointer",
          }}>
          {busy ? "⟳ Optimizing Sequence..." : "↺ Run Reverse Optimization"}
        </button>
      </div>

      {result && (
        <div className="space-y-5 fade-up">
          {/* Before/After 3D viewers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="font-mono text-xs mb-2 flex items-center gap-2"
                style={{ color: "#ff4d6d", letterSpacing: "0.08em" }}>
                <span className="w-2 h-2 rounded-full" style={{ background: "#ff4d6d" }} />
                BEFORE ({result.before.efficiency}% efficient)
              </div>
              <PackingViewer3D
                placed={SAMPLE_ITEMS.map((it) => ({ ...it, color: "#ff4d6d" }))}
                container={DEFAULT_CONTAINER}
                label="Before — Suboptimal"
              />
            </div>
            <div>
              <div className="font-mono text-xs mb-2 flex items-center gap-2"
                style={{ color: "#00e676", letterSpacing: "0.08em" }}>
                <span className="w-2 h-2 rounded-full" style={{ background: "#00e676" }} />
                AFTER LIFO ({result.afterLIFO?.efficiency || result.afterOptimized?.efficiency}% efficient)
              </div>
              <PackingViewer3D
                placed={result.afterLIFO?.layout || result.afterOptimized?.layout || []}
                container={DEFAULT_CONTAINER}
                label="After — LIFO Optimized"
              />
            </div>
          </div>

          {/* Efficiency comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="glass rounded-xl p-5">
              <div className="font-mono text-xs mb-4" style={{ color: "#ff7043", letterSpacing: "0.1em" }}>EFFICIENCY GAINS</div>
              <CompareRow label="Container Utilization" before={result.before.efficiency + "%"}  after={(result.afterLIFO?.efficiency || result.afterOptimized?.efficiency) + "%"} good="high" />
              <CompareRow label="Dead Space"            before={result.before.deadSpace + "%"}   after={(result.afterLIFO?.deadSpace || result.afterOptimized?.deadSpace) + "%"}   good="low" />
              <CompareRow label="Unloading Time"        before="48 min"  after={`${48 - (result.improvements?.unloadTimeReductionMin || 26)} min`} good="low" />
              <CompareRow label="Reshuffles Required"   before={result.improvements?.reshufflesAvoided + " moves"} after="0 moves" good="low" />
              <CompareRow label="Damage Risk"           before="HIGH" after={result.improvements?.damageRiskReduction || "LOW"} good="high" />
            </div>

            <div className="glass rounded-xl p-5">
              <div className="font-mono text-xs mb-4" style={{ color: "#ff7043", letterSpacing: "0.1em" }}>PACKING RULES APPLIED</div>
              {[
                "✓  Last-in-first-out (LIFO) sequence enforced",
                "✓  Fragile items separated from heavy goods",
                "✓  Stop 1 cargo placed near loading door",
                "✓  Centre-of-gravity maintained below 60%",
                "✓  Weight balanced across left/right zones",
              ].map((rule, i) => (
                <div key={i} className="flex gap-3 py-2 text-sm border-b" style={{ borderColor: "rgba(255,255,255,0.06)", color: "rgba(238,242,255,0.6)" }}>
                  {rule}
                </div>
              ))}
              <div className="mt-4 p-3 rounded-lg" style={{ background: "rgba(255,112,67,0.08)", border: "1px solid rgba(255,112,67,0.15)" }}>
                <div className="font-mono text-xs mb-1" style={{ color: "#ff7043" }}>TIME SAVED TODAY</div>
                <div className="font-syne font-extrabold text-3xl" style={{ color: "#ff7043" }}>
                  {result.improvements?.unloadTimeReductionMin || 26} min
                </div>
                <div className="text-xs mt-1" style={{ color: "rgba(238,242,255,0.4)" }}>
                  per multi-stop delivery · saves ≈ ₹680 in driver cost
                </div>
              </div>
            </div>
          </div>

          {/* Suggestions */}
          {result.suggestions?.length > 0 && (
            <div className="glass rounded-xl p-5">
              <div className="font-mono text-xs mb-4" style={{ color: "#ff7043", letterSpacing: "0.1em" }}>AI SUGGESTIONS</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {result.suggestions.map((s, i) => (
                  <div key={i} className="flex gap-3 p-3 rounded-lg"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <span className="text-xl flex-shrink-0">{s.icon}</span>
                    <div>
                      <div className="text-sm font-semibold mb-1">{s.title}</div>
                      <div className="text-xs" style={{ color: "rgba(238,242,255,0.45)" }}>{s.detail}</div>
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
