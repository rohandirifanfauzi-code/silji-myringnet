const express = require("express");
const controller = require("../controllers/manajemenController");
const { ensureAuthenticated, allowRoles } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/dashboard", ensureAuthenticated, allowRoles("manajemen"), controller.dashboard);

module.exports = router;
