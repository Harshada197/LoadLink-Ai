const express = require("express");
const router = express.Router();
const { optimizeLoad, reverseOptimization } = require("../controllers/optimizeController");

// POST /api/optimize/load
router.post("/load", optimizeLoad);

// POST /api/optimize/reverse
router.post("/reverse", reverseOptimization);

module.exports = router;
