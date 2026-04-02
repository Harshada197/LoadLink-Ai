/**
 * LoadLink AI — Optimize Controller
 * Handles POST /api/optimize/load and POST /api/optimize/reverse
 */

const { pack3D, analyzeDeadSpace } = require("../services/packingEngine");
const { analyzeAndAlert } = require("../services/alertService");
const { generateCarbonReport, estimateTripsNeeded } = require("../services/carbonService");
const { reverseOptimize } = require("../services/reverseOptimizer");
const { updateFromOptimization, updateFromCarbon } = require("../services/dashboardService");

/**
 * POST /api/optimize/load
 * Body: { container, packages, options }
 */
async function optimizeLoad(req, res) {
  try {
    const { container, packages, options = {} } = req.body;

    // ── Validation ─────────────────────────────────────────────
    if (!container || !packages || !Array.isArray(packages)) {
      return res.status(400).json({ error: "container and packages[] are required" });
    }
    if (!container.width || !container.height || !container.depth) {
      return res.status(400).json({ error: "container must have width, height, depth" });
    }
    if (packages.length === 0) {
      return res.status(400).json({ error: "packages array cannot be empty" });
    }

    // Ensure each package has required fields
    for (const pkg of packages) {
      if (!pkg.id || !pkg.width || !pkg.height || !pkg.depth || pkg.weight == null) {
        return res.status(400).json({
          error: `Package missing required fields (id, width, height, depth, weight): ${JSON.stringify(pkg)}`,
        });
      }
    }

    // ── Run Packing Algorithm ──────────────────────────────────
    const packResult = pack3D(container, packages);

    // ── Analyze Dead Space ────────────────────────────────────
    const deadSpaceAnalysis = analyzeDeadSpace(container, packResult.placed);

    // ── Generate Alerts ───────────────────────────────────────
    const alerts = analyzeAndAlert(packResult, container);

    // ── Carbon Calculation ────────────────────────────────────
    const totalCargoVol = packages.reduce(
      (s, p) => s + p.width * p.height * p.depth, 0
    );
    const containerVol = container.width * container.height * container.depth;
    const tripsBeforeOpt = estimateTripsNeeded(totalCargoVol, containerVol, 0.62);
    const tripsAfterOpt  = estimateTripsNeeded(totalCargoVol, containerVol, packResult.efficiency / 100);

    const carbonReport = generateCarbonReport({
      truckType:          options.truckType    || "large",
      fuelType:           options.fuelType     || "diesel",
      routeKey:           options.routeKey     || "pune-mumbai",
      distanceKm:         options.distanceKm   || 148,
      beforeUtilization:  0.62,
      afterUtilization:   packResult.efficiency / 100,
      maxLoadKg:          container.maxWeight  || 10000,
      tripsBeforeOpt,
      tripsAfterOpt,
    });

    // ── Update Dashboard State ────────────────────────────────
    updateFromOptimization({
      efficiency:   packResult.efficiency,
      deadSpace:    packResult.deadSpace,
      placedCount:  packResult.placedCount,
      unplacedCount:packResult.unplacedCount,
    });
    updateFromCarbon(carbonReport);

    // ── Broadcast optimization event ──────────────────────────
    if (global.broadcast) {
      global.broadcast({
        type: "OPTIMIZATION_COMPLETE",
        data: {
          efficiency:   packResult.efficiency,
          placedCount:  packResult.placedCount,
          carbonSaved:  carbonReport.saved.co2Kg,
        },
      });
    }

    res.json({
      success: true,
      packing: {
        placed:          packResult.placed,
        unplaced:        packResult.unplaced,
        efficiency:      packResult.efficiency,
        deadSpace:       packResult.deadSpace,
        weightUsed:      packResult.weightUsed,
        maxWeight:       packResult.maxWeight,
        containerVolume: packResult.containerVolume,
        usedVolume:      packResult.usedVolume,
        totalItems:      packResult.totalItems,
        placedCount:     packResult.placedCount,
        unplacedCount:   packResult.unplacedCount,
      },
      deadSpaceAnalysis,
      carbon: carbonReport,
      alerts,
      container,
    });
  } catch (err) {
    console.error("[optimizeLoad]", err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/optimize/reverse
 * Body: { container, items, deliveryStops }
 */
async function reverseOptimization(req, res) {
  try {
    const { container, items, deliveryStops = [] } = req.body;

    if (!container || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: "container and items[] are required" });
    }

    const result = reverseOptimize(container, items, deliveryStops);

    if (global.broadcast) {
      global.broadcast({
        type: "REVERSE_COMPLETE",
        data: { efficiencyGain: result.improvements.efficiencyGain },
      });
    }

    res.json({ success: true, ...result });
  } catch (err) {
    console.error("[reverseOptimization]", err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { optimizeLoad, reverseOptimization };
