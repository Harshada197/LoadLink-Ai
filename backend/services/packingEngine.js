/**
 * LoadLink AI — 3D Bin Packing Engine
 *
 * Implements the "Extreme Points" heuristic for 3D bin packing.
 * Packages are sorted by volume (largest first), then placed at the
 * first extreme point where they fit — respecting weight, fragility,
 * and priority constraints.
 *
 * Reference: Crainic et al. "Extreme Point-Based Multi-Space Search"
 */

// ── Data Structures ───────────────────────────────────────────────

class PlacedItem {
  constructor(pkg, x, y, z) {
    this.id = pkg.id;
    this.name = pkg.name;
    this.x = x; // left-front-bottom corner
    this.y = y;
    this.z = z;
    this.width = pkg.width;
    this.height = pkg.height;
    this.depth = pkg.depth;
    this.weight = pkg.weight;
    this.fragile = pkg.fragile;
    this.priority = pkg.priority;
    this.color = pkg.color || generateColor(pkg.fragile, pkg.priority);
    // Computed bounds
    this.x2 = x + pkg.width;
    this.y2 = y + pkg.height;
    this.z2 = z + pkg.depth;
  }
}

/**
 * Main packing function
 * @param {Object} container   { width, height, depth, maxWeight }
 * @param {Array}  packages    [{ id, name, width, height, depth, weight, fragile, priority }]
 * @returns {Object}           { placed, unplaced, efficiency, deadSpace, weightUsed }
 */
function pack3D(container, packages) {
  const { width: CW, height: CH, depth: CD, maxWeight = 10000 } = container;

  // Step 1: Sort packages by constraint priority
  // Rule: heavy + non-fragile first (bottom), fragile last (top)
  // Secondary sort: volume descending (largest first for better fit)
  const sorted = [...packages].sort((a, b) => {
    // Priority tier: 1=high, 2=medium, 3=low
    const aPri = a.priority || 2;
    const bPri = b.priority || 2;
    if (aPri !== bPri) return aPri - bPri;

    // Fragile goes last (placed at top later)
    if (a.fragile !== b.fragile) return a.fragile ? 1 : -1;

    // Heavy before light (base layer first)
    if (Math.abs(a.weight - b.weight) > 1) return b.weight - a.weight;

    // Larger volume first
    return volume(b) - volume(a);
  });

  const placed = [];     // Array of PlacedItem
  const unplaced = [];   // Packages that didn't fit
  let weightUsed = 0;

  // Extreme Points — start with container origin
  let extremePoints = [{ x: 0, y: 0, z: 0 }];

  for (const pkg of sorted) {
    if (weightUsed + pkg.weight > maxWeight) {
      unplaced.push({ ...pkg, reason: "Weight limit exceeded" });
      continue;
    }

    let bestPoint = null;
    let bestScore = Infinity;

    // Try all extreme points for this package (and rotations)
    const orientations = getOrientations(pkg);

    for (const ep of extremePoints) {
      for (const ori of orientations) {
        if (!fits(ep, ori, CW, CH, CD)) continue;
        if (overlapsAny(ep, ori, placed)) continue;

        // Fragility check: fragile items cannot have anything placed above them
        if (hasFragileBelow(ep, ori, placed)) continue;

        // Score: prefer low Y (weight at bottom), then low Z, then low X
        const score = ep.y * 10000 + ep.z * 100 + ep.x;
        if (score < bestScore) {
          bestScore = score;
          bestPoint = { ep, ori };
        }
      }
    }

    if (bestPoint) {
      const { ep, ori } = bestPoint;
      const item = new PlacedItem({ ...pkg, ...ori }, ep.x, ep.y, ep.z);
      placed.push(item);
      weightUsed += pkg.weight;

      // Generate new extreme points from this placement
      extremePoints = updateExtremePoints(extremePoints, item, CW, CH, CD, placed);
    } else {
      unplaced.push({ ...pkg, reason: "No valid position found" });
    }
  }

  // ── Metrics ──
  const containerVolume = CW * CH * CD;
  const usedVolume = placed.reduce((s, it) => s + it.width * it.height * it.depth, 0);
  const efficiency = Math.round((usedVolume / containerVolume) * 100);
  const deadSpace = 100 - efficiency;

  return {
    placed,
    unplaced,
    efficiency,
    deadSpace,
    weightUsed,
    maxWeight,
    containerVolume,
    usedVolume,
    totalItems: packages.length,
    placedCount: placed.length,
    unplacedCount: unplaced.length,
  };
}

// ── Helpers ───────────────────────────────────────────────────────

function volume(pkg) {
  return pkg.width * pkg.height * pkg.depth;
}

/**
 * Returns valid orientations for a package.
 * Fragile items keep their original orientation (can't flip).
 * Heavy items prefer low-center-of-gravity orientations.
 */
function getOrientations(pkg) {
  const { width: w, height: h, depth: d } = pkg;

  if (pkg.fragile) {
    // Fragile: only allow rotations that keep height as-is or wider base
    return [
      { width: w, height: h, depth: d },
      { width: d, height: h, depth: w },
    ];
  }

  // All 6 axis-aligned orientations
  return [
    { width: w, height: h, depth: d },
    { width: w, height: d, depth: h },
    { width: h, height: w, depth: d },
    { width: h, height: d, depth: w },
    { width: d, height: w, depth: h },
    { width: d, height: h, depth: w },
  ];
}

function fits(point, ori, CW, CH, CD) {
  return (
    point.x + ori.width  <= CW &&
    point.y + ori.height <= CH &&
    point.z + ori.depth  <= CD
  );
}

function overlapsAny(point, ori, placed) {
  const { x, y, z } = point;
  const x2 = x + ori.width;
  const y2 = y + ori.height;
  const z2 = z + ori.depth;

  for (const it of placed) {
    if (
      x  < it.x2 && x2 > it.x &&
      y  < it.y2 && y2 > it.y &&
      z  < it.z2 && z2 > it.z
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Fragility constraint: a fragile item cannot have another item directly above it.
 * Check if placing at (ep.x, ep.y, ep.z) would stack on top of a fragile item.
 */
function hasFragileBelow(ep, ori, placed) {
  for (const it of placed) {
    if (!it.fragile) continue;
    // Is our new item directly above this fragile item?
    const xOverlap = ep.x < it.x2 && ep.x + ori.width > it.x;
    const zOverlap = ep.z < it.z2 && ep.z + ori.depth > it.z;
    const onTop = Math.abs(ep.y - it.y2) < 0.5; // resting on top
    if (xOverlap && zOverlap && onTop) return true;
  }
  return false;
}

/**
 * Update extreme points after placing an item.
 * New extreme points are generated at the corners of the newly placed item.
 */
function updateExtremePoints(current, item, CW, CH, CD, placed) {
  const candidates = [
    // Right face
    { x: item.x2, y: item.y,  z: item.z  },
    // Top face
    { x: item.x,  y: item.y2, z: item.z  },
    // Front face
    { x: item.x,  y: item.y,  z: item.z2 },
    // Combinations
    { x: item.x2, y: item.y2, z: item.z  },
    { x: item.x2, y: item.y,  z: item.z2 },
    { x: item.x,  y: item.y2, z: item.z2 },
  ];

  // Merge with existing, remove dominated points, filter out-of-bounds
  const all = [...current, ...candidates].filter(
    (p) => p.x < CW && p.y < CH && p.z < CD
  );

  // Remove duplicates
  const unique = [];
  const seen = new Set();
  for (const p of all) {
    const key = `${p.x},${p.y},${p.z}`;
    if (!seen.has(key)) { seen.add(key); unique.push(p); }
  }

  // Remove points inside existing placed items
  return unique.filter((p) => {
    for (const it of placed) {
      if (
        p.x >= it.x && p.x < it.x2 &&
        p.y >= it.y && p.y < it.y2 &&
        p.z >= it.z && p.z < it.z2
      ) return false;
    }
    return true;
  });
}

/**
 * Generate a deterministic color based on fragility and priority
 */
function generateColor(fragile, priority) {
  if (fragile) return "#a78bfa"; // purple for fragile
  const colors = {
    1: "#00e5ff", // cyan for high priority
    2: "#ffb800", // amber for medium
    3: "#64748b", // slate for low
  };
  return colors[priority] || "#64748b";
}

/**
 * Analyze dead space in a packed container.
 * Returns regions of empty space (simplified to a grid scan).
 */
function analyzeDeadSpace(container, placed) {
  const { width: CW, height: CH, depth: CD } = container;
  const gridSize = 10; // cm resolution
  let emptyCount = 0;
  let totalCount = 0;
  const regions = [];

  // Scan a 2D slice at each Z layer
  for (let z = 0; z < CD; z += gridSize) {
    let layerEmpty = 0;
    let layerTotal = 0;
    for (let x = 0; x < CW; x += gridSize) {
      for (let y = 0; y < CH; y += gridSize) {
        layerTotal++;
        totalCount++;
        const occupied = placed.some(
          (it) =>
            x >= it.x && x < it.x2 &&
            y >= it.y && y < it.y2 &&
            z >= it.z && z < it.z2
        );
        if (!occupied) { layerEmpty++; emptyCount++; }
      }
    }
    if (layerEmpty / layerTotal > 0.4) {
      regions.push({ z, emptyPct: Math.round((layerEmpty / layerTotal) * 100) });
    }
  }

  return {
    totalEmpty: Math.round((emptyCount / totalCount) * 100),
    regions,
  };
}

module.exports = { pack3D, analyzeDeadSpace };
