/**
 * LoadLink AI — WebSocket Hook
 * Connects to backend WS, handles reconnection, and routes messages to Zustand store.
 */
import { useEffect, useRef, useCallback } from "react";
import { useStore } from "../store/useStore";

const WS_URL = "ws://localhost:4000/ws";
const RECONNECT_DELAY = 3000;

export function useWebSocket() {
  const wsRef = useRef(null);
  const reconnTimer = useRef(null);
  const { addAlert, setWsStatus, setMetrics } = useStore();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsStatus("connected");
      console.log("[WS] Connected to LoadLink AI backend");
      if (reconnTimer.current) { clearTimeout(reconnTimer.current); reconnTimer.current = null; }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleMessage(msg, { addAlert, setMetrics });
      } catch (e) {
        console.warn("[WS] Parse error:", e);
      }
    };

    ws.onclose = () => {
      setWsStatus("disconnected");
      console.warn("[WS] Disconnected — retrying in 3s");
      reconnTimer.current = setTimeout(connect, RECONNECT_DELAY);
    };

    ws.onerror = () => {
      setWsStatus("error");
      ws.close();
    };
  }, [addAlert, setWsStatus, setMetrics]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { send };
}

function handleMessage(msg, { addAlert, setMetrics }) {
  switch (msg.type) {
    case "ALERT":
      addAlert(msg.alert);
      break;
    case "METRICS_UPDATE":
      setMetrics(msg.data);
      break;
    case "OPTIMIZATION_COMPLETE":
      console.log("[WS] Optimization complete:", msg.data);
      break;
    case "SCAN_UPDATE":
      console.log("[WS] Scan update:", msg.data);
      break;
    default:
      break;
  }
}
