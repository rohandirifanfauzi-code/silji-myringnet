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

module.exports = { withValidation };
