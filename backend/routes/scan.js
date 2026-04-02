const express = require("express");
const router = express.Router();
const { detectDeadspace } = require("../controllers/scanController");

// POST /api/scan/detect
router.post("/detect", detectDeadspace);

module.exports = router;
