const express = require("express");
const controller = require("../controllers/keluhanController");
const upload = require("../config/multer");
const { ensureAuthenticated, allowRoles } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/", ensureAuthenticated, allowRoles("admin", "manajemen", "pelanggan", "teknisi"), controller.index);
router.get("/create", ensureAuthenticated, allowRoles("admin", "pelanggan"), controller.createForm);
router.post("/", ensureAuthenticated, allowRoles("admin", "pelanggan"), controller.store);
router.get("/:id/edit", ensureAuthenticated, allowRoles("admin", "pelanggan"), controller.editForm);
router.put("/:id", ensureAuthenticated, allowRoles("admin", "pelanggan"), controller.update);
router.post("/:id/delete", ensureAuthenticated, allowRoles("admin"), controller.destroy);
router.post("/assign", ensureAuthenticated, allowRoles("admin"), controller.assignTechnician);
router.post("/tugas/:id/status", ensureAuthenticated, allowRoles("admin", "teknisi"), controller.updateTaskStatus);
router.post(
  "/hasil",
  ensureAuthenticated,
  allowRoles("admin", "teknisi"),
  upload.single("foto_bukti"),
  controller.uploadResult
);

module.exports = router;
