import React, { useEffect } from "react";
import { useStore } from "./store/useStore";
import { useWebSocket } from "./hooks/useWebSocket";
import { fetchMetrics } from "./services/api";
import TopBar from "./components/TopBar";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import Optimizer from "./components/Optimizer";
import Scanner from "./components/Scanner";
import ReverseOpt from "./components/ReverseOpt";
import CarbonTracker from "./components/CarbonTracker";
import AlertsPanel from "./components/AlertsPanel";

const TABS = {
  dashboard: Dashboard,
  optimizer: Optimizer,
  scanner:   Scanner,
  reverse:   ReverseOpt,
  carbon:    CarbonTracker,
  alerts:    AlertsPanel,
};

export default function App() {
  const { activeTab, setMetrics } = useStore();
  const { send } = useWebSocket();

  // Poll dashboard metrics every 15s
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchMetrics();
        setMetrics(res.data);
      } catch (_) {}
    };
    load();
    const iv = setInterval(load, 15000);
    return () => clearInterval(iv);
  }, [setMetrics]);

  const ActiveComponent = TABS[activeTab] || Dashboard;

  return (
    <div className="min-h-screen bg-grid" style={{ background: "#07090f" }}>
      {/* Ambient orbs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-48 -left-48 w-[600px] h-[600px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(0,229,255,0.07) 0%, transparent 70%)", filter: "blur(80px)" }} />
        <div className="absolute -bottom-48 -right-24 w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(255,184,0,0.06) 0%, transparent 70%)", filter: "blur(80px)" }} />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <TopBar />
        <div className="flex flex-1" style={{ paddingTop: "58px" }}>
          <Sidebar />
          <main className="flex-1 overflow-y-auto" style={{ marginLeft: "220px" }}>
            <div className="p-8 max-w-7xl mx-auto">
              <ActiveComponent />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
