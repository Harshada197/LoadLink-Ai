import React from "react";
import { useStore } from "../store/useStore";
import { markAlertRead, clearAllAlerts } from "../services/api";

const SEVERITY_CONFIG = {
  low:      { color: "#00e676", bg: "rgba(0,230,118,0.08)",  border: "rgba(0,230,118,0.2)",  label: "LOW" },
  medium:   { color: "#ffb800", bg: "rgba(255,184,0,0.08)",  border: "rgba(255,184,0,0.2)",  label: "MED" },
  high:     { color: "#ff4d6d", bg: "rgba(255,77,109,0.08)", border: "rgba(255,77,109,0.2)", label: "HIGH" },
  critical: { color: "#ff4d6d", bg: "rgba(255,77,109,0.12)", border: "rgba(255,77,109,0.3)", label: "CRIT" },
};

const TYPE_ICONS = {
  DEAD_SPACE:        "◻",
  FRAGILE_VIOLATION: "⚠️",
  WEIGHT_IMBALANCE:  "⚖️",
  INEFFICIENT_STACK: "📦",
  REARRANGEMENT:     "↺",
  WEIGHT_LIMIT:      "🏋️",
  OPTIMIZED:         "✓",
  INFO:              "ℹ️",
};

function AlertCard({ alert, onRead }) {
  const cfg = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.medium;
  const icon = TYPE_ICONS[alert.type] || "⚡";
  const time = new Date(alert.timestamp).toLocaleTimeString();

  return (
    <div className={`p-4 rounded-xl transition-all ${alert.read ? "opacity-50" : ""}`}
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      <div className="flex items-start gap-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
          style={{ background: `${cfg.color}18`, fontSize: 16 }}>{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="font-semibold text-sm" style={{ color: cfg.color }}>{alert.title}</div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="font-mono text-xs px-1.5 py-0.5 rounded-full"
                style={{ background: `${cfg.color}18`, color: cfg.color, fontSize: "0.6rem" }}>
                {cfg.label}
              </span>
              {!alert.read && (
                <button onClick={() => onRead(alert.id)}
                  className="font-mono text-xs px-2 py-0.5 rounded transition-all"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(238,242,255,0.4)" }}>
                  Mark read
                </button>
              )}
            </div>
          </div>
          <p className="text-sm" style={{ color: "rgba(238,242,255,0.55)", lineHeight: 1.55 }}>{alert.description}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="font-mono text-xs" style={{ color: "rgba(238,242,255,0.25)" }}>{time}</span>
            {alert.type && (
              <span className="font-mono text-xs" style={{ color: "rgba(238,242,255,0.2)", letterSpacing: "0.07em" }}>
                {alert.type.replace(/_/g," ")}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AlertsPanel() {
  const { alerts, markRead, clearAlerts } = useStore();

  const handleRead = async (id) => {
    markRead(id);
    try { await markAlertRead(id); } catch (_) {}
  };

  const handleClearAll = async () => {
    clearAlerts();
    try { await clearAllAlerts(); } catch (_) {}
  };

  const grouped = {
    critical: alerts.filter((a) => a.severity === "critical"),
    high:     alerts.filter((a) => a.severity === "high"),
    medium:   alerts.filter((a) => a.severity === "medium"),
    low:      alerts.filter((a) => a.severity === "low"),
  };

  const unread = alerts.filter((a) => !a.read).length;

  return (
    <div className="space-y-6">
      <div className="fade-up flex items-start justify-between">
        <div>
          <div className="font-mono text-xs mb-2" style={{ color: "#ff4d6d", letterSpacing: "0.13em" }}>— REAL-TIME MONITORING</div>
          <h1 className="font-syne font-extrabold text-4xl tracking-tight mb-2">Alerts</h1>
          <p style={{ color: "rgba(238,242,255,0.45)", fontSize: "0.95rem" }}>
            Live packing violations, efficiency warnings, and optimization suggestions.
          </p>
        </div>
        {alerts.length > 0 && (
          <button onClick={handleClearAll}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all mt-2"
            style={{ background: "rgba(255,77,109,0.08)", border: "1px solid rgba(255,77,109,0.2)", color: "#ff4d6d" }}>
            Clear All
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label:"CRITICAL", count: grouped.critical.length, color: "#ff4d6d" },
          { label:"HIGH",     count: grouped.high.length,     color: "#ff7043" },
          { label:"MEDIUM",   count: grouped.medium.length,   color: "#ffb800" },
          { label:"LOW",      count: grouped.low.length,      color: "#00e676" },
        ].map((s) => (
          <div key={s.label} className="glass rounded-xl p-4 text-center">
            <div className="font-syne font-extrabold text-3xl mb-1" style={{ color: s.color }}>{s.count}</div>
            <div className="font-mono text-xs" style={{ color: "rgba(238,242,255,0.35)", letterSpacing: "0.09em" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {alerts.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center fade-up">
          <div className="text-5xl mb-4">✓</div>
          <div className="font-syne font-bold text-xl mb-2">All Clear</div>
          <div style={{ color: "rgba(238,242,255,0.4)" }}>
            No active alerts. Run an optimization or scan to generate insights.
          </div>
        </div>
      ) : (
        <div className="space-y-3 fade-up">
          {unread > 0 && (
            <div className="font-mono text-xs px-1" style={{ color: "rgba(238,242,255,0.3)" }}>
              {unread} unread · {alerts.length} total
            </div>
          )}
          {alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} onRead={handleRead} />
          ))}
        </div>
      )}
    </div>
  );
}
