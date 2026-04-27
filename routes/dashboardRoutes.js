const express = require("express");
const dashboardController = require("../controllers/dashboardController");
const { ensureAuthenticated } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/", (_req, res) => res.redirect("/dashboard"));
router.get("/dashboard", ensureAuthenticated, dashboardController.index);

module.exports = router;
