function attachGlobals(req, res, next) {
  req.user = req.user || req.session.user || null;
  res.locals.currentUser = req.user;
  res.locals.hasRole = (...roles) =>
    Boolean(req.user && roles.includes(req.user.role));
  res.locals.successMessages = req.flash("success");
  res.locals.errorMessages = req.flash("error");
  res.locals.currentPath = req.path;
  res.locals.encodeMapQuery = (value = "") => encodeURIComponent(value);
  next();
}

module.exports = { attachGlobals };
