const express = require("express");
const controller = require("../controllers/laporanController");
const { ensureAuthenticated, allowRoles } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/", ensureAuthenticated, allowRoles("admin", "manajemen"), controller.index);
router.get("/pdf/:jenis", ensureAuthenticated, allowRoles("admin", "manajemen"), controller.exportPdf);
router.get("/excel/:jenis", ensureAuthenticated, allowRoles("admin", "manajemen"), controller.exportExcel);
router.get("/export/pdf", ensureAuthenticated, allowRoles("admin", "manajemen"), (req, res) =>
  res.redirect("/laporan/pdf/pelanggan")
);
router.get("/export/excel", ensureAuthenticated, allowRoles("admin", "manajemen"), (req, res) =>
  res.redirect("/laporan/excel/pelanggan")
);

module.exports = router;
