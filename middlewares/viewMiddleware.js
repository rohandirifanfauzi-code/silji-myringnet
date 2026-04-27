function attachGlobals(req, res, next) {
  res.locals.currentUser = req.session.user || null;
  res.locals.hasRole = (...roles) =>
    Boolean(req.session.user && roles.includes(req.session.user.role));
  res.locals.successMessages = req.flash("success");
  res.locals.errorMessages = req.flash("error");
  res.locals.currentPath = req.path;
  next();
}

module.exports = { attachGlobals };
