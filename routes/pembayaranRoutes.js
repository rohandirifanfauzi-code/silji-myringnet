const express = require("express");
const controller = require("../controllers/pembayaranController");
const { ensureAuthenticated, allowRoles } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/", ensureAuthenticated, allowRoles("admin", "manajemen", "pelanggan"), controller.index);
router.post("/", ensureAuthenticated, allowRoles("admin", "pelanggan"), controller.store);
router.post("/:id/delete", ensureAuthenticated, allowRoles("admin"), controller.destroy);

module.exports = router;
