# LoadLink AI - Full-Stack Logistics Optimization Platform

## Quick Start

### Backend
  cd backend && npm install && npm run dev
  → REST: http://localhost:4000/api
  → WS:   ws://localhost:4000/ws

### Frontend
  cd frontend && npm install && npm run dev
  → http://localhost:3000

## API Endpoints
  POST /api/optimize/load       3D bin packing
  POST /api/optimize/reverse    LIFO reverse optimization
  POST /api/scan/detect         Dead-space CV detection
  GET  /api/dashboard/metrics   KPI aggregation
  GET  /api/dashboard/alerts    Alert history
  GET  /api/dashboard/carbon    Carbon report

## WebSocket Events (ws://localhost:4000/ws)
  ALERT                Real-time packing violation
  METRICS_UPDATE       Dashboard refresh
  OPTIMIZATION_COMPLETE Packing done
  SCAN_UPDATE          CV scan frame result

## Tech Stack
  Backend:  Node.js + Express + ws (WebSocket)
  Frontend: React 18 + Vite + Tailwind + Three.js + Zustand + Recharts
  Algorithm: 3D Extreme-Points bin packing + LIFO delivery sequencing
