const express = require("express");
const controller = require("../controllers/paketController");
const { ensureAuthenticated, allowRoles } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/", ensureAuthenticated, allowRoles("admin", "manajemen"), controller.index);
router.get("/create", ensureAuthenticated, allowRoles("admin"), controller.createForm);
router.post("/", ensureAuthenticated, allowRoles("admin"), controller.store);
router.get("/:id/edit", ensureAuthenticated, allowRoles("admin"), controller.editForm);
router.put("/:id", ensureAuthenticated, allowRoles("admin"), controller.update);
router.post("/:id/delete", ensureAuthenticated, allowRoles("admin"), controller.destroy);

module.exports = router;
