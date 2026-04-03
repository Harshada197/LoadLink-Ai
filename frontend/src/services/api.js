/**
 * LoadLink AI — API Service
 */
import axios from "axios";

// Default backend (your original system)
const http = axios.create({
  baseURL: "/api",
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

// Response interceptor
http.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const msg = err.response?.data?.error || err.message || "Unknown error";
    return Promise.reject(new Error(msg));
  }
);

// ── Optimize ───────────────────────────────────
export const optimizeLoad = (container, packages, options = {}) =>
  http.post("/optimize/load", { container, packages, options });

export const reverseOptimize = (container, items, deliveryStops = []) =>
  http.post("/optimize/reverse", { container, items, deliveryStops });

// ── Scan ───────────────────────────────────────
export const detectDeadspace = (payload) =>
  http.post("/scan/detect", payload);

// ── Dashboard (YOLO INTEGRATION) ───────────────

// 🔥 THIS is your AI backend
export const fetchMetrics = async () => {
  try {
    const res = await axios.get("http://127.0.0.1:5000/data");

    return {
      data: {
        efficiency: res.data.efficiency,
        volume: res.data.volume,
        objects: res.data.objects,
        barcodes: res.data.barcodes,
        a4_measurements: res.data.a4_measurements
      }
    };
  } catch (err) {
    console.error("YOLO API error:", err);

    return {
      data: {
        efficiency: 0,
        volume: 0,
        objects: [],
        barcodes: [],
        a4_measurements: []
      }
    };
  }
};

// ── Alerts (KEEP THESE) ────────────────────────
export const fetchAlerts = (limit = 20) =>
  http.get(`/dashboard/alerts?limit=${limit}`);

export const markAlertRead = (id) =>
  http.patch(`/dashboard/alerts/${id}/read`);

export const clearAllAlerts = () =>
  http.delete("/dashboard/alerts");

// ── Carbon (KEEP THIS) ─────────────────────────
export const fetchCarbonReport = (params = {}) =>
  http.get("/dashboard/carbon", { params });