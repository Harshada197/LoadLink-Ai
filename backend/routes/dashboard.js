const express = require("express");
const router = express.Router();
const {
  getMetrics,
  getAlerts,
  readAlert,
  dismissAlerts,
  getCarbonReport,
} = require("../controllers/dashboardController");

router.get("/metrics",            getMetrics);
router.get("/alerts",             getAlerts);
router.patch("/alerts/:id/read",  readAlert);
router.delete("/alerts",          dismissAlerts);
router.get("/carbon",             getCarbonReport);

module.exports = router;
