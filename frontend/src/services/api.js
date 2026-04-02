/**
 * LoadLink AI — API Service
 * Wraps all backend REST calls with axios.
 */
import axios from "axios";

const http = axios.create({
  baseURL: "/api",
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

// Response interceptor — unwrap data
http.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const msg = err.response?.data?.error || err.message || "Unknown error";
    return Promise.reject(new Error(msg));
  }
);

// ── Optimize ────────────────────────────────────────────────────
export const optimizeLoad = (container, packages, options = {}) =>
  http.post("/optimize/load", { container, packages, options });

export const reverseOptimize = (container, items, deliveryStops = []) =>
  http.post("/optimize/reverse", { container, items, deliveryStops });

// ── Scan ────────────────────────────────────────────────────────
export const detectDeadspace = (payload) =>
  http.post("/scan/detect", payload);

// ── Dashboard ───────────────────────────────────────────────────
export const fetchMetrics = () => http.get("/dashboard/metrics");
export const fetchAlerts  = (limit = 20) => http.get(`/dashboard/alerts?limit=${limit}`);
export const markAlertRead = (id) => http.patch(`/dashboard/alerts/${id}/read`);
export const clearAllAlerts = () => http.delete("/dashboard/alerts");
export const fetchCarbonReport = (params = {}) =>
  http.get("/dashboard/carbon", { params });
