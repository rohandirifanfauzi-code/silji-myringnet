const express = require("express");
const controller = require("../controllers/keluhanController");
const multer = require("multer");
const upload = require("../config/multer");
const { ensureAuthenticated, allowRoles } = require("../middlewares/authMiddleware");
const { withValidation } = require("../middlewares/validationMiddleware");
const {
  validateKeluhan,
  validateAssignTeknisi,
  validateTaskStatusUpdate,
} = require("../services/validationService");
const { TASK_STATUS } = require("../constants/statuses");

const router = express.Router();

function handleUploadError(error, req, res, next) {
  if (!error) {
    next();
    return;
  }

  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    req.flash("error", "Ukuran file bukti maksimal 2MB.");
    res.redirect("/keluhan");
    return;
  }

  req.flash("error", error.message || "Upload file bukti tidak valid.");
  res.redirect("/keluhan");
}

router.get("/", ensureAuthenticated, allowRoles("admin", "pelanggan", "teknisi"), controller.index);
router.get("/create", ensureAuthenticated, allowRoles("admin", "pelanggan"), controller.createForm);
router.post(
  "/",
  ensureAuthenticated,
  allowRoles("admin", "pelanggan"),
  withValidation(validateKeluhan, () => "/keluhan/create"),
  controller.store
);
router.get("/:id/edit", ensureAuthenticated, allowRoles("admin", "pelanggan"), controller.editForm);
router.put(
  "/:id",
  ensureAuthenticated,
  allowRoles("admin", "pelanggan"),
  withValidation(validateKeluhan, (req) => `/keluhan/${req.params.id}/edit`),
  controller.update
);
router.post("/:id/delete", ensureAuthenticated, allowRoles("admin"), controller.destroy);
router.post(
  "/assign",
  ensureAuthenticated,
  allowRoles("admin"),
  withValidation(validateAssignTeknisi, () => "/keluhan"),
  controller.assignTechnician
);
router.post(
  "/tugas/:id/status",
  ensureAuthenticated,
  allowRoles("admin", "teknisi"),
  withValidation(
    (body) =>
      validateTaskStatusUpdate(body, [
        TASK_STATUS.PENDING,
        TASK_STATUS.IN_PROGRESS,
        TASK_STATUS.DONE,
      ]),
    () => "/keluhan"
  ),
  controller.updateTaskStatus
);
router.post(
  "/hasil",
  ensureAuthenticated,
  allowRoles("admin", "teknisi"),
  upload.single("foto_bukti"),
  handleUploadError,
  controller.uploadResult
);

module.exports = router;
