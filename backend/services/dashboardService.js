/**
 * LoadLink AI — Dashboard Metrics Service
 * Aggregates real-time metrics from all modules.
 */

const { getAlertHistory } = require("./alertService");

// ── In-memory state (would be database in production) ─────────────
let state = {
  lastOptimization: null,
  lastScan: null,
  sessionStart: new Date().toISOString(),
  totalOptimizations: 0,
  totalScans: 0,
  totalAlerts: 0,
  totalCarbonSaved: 0,    // kg
  totalFuelSaved: 0,      // litres
  avgEfficiencyBefore: 0,
  avgEfficiencyAfter: 0,
  efficiencyHistory: [],   // last 20 optimization results
};

function updateFromOptimization(result) {
  state.totalOptimizations++;
  state.lastOptimization = {
    efficiency: result.efficiency,
    deadSpace: result.deadSpace,
    placedCount: result.placedCount,
    unplacedCount: result.unplacedCount,
    timestamp: new Date().toISOString(),
  };

  // Rolling average
  state.efficiencyHistory.push(result.efficiency);
  if (state.efficiencyHistory.length > 20) state.efficiencyHistory.shift();

  const sum = state.efficiencyHistory.reduce((a, b) => a + b, 0);
  state.avgEfficiencyAfter = Math.round(sum / state.efficiencyHistory.length);
  state.avgEfficiencyBefore = Math.max(0, state.avgEfficiencyAfter - 26);

  if (global.broadcast) {
    global.broadcast({ type: "METRICS_UPDATE", data: getDashboardMetrics() });
  }
}

function updateFromCarbon(carbonReport) {
  state.totalCarbonSaved += carbonReport.saved?.co2Kg || 0;
  state.totalFuelSaved   += carbonReport.saved?.fuelLitres || 0;
  state.totalCarbonSaved = Math.round(state.totalCarbonSaved * 100) / 100;
  state.totalFuelSaved   = Math.round(state.totalFuelSaved * 100) / 100;
}

function updateFromScan(scanResult) {
  state.totalScans++;
  state.lastScan = {
    utilization: scanResult.utilization,
    issuesFound: scanResult.issues?.length || 0,
    timestamp: new Date().toISOString(),
  };
  state.totalAlerts = getAlertHistory().length;
}

function getDashboardMetrics() {
  const alerts = getAlertHistory(5);
  const activeAlerts = alerts.filter((a) => !a.read && a.severity !== "low");

  const last = state.lastOptimization;

  return {
    summary: {
      efficiency:        last?.efficiency      || 0,
      deadSpace:         last?.deadSpace       || 0,
      placedItems:       last?.placedCount     || 0,
      unplacedItems:     last?.unplacedCount   || 0,
      carbonSavedKg:     state.totalCarbonSaved,
      fuelSavedL:        state.totalFuelSaved,
      activeAlerts:      activeAlerts.length,
      totalOptimizations:state.totalOptimizations,
      totalScans:        state.totalScans,
    },
    trends: {
      avgEfficiencyBefore: state.avgEfficiencyBefore,
      avgEfficiencyAfter:  state.avgEfficiencyAfter,
      efficiencyHistory:   state.efficiencyHistory,
      improvement:         state.avgEfficiencyAfter - state.avgEfficiencyBefore,
    },
    alerts: alerts.slice(0, 5),
    lastActivity: {
      optimization: state.lastOptimization,
      scan: state.lastScan,
    },
    uptime: Math.round((Date.now() - new Date(state.sessionStart)) / 1000),
  };
}

module.exports = { getDashboardMetrics, updateFromOptimization, updateFromCarbon, updateFromScan };
