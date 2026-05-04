const userModel = require("../models/userModel");
const { verifyPassword } = require("../services/passwordService");
const { validateLogin } = require("../services/validationService");
const auditService = require("../services/auditService");

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
    const errors = validateLogin(req.body);
    if (errors.length) {
      errors.forEach((message) => req.flash("error", message));
      res.redirect("/login");
      return;
    }

    const user = await userModel.findByUsername(username);

    if (!user || !verifyPassword(password, user.password)) {
      req.flash("error", "Username atau password salah.");
      res.redirect("/login");
      return;
    }

    const roleProfile =
      user.role === "admin"
        ? {
            admin_id: user.admin_id,
            nama: user.nama_admin,
            email: user.email_admin,
          }
        : user.role === "manajemen"
          ? {
              manajemen_id: user.manajemen_id,
              nama: user.nama_manajemen,
              email: user.email_manajemen,
            }
          : user.role === "teknisi"
          ? {
              teknisi_id: user.teknisi_id,
              nama: user.nama_teknisi,
              no_hp: user.no_hp_teknisi,
              status: user.status_teknisi,
            }
          : {
              pelanggan_id: user.pelanggan_id,
              nama: user.nama_pelanggan,
              alamat: user.alamat_pelanggan,
              no_hp: user.no_hp_pelanggan,
              id_paket: user.paket_pelanggan,
              tanggal_daftar: user.tanggal_daftar_pelanggan,
            };

    req.session.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      ...roleProfile,
    };

    auditService.log(req, "login", "users", `User ${user.username} login sebagai ${user.role}.`);
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
