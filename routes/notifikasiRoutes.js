const express = require("express");
const controller = require("../controllers/notifikasiController");
const { ensureAuthenticated, allowRoles } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/", ensureAuthenticated, allowRoles("admin", "manajemen", "pelanggan", "teknisi"), controller.index);
router.post("/:id/read", ensureAuthenticated, controller.markRead);

module.exports = router;
