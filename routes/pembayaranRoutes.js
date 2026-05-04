const express = require("express");
const controller = require("../controllers/pembayaranController");
const { ensureAuthenticated, allowRoles } = require("../middlewares/authMiddleware");
const { withValidation } = require("../middlewares/validationMiddleware");
const {
  validatePaymentPreparation,
  validateCashPayment,
} = require("../services/validationService");

const router = express.Router();

router.get("/", ensureAuthenticated, allowRoles("admin", "pelanggan"), controller.index);
router.post(
  "/prepare",
  ensureAuthenticated,
  allowRoles("admin", "pelanggan"),
  withValidation(
    (body, req) => {
      const errors = validatePaymentPreparation(body);
      if (req.user.role === "admin" && !body.id_tagihan) {
        errors.unshift("Tagihan wajib dipilih.");
      }
      return errors;
    },
    () => "/pembayaran"
  ),
  controller.prepare
);
router.post(
  "/",
  ensureAuthenticated,
  allowRoles("admin", "pelanggan"),
  withValidation(
    (body, req) =>
      req.user.role === "admin" && String(body.metode || "").toLowerCase() === "cash"
        ? validateCashPayment(body)
        : [],
    () => "/pembayaran"
  ),
  controller.store
);
router.post("/:id/delete", ensureAuthenticated, allowRoles("admin"), controller.destroy);

module.exports = router;
