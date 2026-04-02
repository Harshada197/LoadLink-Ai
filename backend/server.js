/**
 * LoadLink AI — Main Server
 * Express + WebSocket server for real-time logistics optimization
 */

const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const cors = require("cors");
const path = require("path");

// Route imports
const optimizeRoutes = require("./routes/optimize");
const scanRoutes = require("./routes/scan");
const dashboardRoutes = require("./routes/dashboard");

const { AlertService } = require("./services/alertService");

const app = express();
const server = http.createServer(app);

// ── WebSocket Server ──────────────────────────────────────────────
const wss = new WebSocket.Server({ server, path: "/ws" });

// Store connected clients globally so services can broadcast
global.wsClients = new Set();

wss.on("connection", (ws, req) => {
  console.log(`[WS] Client connected. Total: ${wss.clients.size}`);
  global.wsClients.add(ws);

  // Send welcome/status message
  ws.send(
    JSON.stringify({
      type: "CONNECTED",
      message: "LoadLink AI WebSocket active",
      timestamp: new Date().toISOString(),
    })
  );

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());
      // Client can request a metrics refresh
      if (msg.type === "REQUEST_METRICS") {
        const { getDashboardMetrics } = require("./services/dashboardService");
        ws.send(JSON.stringify({ type: "METRICS_UPDATE", data: getDashboardMetrics() }));
      }
    } catch (e) {
      console.error("[WS] Message parse error:", e.message);
    }
  });

  ws.on("close", () => {
    global.wsClients.delete(ws);
    console.log(`[WS] Client disconnected. Total: ${wss.clients.size}`);
  });

  ws.on("error", (err) => {
    console.error("[WS] Error:", err.message);
    global.wsClients.delete(ws);
  });
});

// ── Broadcast helper (used by services) ──────────────────────────
global.broadcast = (payload) => {
  const data = JSON.stringify(payload);
  global.wsClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
};

// ── Middleware ────────────────────────────────────────────────────
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── API Routes ────────────────────────────────────────────────────
app.use("/api/optimize", optimizeRoutes);
app.use("/api/scan", scanRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "LoadLink AI Backend",
    version: "1.0.0",
    wsClients: global.wsClients.size,
    uptime: process.uptime(),
  });
});

// ── 404 handler ───────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ── Error handler ─────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("[ERROR]", err.stack);
  res.status(500).json({ error: err.message || "Internal server error" });
});

// ── Start ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`\n🚛 LoadLink AI Backend running`);
  console.log(`   REST  → http://localhost:${PORT}/api`);
  console.log(`   WS    → ws://localhost:${PORT}/ws`);
  console.log(`   Env   → ${process.env.NODE_ENV || "development"}\n`);
});

module.exports = { app, server, wss };
