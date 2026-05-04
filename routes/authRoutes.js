const express = require("express");
const { body } = require("express-validator");
const authController = require("../controllers/authController");
const { handleExpressValidation } = require("../middlewares/validationMiddleware");

const router = express.Router();

router.get("/login", authController.showLogin);
router.post(
  "/login",
  [
    body("username").trim().notEmpty().withMessage("Username wajib diisi."),
    body("password").notEmpty().withMessage("Password wajib diisi."),
  ],
  handleExpressValidation("/login"),
  authController.login
);
router.post("/logout", authController.logout);

module.exports = router;
