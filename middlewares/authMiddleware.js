function ensureAuthenticated(req, res, next) {
  if (!req.session.user) {
    res.redirect("/login");
    return;
  }
  next();
}

function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.session.user || !roles.includes(req.session.user.role)) {
      req.flash("error", "Anda tidak memiliki akses ke halaman ini.");
      res.redirect("/dashboard");
      return;
    }
    next();
  };
}

module.exports = { ensureAuthenticated, allowRoles };
