const express = require("express");
const controller = require("../controllers/paymentController");

const router = express.Router();

router.post("/callback", controller.callback);

module.exports = router;
