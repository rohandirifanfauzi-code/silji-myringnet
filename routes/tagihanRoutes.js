const express = require("express");
const controller = require("../controllers/tagihanController");
const { ensureAuthenticated, allowRoles } = require("../middlewares/authMiddleware");
const { withValidation } = require("../middlewares/validationMiddleware");
const { validateTagihan } = require("../services/validationService");

const router = express.Router();

router.get("/", ensureAuthenticated, allowRoles("admin", "pelanggan"), controller.index);
router.get("/create", ensureAuthenticated, allowRoles("admin"), controller.createForm);
router.post(
  "/",
  ensureAuthenticated,
  allowRoles("admin"),
  withValidation(validateTagihan, () => "/tagihan/create"),
  controller.store
);
router.get("/:id/edit", ensureAuthenticated, allowRoles("admin"), controller.editForm);
router.put(
  "/:id",
  ensureAuthenticated,
  allowRoles("admin"),
  withValidation(validateTagihan, (req) => `/tagihan/${req.params.id}/edit`),
  controller.update
);
router.post("/:id/delete", ensureAuthenticated, allowRoles("admin"), controller.destroy);

module.exports = router;
