const { validationResult } = require("express-validator");

function withValidation(validator, redirectTo) {
  return (req, res, next) => {
    const errors = validator(req.body, req);
    if (!errors.length) {
      next();
      return;
    }

    errors.forEach((message) => req.flash("error", message));
    res.redirect(redirectTo(req));
  };
}

function handleExpressValidation(redirectTo) {
  return (req, res, next) => {
    const result = validationResult(req);
    if (result.isEmpty()) {
      next();
      return;
    }

    result.array().forEach((error) => req.flash("error", error.msg));
    res.redirect(typeof redirectTo === "function" ? redirectTo(req) : redirectTo);
  };
}

module.exports = { withValidation, handleExpressValidation };
