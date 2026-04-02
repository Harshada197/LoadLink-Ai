import React, { useState, useEffect, useRef } from "react";
import { useStore } from "../store/useStore";
import { fetchCarbonReport } from "../services/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

function RingGauge({ value, max, color, label, size = 90 }) {
  const r = 32, cx = size/2, cy = size/2;
  const circ = 2 * Math.PI * r;
  const dash = (value / max) * circ;
  const ringRef = useRef(null);

  useEffect(() => {
    if (!ringRef.current) return;
    ringRef.current.style.transition = "stroke-dashoffset 1.5s cubic-bezier(0.16,1,0.3,1) 0.3s";
    ringRef.current.style.strokeDashoffset = circ - dash;
  }, [dash, circ]);

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
        <circle ref={ringRef} cx={cx} cy={cy} r={r} fill="none"
          stroke={color} strokeWidth={6} strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          strokeDasharray={circ} strokeDashoffset={circ}
        />
        <text x={cx} y={cy - 6} textAnchor="middle" fill={color}
          style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: 14 }}>{value}</text>
        <text x={cx} y={cy + 8} textAnchor="middle" fill="rgba(238,242,255,0.3)"
          style={{ fontFamily: "DM Mono,monospace", fontSize: 8 }}>kg CO₂</text>
      </svg>
      <div className="font-mono text-xs mt-1" style={{ color: "rgba(238,242,255,0.3)", letterSpacing: "0.07em" }}>{label}</div>
    </div>
  );
}

function AnimBar({ pct, color, delay = 0 }) {
  const fillRef = useRef(null);
  useEffect(() => {
    const t = setTimeout(() => {
      if (fillRef.current) fillRef.current.style.width = pct + "%";
    }, delay);
    return () => clearTimeout(t);
  }, [pct, delay]);
  return (
    <div className="h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
      <div ref={fillRef} className="h-full rounded-full transition-all duration-1200"
        style={{ width: 0, background: `linear-gradient(90deg, ${color}, ${color}70)` }} />
    </div>
  );
}

export default function CarbonTracker() {
  const { carbonReport, setCarbonReport } = useStore();
  const [params, setParams] = useState({ truckType:"large", fuelType:"diesel", routeKey:"pune-mumbai" });
  const [report, setReport] = useState(carbonReport);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!report) loadReport();
  }, []);

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await fetchCarbonReport({ ...params, before: 0.62, after: 0.88 });
      setReport(res.report); setCarbonReport(res.report);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const barData = report ? [
    { name: "Before AI",     co2: report.total.before,  fill: "#ff4d6d" },
    { name: "After AI",      co2: report.total.after,   fill: "#00e676" },
    { name: "Industry Avg",  co2: 28.4,                 fill: "#ffb800" },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="fade-up">
        <div className="font-mono text-xs mb-2" style={{ color: "#00e676", letterSpacing: "0.13em" }}>— SUSTAINABILITY</div>
        <h1 className="font-syne font-extrabold text-4xl tracking-tight mb-2">Carbon Efficiency Tracker</h1>
        <p style={{ color: "rgba(238,242,255,0.45)", fontSize: "0.95rem" }}>
          Quantify environmental impact. See how AI packing reduces your CO₂ footprint per trip.
        </p>
      </div>

      {/* Controls */}
      <div className="glass rounded-xl p-5">
        <div className="font-mono text-xs mb-4" style={{ color: "#00e676", letterSpacing: "0.1em" }}>TRIP PARAMETERS</div>
        <div className="flex flex-wrap gap-4 items-end">
          {[
            { k:"truckType", opts:["mini","medium","large","jumbo"],                                label:"Truck Type" },
            { k:"fuelType",  opts:["diesel","petrol","cng","electric"],                            label:"Fuel Type" },
            { k:"routeKey",  opts:["pune-mumbai","mumbai-delhi","bangalore-chennai","delhi-jaipur"],label:"Route" },
          ].map(({ k, opts, label }) => (
            <div key={k}>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "rgba(238,242,255,0.4)" }}>{label.toUpperCase()}</label>
              <select value={params[k]} onChange={(e) => setParams({ ...params, [k]: e.target.value })}
                className="px-3 py-2 rounded-lg text-sm"
                style={{ background: "#0e1424", border: "1px solid rgba(255,255,255,0.1)", color: "#eef2ff", outline: "none" }}>
                {opts.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
          <button onClick={loadReport} disabled={loading}
            className="px-5 py-2 rounded-lg text-sm font-bold transition-all"
            style={{ background: "linear-gradient(135deg,#059669,#00e676)", color: "#030810",
              boxShadow: "0 4px 16px rgba(0,230,118,0.25)", cursor: loading ? "wait" : "pointer" }}>
            {loading ? "⟳ Calculating..." : "◉ Calculate Carbon"}
          </button>
        </div>
      </div>

      {report && (
        <div className="space-y-5 fade-up">
          {/* Hero banner */}
          <div className="rounded-xl p-6 flex flex-wrap items-center justify-between gap-6"
            style={{ background: "linear-gradient(145deg,rgba(0,230,118,0.06) 0%,rgba(167,139,250,0.04) 100%)", border: "1px solid rgba(0,230,118,0.15)" }}>
            <div>
              <div className="font-mono text-xs mb-2" style={{ color: "#00e676", letterSpacing: "0.1em" }}>TRIP SAVINGS</div>
              <div className="font-syne font-extrabold text-5xl tracking-tight" style={{ color: "#00e676" }}>
                {report.saved.co2Kg} kg
              </div>
              <div className="font-syne font-bold text-lg mt-1">CO₂ Saved This Trip</div>
              <div className="text-sm mt-2" style={{ color: "rgba(238,242,255,0.5)" }}>
                Equivalent to planting <strong style={{ color: "#00e676" }}>{report.saved.treesEquiv} trees</strong> or
                driving <strong style={{ color: "#00e676" }}>{report.saved.carKmEquiv} fewer km</strong> in a diesel car.
              </div>
            </div>
            <div className="flex items-center gap-5">
              <RingGauge value={report.total.before} max={50} color="#ff4d6d" label="BEFORE" />
              <div className="text-2xl" style={{ color: "rgba(238,242,255,0.3)" }}>→</div>
              <RingGauge value={report.total.after}  max={50} color="#00e676" label="AFTER" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label:"Fuel Saved",   v: report.saved.fuelLitres + "L",         color:"#ffb800" },
                { label:"Cost Saved",   v: "₹"+report.saved.fuelCostINR,          color:"#00e5ff" },
                { label:"Savings %",    v: report.saved.pct + "%",                color:"#00e676" },
                { label:"Annual (fleet)",v: report.annual.savedTonnes + "t CO₂",  color:"#a78bfa" },
              ].map((m) => (
                <div key={m.label} className="text-center p-3 rounded-lg" style={{ background: "rgba(0,0,0,0.2)" }}>
                  <div className="font-syne font-extrabold text-xl" style={{ color: m.color }}>{m.v}</div>
                  <div className="font-mono text-xs" style={{ color: "rgba(238,242,255,0.3)", letterSpacing: "0.06em" }}>{m.label.toUpperCase()}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Chart + Bars */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="glass rounded-xl p-5">
              <div className="font-mono text-xs mb-4" style={{ color: "#00e676", letterSpacing: "0.1em" }}>EMISSIONS COMPARISON</div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} barCategoryGap="35%">
                    <XAxis dataKey="name" stroke="transparent" tick={{ fontSize: 11, fill: "rgba(238,242,255,0.4)", fontFamily: "DM Mono" }} />
                    <YAxis stroke="transparent" tick={{ fontSize: 10, fill: "rgba(238,242,255,0.3)", fontFamily: "DM Mono" }} />
                    <Tooltip
                      contentStyle={{ background: "#0f1525", border: "1px solid rgba(0,230,118,0.2)", borderRadius: 8, fontFamily: "DM Mono", fontSize: 12 }}
                      formatter={(v) => [v + " kg CO₂", "Emissions"]}
                    />
                    <Bar dataKey="co2" radius={[4,4,0,0]}>
                      {barData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass rounded-xl p-5">
              <div className="font-mono text-xs mb-5" style={{ color: "#00e676", letterSpacing: "0.1em" }}>EMISSION BARS</div>
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-sm">Before Optimization</span>
                    <span className="font-mono text-sm" style={{ color: "#ff4d6d" }}>{report.total.before} kg CO₂</span>
                  </div>
                  <AnimBar pct={85}  color="#ff4d6d" delay={100} />
                </div>
                <div>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-sm">After Optimization</span>
                    <span className="font-mono text-sm" style={{ color: "#00e676" }}>{report.total.after} kg CO₂</span>
                  </div>
                  <AnimBar pct={Math.round(report.total.after / 50 * 100)} color="#00e676" delay={250} />
                </div>
                <div>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-sm">Industry Average</span>
                    <span className="font-mono text-sm" style={{ color: "#ffb800" }}>28.4 kg CO₂</span>
                  </div>
                  <AnimBar pct={77} color="#ffb800" delay={400} />
                </div>
              </div>
            </div>
          </div>

          {/* Breakdown table */}
          <div className="glass rounded-xl p-5">
            <div className="font-mono text-xs mb-4" style={{ color: "#00e676", letterSpacing: "0.1em" }}>EMISSION FACTOR BREAKDOWN</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(report.breakdown).map(([k, v]) => (
                <div key={k} className="p-4 rounded-lg" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="text-sm" style={{ color: "rgba(238,242,255,0.45)", marginBottom: 8 }}>
                    {{ fuelBurn:"⛽ Fuel Burn", idleEmissions:"💨 Idle Emissions", weightImpact:"🏋️ Weight Impact", tripCount:"🔢 Trip Count" }[k]}
                  </div>
                  <div className="font-mono text-sm" style={{ color: "#ff4d6d", textDecoration: "line-through", opacity: 0.7 }}>{v.before} {v.unit}</div>
                  <div className="font-mono text-sm font-medium" style={{ color: "#00e676" }}>{v.after} {v.unit}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Annual projection */}
          <div className="rounded-xl p-5" style={{ background: "rgba(0,230,118,0.06)", border: "1px solid rgba(0,230,118,0.12)" }}>
            <div className="font-mono text-xs mb-4" style={{ color: "#00e676", letterSpacing: "0.1em" }}>ANNUAL FLEET PROJECTION (20 TRUCKS)</div>
            <div className="grid grid-cols-3 gap-5">
              <div>
                <div className="font-syne font-extrabold text-3xl" style={{ color: "#00e676" }}>{report.annual.savedTonnes}t</div>
                <div className="text-sm mt-1" style={{ color: "rgba(238,242,255,0.45)" }}>CO₂ saved annually</div>
              </div>
              <div>
                <div className="font-syne font-extrabold text-3xl" style={{ color: "#00e5ff" }}>₹{(report.annual.carbonCreditsINR/1000).toFixed(1)}k</div>
                <div className="text-sm mt-1" style={{ color: "rgba(238,242,255,0.45)" }}>Carbon credit value</div>
              </div>
              <div>
                <div className="font-syne font-extrabold text-3xl" style={{ color: "#a78bfa" }}>{Math.round(report.annual.savedKg / 21.7)}</div>
                <div className="text-sm mt-1" style={{ color: "rgba(238,242,255,0.45)" }}>Equivalent trees planted</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
