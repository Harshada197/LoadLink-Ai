import React, { useEffect, useState } from "react";
import { useStore } from "../store/useStore";
import { fetchMetrics } from "../services/api";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

function StatCard({ icon, label, value, unit, color, sub }) {
  return (
    <div className="glass rounded-xl p-5 fade-up" style={{ border: `1px solid ${color}22` }}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base"
          style={{ background: `${color}14` }}>{icon}</div>
        <span className="font-mono text-xs" style={{ color: "rgba(238,242,255,0.25)", letterSpacing: "0.07em" }}>{label}</span>
      </div>
      <div className="flex items-end gap-1">
        <span className="font-syne font-extrabold text-3xl tracking-tight" style={{ color }}>{value}</span>
        {unit && <span className="font-mono text-sm mb-1" style={{ color: "rgba(238,242,255,0.4)" }}>{unit}</span>}
      </div>
      {sub && <div className="text-xs mt-1" style={{ color: "rgba(238,242,255,0.35)" }}>{sub}</div>}
    </div>
  );
}

function AlertBadge({ alert }) {
  const colors = { low: "#00e676", medium: "#ffb800", high: "#ff4d6d", critical: "#ff4d6d" };
  const c = colors[alert.severity] || "#ffb800";
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg" style={{ background: `${c}08`, border: `1px solid ${c}20` }}>
      <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 pulse-dot" style={{ background: c }} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate" style={{ color: c }}>{alert.title}</div>
        <div className="text-xs mt-0.5 line-clamp-2" style={{ color: "rgba(238,242,255,0.45)" }}>{alert.description}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { metrics, alerts, setMetrics } = useStore();
  const [loading, setLoading] = useState(!metrics);

  useEffect(() => {
    fetchMetrics()
      .then((res) => { setMetrics(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [setMetrics]);

  const s = metrics?.summary || {};
  const t = metrics?.trends || {};
  const recentAlerts = alerts.slice(0, 5);

  // Build efficiency chart data
  const chartData = (t.efficiencyHistory || Array(8).fill(0)).map((v, i) => ({
    name: `#${i + 1}`, value: v || 0,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="fade-up">
        <div className="font-mono text-xs mb-2" style={{ color: "#00e5ff", letterSpacing: "0.13em" }}>
          — COMMAND CENTER
        </div>
        <h1 className="font-syne font-extrabold text-4xl tracking-tight mb-2">Dashboard</h1>
        <p style={{ color: "rgba(238,242,255,0.45)", fontSize: "0.95rem" }}>
          Real-time logistics intelligence across all modules.
        </p>
      </div>

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="glass rounded-xl p-5 h-28 animate-pulse" style={{ background: "rgba(255,255,255,0.03)" }} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon="◈" label="EFFICIENCY"     value={s.efficiency || 0}            unit="%"     color="#00e5ff" sub="After optimization" />
          <StatCard icon="◻" label="DEAD SPACE"     value={s.deadSpace || 0}             unit="%"     color="#ff4d6d" sub="Unused container space" />
          <StatCard icon="●" label="ITEMS PLACED"   value={s.placedItems || 0}           unit=""      color="#00e676" sub={`${s.unplacedItems || 0} unplaced`} />
          <StatCard icon="⚡" label="ACTIVE ALERTS"  value={s.activeAlerts || 0}          unit=""      color="#ffb800" sub="Unresolved issues" />
          <StatCard icon="◉" label="CO₂ SAVED"       value={s.carbonSavedKg || 0}         unit="kg"    color="#00e676" sub="This session" />
          <StatCard icon="⛽" label="FUEL SAVED"     value={s.fuelSavedL || 0}            unit="L"     color="#a78bfa" sub="Estimated savings" />
          <StatCard icon="↻" label="OPTIMIZATIONS"  value={s.totalOptimizations || 0}    unit=""      color="#00e5ff" sub="Total this session" />
          <StatCard icon="⊙" label="CV SCANS"        value={s.totalScans || 0}            unit=""      color="#ff7043" sub="Camera analyses" />
        </div>
      )}

      {/* Charts + Alerts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Efficiency trend */}
        <div className="glass rounded-xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-mono text-xs mb-1" style={{ color: "#00e5ff", letterSpacing: "0.1em" }}>EFFICIENCY TREND</div>
              <div className="font-syne font-bold text-lg">Optimization History</div>
            </div>
            <div className="text-right">
              <div className="font-syne font-extrabold text-2xl" style={{ color: "#00e676" }}>
                +{t.improvement || 0}%
              </div>
              <div className="font-mono text-xs" style={{ color: "rgba(238,242,255,0.35)" }}>AVG GAIN</div>
            </div>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="name" stroke="rgba(238,242,255,0.15)" tick={{ fontSize: 10, fill: "rgba(238,242,255,0.3)", fontFamily: "DM Mono" }} />
                <YAxis domain={[0, 100]} stroke="rgba(238,242,255,0.15)" tick={{ fontSize: 10, fill: "rgba(238,242,255,0.3)", fontFamily: "DM Mono" }} />
                <Tooltip
                  contentStyle={{ background: "#0f1525", border: "1px solid rgba(0,229,255,0.2)", borderRadius: 8, fontFamily: "DM Mono", fontSize: 12 }}
                  labelStyle={{ color: "#00e5ff" }}
                  itemStyle={{ color: "#00e676" }}
                />
                <Line type="monotone" dataKey="value" stroke="#00e5ff" strokeWidth={2}
                  dot={{ fill: "#00e5ff", r: 3 }} activeDot={{ r: 5, fill: "#00e676" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-6 mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            <div>
              <div className="font-mono text-xs mb-1" style={{ color: "rgba(238,242,255,0.3)", letterSpacing: "0.07em" }}>AVG BEFORE</div>
              <div className="font-syne font-bold text-xl" style={{ color: "#ff4d6d" }}>{t.avgEfficiencyBefore || 0}%</div>
            </div>
            <div>
              <div className="font-mono text-xs mb-1" style={{ color: "rgba(238,242,255,0.3)", letterSpacing: "0.07em" }}>AVG AFTER</div>
              <div className="font-syne font-bold text-xl" style={{ color: "#00e676" }}>{t.avgEfficiencyAfter || 0}%</div>
            </div>
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="glass rounded-xl p-5">
          <div className="font-mono text-xs mb-1" style={{ color: "#ff4d6d", letterSpacing: "0.1em" }}>LIVE ALERTS</div>
          <div className="font-syne font-bold text-lg mb-4">Recent Activity</div>
          {recentAlerts.length === 0 ? (
            <div className="text-center py-8" style={{ color: "rgba(238,242,255,0.25)" }}>
              <div className="text-3xl mb-2">✓</div>
              <div className="text-sm">No active alerts</div>
            </div>
          ) : (
            <div className="space-y-2">
              {recentAlerts.map((a) => <AlertBadge key={a.id} alert={a} />)}
            </div>
          )}
        </div>
      </div>

      {/* Industry benchmarks */}
      <div className="glass rounded-xl p-5">
        <div className="font-mono text-xs mb-4" style={{ color: "#a78bfa", letterSpacing: "0.1em" }}>INDUSTRY BENCHMARKS</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: "Industry Avg Utilization", your: s.efficiency || 0, bench: 74, unit: "%", color: "#00e5ff" },
            { label: "CO₂ per trip (kg)", your: "19.2", bench: "28.4", unit: "kg", color: "#00e676" },
            { label: "Damage Rate", your: "0.8%", bench: "2.3%", unit: "", color: "#a78bfa" },
            { label: "Unload Time (min)", your: 22, bench: 48, unit: "min", color: "#ffb800" },
          ].map((b, i) => (
            <div key={i}>
              <div className="text-xs mb-2" style={{ color: "rgba(238,242,255,0.4)" }}>{b.label}</div>
              <div className="flex items-end gap-3">
                <div>
                  <div className="font-syne font-extrabold text-xl" style={{ color: b.color }}>{b.your}{b.unit}</div>
                  <div className="font-mono text-xs" style={{ color: "rgba(238,242,255,0.3)" }}>LoadLink AI</div>
                </div>
                <div className="mb-1">
                  <div className="text-sm" style={{ color: "rgba(238,242,255,0.4)" }}>{b.bench}{b.unit}</div>
                  <div className="font-mono text-xs" style={{ color: "rgba(238,242,255,0.2)" }}>Industry</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
