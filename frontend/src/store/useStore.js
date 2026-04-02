/**
 * LoadLink AI — Global Zustand Store
 */
import { create } from "zustand";

export const useStore = create((set, get) => ({
  // ── Navigation ──────────────────────────────────────────────
  activeTab: "dashboard",
  setActiveTab: (tab) => set({ activeTab: tab }),

  // ── WebSocket ───────────────────────────────────────────────
  wsStatus: "disconnected",
  setWsStatus: (wsStatus) => set({ wsStatus }),

  // ── Dashboard metrics ───────────────────────────────────────
  metrics: null,
  setMetrics: (metrics) => set({ metrics }),

  // ── Alerts ──────────────────────────────────────────────────
  alerts: [],
  addAlert: (alert) =>
    set((s) => ({
      alerts: [alert, ...s.alerts].slice(0, 50),
    })),
  clearAlerts: () => set({ alerts: [] }),
  markRead: (id) =>
    set((s) => ({
      alerts: s.alerts.map((a) => (a.id === id ? { ...a, read: true } : a)),
    })),

  // ── Optimization result ─────────────────────────────────────
  packResult: null,
  setPackResult: (packResult) => set({ packResult }),

  // ── Scan result ─────────────────────────────────────────────
  scanResult: null,
  setScanResult: (scanResult) => set({ scanResult }),

  // ── Reverse result ──────────────────────────────────────────
  reverseResult: null,
  setReverseResult: (reverseResult) => set({ reverseResult }),

  // ── Carbon report ───────────────────────────────────────────
  carbonReport: null,
  setCarbonReport: (carbonReport) => set({ carbonReport }),

  // ── UI state ────────────────────────────────────────────────
  loading: {},
  setLoading: (key, val) => set((s) => ({ loading: { ...s.loading, [key]: val } })),
  isLoading: (key) => get().loading[key] || false,
}));
