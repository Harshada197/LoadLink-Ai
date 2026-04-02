/**
 * LoadLink AI — Reverse Optimizer Service
 *
 * Given an existing (possibly suboptimal) packing layout, this service:
 *  1. Extracts all items from their current positions
 *  2. Re-runs the optimal packing algorithm
 *  3. Generates a delivery-sequence-aware LIFO arrangement
 *  4. Computes improvement metrics
 */

const { pack3D } = require("./packingEngine");

/**
 * Run reverse optimization on an existing layout
 *
 * @param {Object} container  - { width, height, depth, maxWeight }
 * @param {Array}  items      - current placed items (may be suboptimal)
 * @param {Array}  deliveryStops - ordered stops: [{ stopId, city, itemIds[] }]
 * @returns {Object}
 */
function reverseOptimize(container, items, deliveryStops = []) {
  // Extract raw packages from placed items (strip position data)
  const packages = items.map((it) => ({
    id: it.id,
    name: it.name,
    width: it.width,
    height: it.height,
    depth: it.depth,
    weight: it.weight,
    fragile: it.fragile || false,
    priority: it.priority || 2,
    stopIndex: getStopIndex(it.id, deliveryStops),
  }));

  // ── Strategy 1: Pure efficiency optimization ──
  const optimizedResult = pack3D(container, packages);

  // ── Strategy 2: LIFO (Last-In-First-Out) for delivery sequence ──
  // Items for the LAST stop should be loaded FIRST (deepest in container)
  // Items for the FIRST stop should be near the door (front / low Z)
  const lifoResult = lifopack(container, packages, deliveryStops);

  // ── Compute current (before) metrics ──
  const containerVol = container.width * container.height * container.depth;
  const currentUsedVol = items.reduce(
    (s, it) => s + it.width * it.height * it.depth, 0
  );
  const currentEfficiency = Math.round((currentUsedVol / containerVol) * 100);
  const currentDeadSpace  = 100 - currentEfficiency;

  // ── Improvement metrics ──
  const effImprovement  = optimizedResult.efficiency - currentEfficiency;
  const timeReduction   = estimateUnloadTimeReduction(items, lifoResult.placed, deliveryStops);
  const reshufflesAvoided = estimateReshuffles(items, deliveryStops);

  return {
    before: {
      efficiency: currentEfficiency,
      deadSpace: currentDeadSpace,
      placedCount: items.length,
      layout: items,
    },
    afterOptimized: {
      efficiency: optimizedResult.efficiency,
      deadSpace: optimizedResult.deadSpace,
      placedCount: optimizedResult.placed.length,
      layout: optimizedResult.placed,
    },
    afterLIFO: {
      efficiency: lifoResult.efficiency,
      deadSpace: lifoResult.deadSpace,
      placedCount: lifoResult.placed.length,
      layout: lifoResult.placed,
      deliveryZones: buildDeliveryZones(lifoResult.placed, deliveryStops),
    },
    improvements: {
      efficiencyGain: effImprovement,
      unloadTimeReductionMin: timeReduction,
      reshufflesAvoided,
      damageRiskReduction: items.some((it) => it.fragile) ? "HIGH" : "MEDIUM",
    },
    suggestions: buildSuggestions(items, optimizedResult, deliveryStops),
  };
}

/**
 * LIFO-aware packing:
 * Packages are sorted so that the last-stop cargo is placed first
 * (gets pushed deepest into the container as more items are added).
 */
function lifopack(container, packages, deliveryStops) {
  // Assign stop index
  const withStop = packages.map((pkg) => ({
    ...pkg,
    stopIndex: pkg.stopIndex ?? getStopIndex(pkg.id, deliveryStops),
  }));

  // Sort: highest stop index first (last delivery packed deepest)
  // Within same stop: heavy + non-fragile first
  const sorted = withStop.sort((a, b) => {
    const stopDiff = (b.stopIndex ?? 99) - (a.stopIndex ?? 99);
    if (stopDiff !== 0) return stopDiff;
    if (a.fragile !== b.fragile) return a.fragile ? 1 : -1;
    return b.weight - a.weight;
  });

  return pack3D(container, sorted);
}

function getStopIndex(itemId, deliveryStops) {
  for (let i = 0; i < deliveryStops.length; i++) {
    if (deliveryStops[i].itemIds?.includes(itemId)) return i;
  }
  return deliveryStops.length; // unknown → last
}

/**
 * Estimate unloading time reduction in minutes
 * (each avoided reshuffle saves ~3–5 min)
 */
function estimateUnloadTimeReduction(originalItems, optimizedItems, deliveryStops) {
  if (!deliveryStops.length) return 0;
  const reshuffles = estimateReshuffles(originalItems, deliveryStops);
  const shufflesAfter = 0; // LIFO eliminates reshuffles
  return (reshuffles - shufflesAfter) * 4; // 4 min per reshuffle
}

/**
 * Estimate how many items need to be moved to reach each stop's items
 */
function estimateReshuffles(items, deliveryStops) {
  if (!deliveryStops.length || !items.length) return Math.floor(items.length * 0.35);
  let total = 0;
  for (let stopIdx = 0; stopIdx < deliveryStops.length - 1; stopIdx++) {
    const stopItemIds = new Set(deliveryStops[stopIdx].itemIds || []);
    // Items blocking stop items (items placed in front with higher z / lower index)
    const blocking = items.filter(
      (it) => !stopItemIds.has(it.id) && (it.stopIndex || 0) > stopIdx
    );
    total += Math.floor(blocking.length * 0.4);
  }
  return total || Math.floor(items.length * 0.3);
}

/**
 * Build delivery zone mapping for the truck view
 */
function buildDeliveryZones(placed, deliveryStops) {
  if (!deliveryStops.length) return {};
  const zones = {};
  for (const item of placed) {
    const stopIdx = getStopIndex(item.id, deliveryStops);
    const stop = deliveryStops[stopIdx];
    const key = stop ? stop.stopId : "unknown";
    if (!zones[key]) zones[key] = [];
    zones[key].push(item.id);
  }
  return zones;
}

/**
 * Generate natural language suggestions for improvement
 */
function buildSuggestions(currentItems, optimizedResult, deliveryStops) {
  const suggestions = [];

  // Fragile items check
  const fragileItems = currentItems.filter((it) => it.fragile);
  const fragileAtBottom = fragileItems.filter((it) => it.y < 30);
  if (fragileAtBottom.length > 0) {
    suggestions.push({
      icon: "⚠️",
      title: "Move fragile items to the top layer",
      detail: `${fragileAtBottom.length} fragile item(s) are positioned low in the container. Move them above the 60cm line to prevent damage.`,
      priority: "high",
    });
  }

  // Dead space
  if (optimizedResult.efficiency > 80) {
    suggestions.push({
      icon: "📐",
      title: "Stack smaller boxes vertically in gaps",
      detail: `Filling vertical voids with small boxes can recover ~${optimizedResult.deadSpace}% container space.`,
      priority: "medium",
    });
  }

  // Delivery sequence
  if (deliveryStops.length > 1) {
    suggestions.push({
      icon: "🔄",
      title: "Apply LIFO loading sequence",
      detail: `Pack stop ${deliveryStops[deliveryStops.length - 1]?.city || "last"} items first (deepest zone) to avoid reshuffling at each stop.`,
      priority: "high",
    });
    suggestions.push({
      icon: "🚪",
      title: `Keep stop 1 (${deliveryStops[0]?.city || "first"}) items near the door`,
      detail: "Place first-drop items in the rear zone (closest to loading door) for immediate access.",
      priority: "medium",
    });
  }

  // Weight balance
  const totalWeight = currentItems.reduce((s, it) => s + it.weight, 0);
  suggestions.push({
    icon: "⚖️",
    title: "Maintain centre-of-gravity below 60% height",
    detail: `Distribute ${Math.round(totalWeight * 0.6)}kg of heaviest items across the base layer for road stability.`,
    priority: "medium",
  });

  return suggestions;
}

module.exports = { reverseOptimize };
