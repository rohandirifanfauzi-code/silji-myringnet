function attachFlash(req, _res, next) {
  if (!req.session) {
    next();
    return;
  }

  req.session.flash = req.session.flash || {};

  req.flash = (type, message) => {
    if (!type) {
      return [];
    }

    if (message === undefined) {
      const messages = req.session.flash[type] || [];
      delete req.session.flash[type];
      return messages;
    }

    req.session.flash[type] = req.session.flash[type] || [];
    req.session.flash[type].push(message);
    return req.session.flash[type].length;
  };

  next();
}

module.exports = { attachFlash };
