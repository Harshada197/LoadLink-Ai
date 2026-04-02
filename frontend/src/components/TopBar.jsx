import React from "react";
import { useStore } from "../store/useStore";

const STATUS_COLORS = {
  connected:    { dot: "#00e676", label: "CONNECTED" },
  disconnected: { dot: "#ff4d6d", label: "OFFLINE" },
  error:        { dot: "#ffb800", label: "ERROR" },
};

export default function TopBar() {
  const { wsStatus, alerts } = useStore();
  const status = STATUS_COLORS[wsStatus] || STATUS_COLORS.disconnected;
  const unread = alerts.filter((a) => !a.read && a.severity !== "low").length;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-7"
      style={{ height: 58, background: "rgba(7,9,15,0.9)", borderBottom: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(18px)" }}>

      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
          style={{ background: "linear-gradient(135deg,#00c8e6,#ffb800)" }}>🔗</div>
        <span className="font-syne font-extrabold text-lg tracking-tight">
          Load<span style={{ color: "#00e5ff" }}>Link</span> <span style={{ color: "rgba(238,242,255,0.5)", fontSize: "0.8rem", fontWeight: 600 }}>AI</span>
        </span>
      </div>

      {/* Center badge */}
      <div className="font-mono text-xs px-3 py-1 rounded-full"
        style={{ background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)", color: "#00e5ff", letterSpacing: "0.1em" }}>
        ● LOGISTICS COMMAND CENTER
      </div>

      {/* Right */}
      <div className="flex items-center gap-5">
        {unread > 0 && (
          <div className="flex items-center gap-2 font-mono text-xs px-2.5 py-1 rounded-full"
            style={{ background: "rgba(255,77,109,0.1)", border: "1px solid rgba(255,77,109,0.25)", color: "#ff4d6d" }}>
            <span className="pulse-dot w-1.5 h-1.5 rounded-full" style={{ background: "#ff4d6d" }} />
            {unread} ALERT{unread > 1 ? "S" : ""}
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full pulse-dot" style={{ background: status.dot }} />
          <span className="font-mono text-xs" style={{ color: "rgba(238,242,255,0.35)", letterSpacing: "0.08em" }}>
            WS {status.label}
          </span>
        </div>
      </div>
    </header>
  );
}
