/**
 * LoadLink AI — Scan Controller
 * Handles POST /api/scan/detect — computer vision / dead-space detection
 *
 * In production: integrates with YOLO or TF.js model.
 * Here: implements realistic simulation with grid-based analysis.
 */

const { triggerAlert, ALERT_TYPES, SEVERITY } = require("../services/alertService");
const { updateFromScan } = require("../services/dashboardService");

/**
 * POST /api/scan/detect
 * Body: {
 *   gridData?:    2D array representing camera-captured grid (0=empty, 1=box, 2=fragile)
 *   imageBase64?: string  (uploaded image — analysed via simulation)
 *   containerId?: string
 *   frameIndex?:  number (for live stream frames)
 * }
 */
async function detectDeadspace(req, res) {
  try {
    const { gridData, imageBase64, containerId = "main", frameIndex = 0 } = req.body;

    let analysisGrid;

    if (gridData && Array.isArray(gridData)) {
      // Use provided grid data directly
      analysisGrid = gridData;
    } else if (imageBase64) {
      // Simulate image analysis: in production this would run YOLO inference
      analysisGrid = simulateImageAnalysis(imageBase64);
    } else {
      // Default: generate a realistic but randomised scan result
      analysisGrid = generateSimulatedScan(frameIndex);
    }

    const analysis = analyseGrid(analysisGrid);

    // ── Generate real-time alerts based on scan ───────────────
    const scanAlerts = [];

    if (analysis.emptyPct > 25) {
      scanAlerts.push(triggerAlert({
        type: ALERT_TYPES.DEAD_SPACE,
        title: "Unused Vertical Space Detected",
        description: `Camera scan shows ${analysis.emptyPct}% of container is empty. Vertical stacking can recover ~${Math.round(analysis.emptyPct * 0.6)}% space.`,
        severity: analysis.emptyPct > 40 ? SEVERITY.HIGH : SEVERITY.MEDIUM,
        data: { emptyPct: analysis.emptyPct, detectedAt: containerId },
      }));
    }

    if (analysis.fragileViolations > 0) {
      scanAlerts.push(triggerAlert({
        type: ALERT_TYPES.FRAGILE_VIOLATION,
        title: "Fragile Item Stacking Violation",
        description: `Detected ${analysis.fragileViolations} fragile item(s) under heavy cargo. Immediate rearrangement required.`,
        severity: SEVERITY.HIGH,
        data: { violations: analysis.fragileViolations },
      }));
    }

    if (analysis.improperlayerCount > 0) {
      scanAlerts.push(triggerAlert({
        type: ALERT_TYPES.INEFFICIENT_STACK,
        title: "Inefficient Stacking Pattern",
        description: `${analysis.improperlayerCount} layer(s) show irregular box placement. Reorganising can improve load stability.`,
        severity: SEVERITY.MEDIUM,
        data: { layers: analysis.improperlayerCount },
      }));
    }

    // Compute potential improvement
    const currentUtil = 100 - analysis.emptyPct;
    const potentialUtil = Math.min(currentUtil + Math.round(analysis.emptyPct * 0.65), 95);
    const improvement = potentialUtil - currentUtil;

    if (improvement >= 8) {
      scanAlerts.push(triggerAlert({
        type: ALERT_TYPES.REARRANGEMENT,
        title: `Rearrangement Can Improve Utilization by ${improvement}%`,
        description: `Current: ${currentUtil}% → Potential: ${potentialUtil}%. Run optimization to get the rearrangement plan.`,
        severity: SEVERITY.MEDIUM,
        data: { currentUtil, potentialUtil, improvement },
      }));
    }

    const scanResult = {
      utilization: currentUtil,
      emptyPct: analysis.emptyPct,
      issues: scanAlerts,
      grid: analysisGrid,
      metrics: {
        ...analysis,
        currentUtilization: currentUtil,
        potentialUtilization: potentialUtil,
        improvementPotential: improvement,
      },
      recommendations: buildScanRecommendations(analysis),
      timestamp: new Date().toISOString(),
      frameIndex,
    };

    updateFromScan(scanResult);

    // Broadcast scan update
    if (global.broadcast) {
      global.broadcast({
        type: "SCAN_UPDATE",
        data: {
          utilization: currentUtil,
          issues: scanAlerts.length,
          frameIndex,
        },
      });
    }

    res.json({ success: true, scan: scanResult });
  } catch (err) {
    console.error("[detectDeadspace]", err);
    res.status(500).json({ error: err.message });
  }
}

// ── Analysis ──────────────────────────────────────────────────────

function analyseGrid(grid) {
  let total = 0, empty = 0, fragile = 0, regular = 0;
  let fragileViolations = 0;
  let improperlayerCount = 0;

  const rows = grid.length;
  const cols = grid[0]?.length || 0;

  for (let r = 0; r < rows; r++) {
    let rowEmpty = 0;
    for (let c = 0; c < cols; c++) {
      total++;
      const cell = grid[r][c];
      if (cell === 0) { empty++; rowEmpty++; }
      else if (cell === 2) fragile++;
      else regular++;

      // Fragile violation: value 2 (fragile) in bottom half rows
      if (cell === 2 && r > rows / 2) fragileViolations++;
    }
    // Improper layer: too many scattered empty cells in a row
    if (rowEmpty > 0 && rowEmpty < cols && rowEmpty / cols > 0.3) improperlayerCount++;
  }

  const emptyPct = Math.round((empty / total) * 100);
  const fragileRatio = fragile / Math.max(1, total - empty);

  return {
    emptyPct,
    filledPct: 100 - emptyPct,
    fragileCount: fragile,
    regularCount: regular,
    fragileViolations,
    improperlayerCount,
    fragileRatio: Math.round(fragileRatio * 100),
    rows,
    cols,
  };
}

/**
 * Simulate a scan from an uploaded image
 * In production: replace with actual ML inference
 */
function simulateImageAnalysis(_imageBase64) {
  // Analyse image dimensions / color distribution would happen here
  // Returning realistic simulated grid
  return generateSimulatedScan(Math.floor(Math.random() * 10));
}

/**
 * Generate a realistic randomised scan grid
 * Grid: 0=empty, 1=regular box, 2=fragile box
 * Rows: height layers (0=top, last=floor)
 * Cols: width positions
 */
function generateSimulatedScan(seed = 0) {
  const rows = 8, cols = 10;
  const grid = [];
  const rand = seededRand(seed + 42);

  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      const fill = rand();
      const isTop = r < 3;     // top rows are often empty
      const isBottom = r > 5;  // bottom rows usually full

      if (isBottom) {
        row.push(fill < 0.85 ? 1 : (fill < 0.93 ? 2 : 0));
      } else if (isTop) {
        row.push(fill < 0.35 ? 1 : (fill < 0.4 ? 2 : 0));
      } else {
        row.push(fill < 0.62 ? 1 : (fill < 0.66 ? 2 : 0));
      }
    }
    grid.push(row);
  }
  return grid;
}

// Simple seeded pseudo-random
function seededRand(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function buildScanRecommendations(analysis) {
  const recs = [];
  if (analysis.emptyPct > 20)
    recs.push({ type: "stack", text: "Fill upper vertical space with lightweight small boxes." });
  if (analysis.fragileViolations > 0)
    recs.push({ type: "fragile", text: "Move fragile items to the top layer immediately." });
  if (analysis.improperlayerCount > 1)
    recs.push({ type: "repack", text: "Re-pack scattered layers for better column stability." });
  if (analysis.fragileRatio > 30)
    recs.push({ type: "zone", text: "Create a dedicated fragile zone in the upper-right section." });
  return recs;
}

module.exports = { detectDeadspace };
