const express = require("express");
const controller = require("../controllers/tagihanController");
const { ensureAuthenticated, allowRoles } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/", ensureAuthenticated, allowRoles("admin", "pelanggan"), controller.index);

module.exports = router;
