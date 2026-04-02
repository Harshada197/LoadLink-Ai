/**
 * LoadLink AI — Carbon Emission Service
 *
 * Calculates CO₂ emissions for logistics trips based on:
 *  - Truck fuel type and load efficiency
 *  - Distance and route
 *  - Number of trips required
 *  - Load weight and utilization
 *
 * Emission factors sourced from IPCC & EEA transport guidelines.
 */

// ── Emission Factors (kg CO₂ per litre of fuel) ───────────────────
const FUEL_FACTORS = {
  diesel:   2.68,  // kg CO₂/L
  petrol:   2.31,
  cng:      1.82,
  electric: 0.0,   // grid-dependent, simplified to 0
};

// ── Fuel Consumption by truck type (L per 100km at full load) ──────
const TRUCK_FUEL_CONSUMPTION = {
  "mini":      8.0,   // small van ~1t
  "medium":   18.0,   // 7.5t truck
  "large":    28.0,   // 20t container
  "jumbo":    35.0,   // 40t semi
};

// ── Default route info ─────────────────────────────────────────────
const KNOWN_ROUTES = {
  "pune-mumbai":      { distanceKm: 148,  co2PerKmFactor: 1.0 },
  "mumbai-delhi":     { distanceKm: 1416, co2PerKmFactor: 1.0 },
  "bangalore-chennai":{ distanceKm: 346,  co2PerKmFactor: 1.0 },
  "hyderabad-pune":   { distanceKm: 560,  co2PerKmFactor: 1.0 },
  "delhi-jaipur":     { distanceKm: 281,  co2PerKmFactor: 1.0 },
};

/**
 * Calculate CO₂ emissions for a single trip
 *
 * @param {Object} params
 *   - truckType:     "mini"|"medium"|"large"|"jumbo"
 *   - fuelType:      "diesel"|"petrol"|"cng"|"electric"
 *   - distanceKm:    number
 *   - loadUtilization: 0-1  (fraction of max capacity used)
 *   - maxLoadKg:     number (max truck capacity in kg)
 *   - actualLoadKg:  number
 */
function calculateTripEmissions({
  truckType = "large",
  fuelType = "diesel",
  distanceKm = 148,
  loadUtilization = 0.62,
  maxLoadKg = 10000,
  actualLoadKg = null,
}) {
  const baseFuelL100km = TRUCK_FUEL_CONSUMPTION[truckType] || 28;
  const emFactor = FUEL_FACTORS[fuelType] || 2.68;

  // Fuel consumption increases slightly at higher loads (5% per 10% load over 50%)
  const loadOverBase = Math.max(0, loadUtilization - 0.5);
  const loadMultiplier = 1 + loadOverBase * 0.5;

  // At low utilization, fuel wasted per unit is higher (empty running penalty)
  // A truck running at 62% uses ~88% of full-load fuel
  const utilizationPenalty = 0.7 + 0.3 * loadUtilization;

  const adjustedFuelL100km = baseFuelL100km * utilizationPenalty * loadMultiplier;
  const totalFuelL = (adjustedFuelL100km / 100) * distanceKm;
  const co2Kg = totalFuelL * emFactor;

  return {
    fuelLitres: round2(totalFuelL),
    co2Kg: round2(co2Kg),
    fuelL100km: round2(adjustedFuelL100km),
  };
}

/**
 * Full carbon report: compare before vs after optimization
 *
 * @param {Object} params
 *   - truckType, fuelType, distanceKm, routeKey
 *   - beforeUtilization: 0-1
 *   - afterUtilization:  0-1
 *   - maxLoadKg: number
 *   - tripsBeforeOpt: number  (trips needed before optimization)
 *   - tripsAfterOpt:  number
 */
function generateCarbonReport({
  truckType = "large",
  fuelType = "diesel",
  distanceKm = 148,
  routeKey = "pune-mumbai",
  beforeUtilization = 0.62,
  afterUtilization = 0.88,
  maxLoadKg = 10000,
  tripsBeforeOpt = 2,
  tripsAfterOpt = 1,
}) {
  const route = KNOWN_ROUTES[routeKey] || { distanceKm, co2PerKmFactor: 1.0 };
  const km = route.distanceKm;

  const before = calculateTripEmissions({
    truckType, fuelType, distanceKm: km,
    loadUtilization: beforeUtilization, maxLoadKg,
  });

  const after = calculateTripEmissions({
    truckType, fuelType, distanceKm: km,
    loadUtilization: afterUtilization, maxLoadKg,
  });

  const totalBefore = round2(before.co2Kg * tripsBeforeOpt);
  const totalAfter  = round2(after.co2Kg  * tripsAfterOpt);
  const savedKg     = round2(totalBefore - totalAfter);
  const savedPct    = round2((savedKg / totalBefore) * 100);

  // Equivalencies (approximate)
  const treesEquiv    = round2(savedKg / 21.7); // avg tree absorbs ~21.7 kg CO₂/yr
  const carKmEquiv    = Math.round(savedKg / 0.171); // avg car ~171g CO₂/km
  const fuelSavedL    = round2((before.fuelLitres * tripsBeforeOpt) - (after.fuelLitres * tripsAfterOpt));
  const fuelCostINR   = Math.round(fuelSavedL * 92); // ~₹92/L diesel

  // Annual fleet projection (assume 250 trips/year per truck, fleet of 20)
  const annualTrips   = 250;
  const fleetSize     = 20;
  const annualSavedKg = round2(savedKg * annualTrips * fleetSize);
  const annualSavedT  = round2(annualSavedKg / 1000);

  // Per-emission-factor breakdown
  const breakdown = {
    fuelBurn:    { before: round2(before.fuelLitres * tripsBeforeOpt), after: round2(after.fuelLitres * tripsAfterOpt), unit: "L" },
    idleEmissions:{ before: round2(before.co2Kg * 0.12 * tripsBeforeOpt), after: round2(after.co2Kg * 0.05 * tripsAfterOpt), unit: "kg CO₂" },
    weightImpact: { before: round2(maxLoadKg * beforeUtilization / 1000), after: round2(maxLoadKg * afterUtilization / 1000), unit: "tonnes" },
    tripCount:   { before: tripsBeforeOpt, after: tripsAfterOpt, unit: "trips" },
  };

  return {
    perTrip: { before, after },
    total: { before: totalBefore, after: totalAfter },
    saved: {
      co2Kg: savedKg,
      pct: savedPct,
      fuelLitres: fuelSavedL,
      fuelCostINR,
      treesEquiv,
      carKmEquiv,
    },
    annual: {
      savedKg: annualSavedKg,
      savedTonnes: annualSavedT,
      carbonCreditsINR: Math.round(annualSavedT * 800), // ~₹800/tonne in Indian market
    },
    breakdown,
    meta: { truckType, fuelType, distanceKm: km, routeKey },
  };
}

/**
 * Calculate how many trips are needed given total cargo volume and optimization level
 */
function estimateTripsNeeded(totalCargoVol, containerVol, utilizationRate) {
  const effectiveVol = containerVol * utilizationRate;
  return Math.ceil(totalCargoVol / effectiveVol);
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

module.exports = { generateCarbonReport, calculateTripEmissions, estimateTripsNeeded };
