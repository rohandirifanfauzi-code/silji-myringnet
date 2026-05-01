const express = require("express");
const controller = require("../controllers/notifikasiController");
const { ensureAuthenticated, allowRoles } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/", ensureAuthenticated, allowRoles("admin", "teknisi"), controller.index);
router.post("/:id/read", ensureAuthenticated, allowRoles("admin", "teknisi"), controller.markRead);
router.post("/:id/schedule", ensureAuthenticated, allowRoles("teknisi"), controller.scheduleTask);

module.exports = router;
