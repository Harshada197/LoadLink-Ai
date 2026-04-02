/**
 * LoadLink AI — Dashboard Controller
 */
const { getDashboardMetrics } = require("../services/dashboardService");
const { getAlertHistory, markRead, clearAlerts } = require("../services/alertService");
const { generateCarbonReport } = require("../services/carbonService");

async function getMetrics(req, res) {
  try {
    res.json({ success: true, data: getDashboardMetrics() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getAlerts(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 20;
    res.json({ success: true, alerts: getAlertHistory(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function readAlert(req, res) {
  try {
    const { id } = req.params;
    const alert = markRead(id);
    if (!alert) return res.status(404).json({ error: "Alert not found" });
    res.json({ success: true, alert });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function dismissAlerts(req, res) {
  try {
    clearAlerts();
    res.json({ success: true, message: "All alerts cleared" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getCarbonReport(req, res) {
  try {
    const params = req.query;
    const report = generateCarbonReport({
      truckType:          params.truckType || "large",
      fuelType:           params.fuelType  || "diesel",
      routeKey:           params.routeKey  || "pune-mumbai",
      beforeUtilization:  parseFloat(params.before) || 0.62,
      afterUtilization:   parseFloat(params.after)  || 0.88,
      tripsBeforeOpt:     parseInt(params.tripsBefore) || 2,
      tripsAfterOpt:      parseInt(params.tripsAfter)  || 1,
    });
    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getMetrics, getAlerts, readAlert, dismissAlerts, getCarbonReport };
