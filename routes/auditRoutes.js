const express = require("express");
const controller = require("../controllers/auditController");
const { ensureAuthenticated, allowRoles } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/", ensureAuthenticated, allowRoles("admin", "manajemen"), controller.index);

module.exports = router;
