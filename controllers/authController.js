const userModel = require("../models/userModel");

function showLogin(req, res) {
  if (req.session.user) {
    res.redirect("/dashboard");
    return;
  }
  res.render("auth/login", { title: "Login" });
}

async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    const user = await userModel.findByUsername(username);

    if (!user || user.password !== password) {
      req.flash("error", "Username atau password salah.");
      res.redirect("/login");
      return;
    }

    req.session.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      pelanggan_id: user.pelanggan_id,
      teknisi_id: user.teknisi_id,
      nama: user.nama || user.nama_pelanggan || user.nama_teknisi || user.username,
    };

    res.redirect("/dashboard");
  } catch (error) {
    next(error);
  }
}

function logout(req, res) {
  req.session.destroy(() => {
    res.redirect("/login");
  });
}

module.exports = { showLogin, login, logout };
