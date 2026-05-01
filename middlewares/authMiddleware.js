function ensureAuthenticated(req, res, next) {
  if (!req.session.user) {
    res.redirect("/login");
    return;
  }
  req.user = req.session.user;
  next();
}

function allowRoles(...roles) {
  return (req, res, next) => {
    const activeUser = req.user || req.session.user;
    if (!activeUser || !roles.includes(activeUser.role)) {
      req.flash("error", "Anda tidak memiliki akses ke halaman ini.");
      res.redirect("/dashboard");
      return;
    }
    req.user = activeUser;
    next();
  };
}

module.exports = { ensureAuthenticated, allowRoles };
