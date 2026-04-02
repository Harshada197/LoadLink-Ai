/**
 * LoadLink AI — Alert Service
 *
 * Generates, stores, and broadcasts real-time packing alerts via WebSocket.
 * Compares actual (scanned) vs optimal (algorithm) packing states.
 */

const { v4: uuidv4 } = require("uuid");

// ── Alert Types ───────────────────────────────────────────────────
const ALERT_TYPES = {
  DEAD_SPACE:       "DEAD_SPACE",
  FRAGILE_VIOLATION:"FRAGILE_VIOLATION",
  WEIGHT_IMBALANCE: "WEIGHT_IMBALANCE",
  INEFFICIENT_STACK:"INEFFICIENT_STACK",
  REARRANGEMENT:    "REARRANGEMENT",
  WEIGHT_LIMIT:     "WEIGHT_LIMIT",
  OPTIMIZED:        "OPTIMIZED",
  INFO:             "INFO",
};

const SEVERITY = { LOW: "low", MEDIUM: "medium", HIGH: "high", CRITICAL: "critical" };

// In-memory alert store (last 100 alerts)
let alertHistory = [];
const MAX_ALERTS = 100;

/**
 * Create and broadcast an alert
 */
function triggerAlert({ type, title, description, severity = SEVERITY.MEDIUM, data = {} }) {
  const alert = {
    id: uuidv4(),
    type,
    title,
    description,
    severity,
    data,
    timestamp: new Date().toISOString(),
    read: false,
  };

  // Store in history
  alertHistory.unshift(alert);
  if (alertHistory.length > MAX_ALERTS) alertHistory.pop();

  // Broadcast via WebSocket
  if (global.broadcast) {
    global.broadcast({ type: "ALERT", alert });
  }

  console.log(`[ALERT][${severity.toUpperCase()}] ${title}`);
  return alert;
}

/**
 * Analyze packing result and generate relevant alerts
 * @param {Object} packResult  - result from packingEngine.pack3D
 * @param {Object} container   - container spec
 */
function analyzeAndAlert(packResult, container) {
  const alerts = [];
  const { efficiency, deadSpace, placed, unplaced, weightUsed, maxWeight } = packResult;

  // Dead space alert
  if (deadSpace > 30) {
    alerts.push(triggerAlert({
      type: ALERT_TYPES.DEAD_SPACE,
      title: "High Dead Space Detected",
      description: `Unused space: ${deadSpace}%. Rearrangement can improve utilization by ~${Math.min(deadSpace - 5, 26)}%.`,
      severity: deadSpace > 50 ? SEVERITY.HIGH : SEVERITY.MEDIUM,
      data: { deadSpacePct: deadSpace, currentEfficiency: efficiency },
    }));
  }

  // Weight limit warning
  const weightUtilization = Math.round((weightUsed / maxWeight) * 100);
  if (weightUtilization > 90) {
    alerts.push(triggerAlert({
      type: ALERT_TYPES.WEIGHT_LIMIT,
      title: "Approaching Weight Limit",
      description: `Load is at ${weightUtilization}% of maximum weight capacity (${weightUsed}/${maxWeight} kg). Consider redistributing.`,
      severity: weightUtilization > 97 ? SEVERITY.CRITICAL : SEVERITY.HIGH,
      data: { weightUsed, maxWeight, weightUtilization },
    }));
  }

  // Fragile item violations — check if any fragile items have heavy items above them
  const fragileItems = placed.filter((it) => it.fragile);
  for (const fi of fragileItems) {
    const above = placed.filter(
      (it) =>
        !it.fragile &&
        it.weight > 5 &&
        it.x < fi.x2 && it.x2 > fi.x &&
        it.z < fi.z2 && it.z2 > fi.z &&
        it.y >= fi.y2 - 1
    );
    if (above.length > 0) {
      alerts.push(triggerAlert({
        type: ALERT_TYPES.FRAGILE_VIOLATION,
        title: "Fragile Item Stacking Violation",
        description: `Item "${fi.name}" is marked fragile but has heavy items stacked above it. Risk of damage.`,
        severity: SEVERITY.HIGH,
        data: { fragileItem: fi.id, aboveItems: above.map((a) => a.id) },
      }));
    }
  }

  // Unplaced items
  if (unplaced.length > 0) {
    alerts.push(triggerAlert({
      type: ALERT_TYPES.INFO,
      title: `${unplaced.length} Item(s) Could Not Be Placed`,
      description: `Consider a larger container or an additional trip. Items: ${unplaced.map((u) => u.name).join(", ")}.`,
      severity: SEVERITY.MEDIUM,
      data: { unplacedItems: unplaced },
    }));
  }

  // Good packing alert
  if (efficiency >= 85) {
    alerts.push(triggerAlert({
      type: ALERT_TYPES.OPTIMIZED,
      title: "Excellent Packing Efficiency",
      description: `Container is ${efficiency}% utilized — above the industry benchmark of 75%. Great optimization!`,
      severity: SEVERITY.LOW,
      data: { efficiency },
    }));
  }

  // Weight balance check (simplified: compare left vs right half)
  checkWeightBalance(placed, container, alerts);

  return alerts;
}

/**
 * Check weight distribution balance
 */
function checkWeightBalance(placed, container, alerts) {
  const midX = container.width / 2;
  let leftWeight = 0, rightWeight = 0;

  for (const it of placed) {
    const cx = it.x + it.width / 2;
    if (cx < midX) leftWeight += it.weight;
    else rightWeight += it.weight;
  }

  const total = leftWeight + rightWeight;
  if (total === 0) return;

  const imbalancePct = Math.abs(leftWeight - rightWeight) / total * 100;
  if (imbalancePct > 25) {
    alerts.push(triggerAlert({
      type: ALERT_TYPES.WEIGHT_IMBALANCE,
      title: "Weight Distribution Imbalance",
      description: `Load imbalance of ${Math.round(imbalancePct)}% detected between left (${Math.round(leftWeight)}kg) and right (${Math.round(rightWeight)}kg) sides. Risk of tyre wear and handling issues.`,
      severity: imbalancePct > 40 ? SEVERITY.HIGH : SEVERITY.MEDIUM,
      data: { leftWeight, rightWeight, imbalancePct: Math.round(imbalancePct) },
    }));
  }
}

/**
 * Compare actual (scanned) vs optimal layout and generate mismatch alerts
 */
function compareLayouts(actualLayout, optimalLayout) {
  const alerts = [];

  // Count items in wrong zone
  let mismatches = 0;
  for (const optItem of optimalLayout) {
    const actual = actualLayout.find((a) => a.id === optItem.id);
    if (!actual) {
      mismatches++;
      continue;
    }
    const dist = Math.sqrt(
      Math.pow(actual.x - optItem.x, 2) +
      Math.pow(actual.y - optItem.y, 2) +
      Math.pow(actual.z - optItem.z, 2)
    );
    if (dist > 50) mismatches++;
  }

  if (mismatches > 0) {
    const improvePct = Math.min(Math.round(mismatches * 3.5), 35);
    alerts.push(triggerAlert({
      type: ALERT_TYPES.REARRANGEMENT,
      title: "Rearrangement Recommended",
      description: `${mismatches} item(s) not in optimal position. Rearranging can improve utilization by ~${improvePct}%.`,
      severity: mismatches > 3 ? SEVERITY.HIGH : SEVERITY.MEDIUM,
      data: { mismatches, improvePct },
    }));
  }

  return alerts;
}

function getAlertHistory(limit = 20) {
  return alertHistory.slice(0, limit);
}

function markRead(alertId) {
  const a = alertHistory.find((al) => al.id === alertId);
  if (a) a.read = true;
  return a;
}

function clearAlerts() {
  alertHistory = [];
}

module.exports = {
  triggerAlert,
  analyzeAndAlert,
  compareLayouts,
  getAlertHistory,
  markRead,
  clearAlerts,
  ALERT_TYPES,
  SEVERITY,
};
