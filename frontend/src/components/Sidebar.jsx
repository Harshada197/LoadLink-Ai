import React from "react";
import { useStore } from "../store/useStore";

const NAV = [
  { id: "dashboard", icon: "⊞",  label: "Dashboard",      accent: "#00e5ff" },
  { id: "optimizer", icon: "◈",  label: "Load Optimizer",  accent: "#00e5ff" },
  { id: "scanner",   icon: "⊙",  label: "SmartLoad Vision",accent: "#a78bfa" },
  { id: "reverse",   icon: "↺",  label: "Reverse Optim.",  accent: "#ff7043" },
  { id: "carbon",    icon: "◉",  label: "Carbon Tracker",  accent: "#00e676" },
  { id: "alerts",    icon: "⚡",  label: "Alerts",          accent: "#ff4d6d" },
];

export default function Sidebar() {
  const { activeTab, setActiveTab, alerts } = useStore();
  const unreadAlerts = alerts.filter((a) => !a.read).length;

  return (
    <aside className="fixed top-0 left-0 z-40 flex flex-col py-6"
      style={{
        width: 220, top: 58, bottom: 0,
        background: "rgba(11,15,26,0.95)",
        borderRight: "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(18px)",
      }}>

      <div className="font-mono text-xs px-5 mb-3 mt-2"
        style={{ color: "rgba(238,242,255,0.2)", letterSpacing: "0.13em" }}>MODULES</div>

      <nav className="flex flex-col gap-0.5 flex-1">
        {NAV.map((item) => {
          const active = activeTab === item.id;
          return (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className="flex items-center gap-3 px-5 py-2.5 text-left transition-all duration-200"
              style={{
                borderLeft: `2px solid ${active ? item.accent : "transparent"}`,
                background: active ? `${item.accent}12` : "transparent",
                color: active ? item.accent : "rgba(238,242,255,0.5)",
                fontSize: "0.84rem", fontWeight: 600,
              }}>
              <span className="w-7 h-7 rounded-md flex items-center justify-center text-sm flex-shrink-0"
                style={{ background: active ? `${item.accent}18` : "rgba(255,255,255,0.05)" }}>
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
              {item.id === "alerts" && unreadAlerts > 0 && (
                <span className="font-mono text-xs px-1.5 py-0.5 rounded-full"
                  style={{ background: "rgba(255,77,109,0.15)", color: "#ff4d6d", fontSize: "0.6rem" }}>
                  {unreadAlerts}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Version badge */}
      <div className="px-5 pb-2">
        <div className="font-mono text-xs p-3 rounded-lg"
          style={{ background: "rgba(0,229,255,0.04)", border: "1px solid rgba(0,229,255,0.1)", color: "rgba(238,242,255,0.25)" }}>
          <div style={{ color: "#00e5ff", fontSize: "0.6rem", letterSpacing: "0.1em", marginBottom: 4 }}>ENGINE</div>
          LoadLink AI v1.0<br/>3D Bin Pack · LIFO · CV
        </div>
      </div>
    </aside>
  );
}
