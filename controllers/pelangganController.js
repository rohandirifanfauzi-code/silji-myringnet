const pelangganModel = require("../models/pelangganModel");
const paketModel = require("../models/paketModel");
const userModel = require("../models/userModel");
const { pool } = require("../models/baseModel");
const accountService = require("../services/accountService");
const notificationService = require("../services/notificationService");
const { validatePelanggan } = require("../services/validationService");

async function index(req, res, next) {
  try {
    if (req.user.role === "pelanggan") {
      const item = await pelangganModel.getById(req.user.pelanggan_id);
      res.render("pelanggan/index", {
        title: "Profil Pelanggan",
        data: item ? [item] : [],
        pagination: { page: 1, limit: 1, total: item ? 1 : 0, totalPages: 1 },
        query: req.query,
      });
      return;
    }

    if (req.user.role !== "admin") {
      req.flash("error", "Anda tidak memiliki akses ke halaman ini.");
      res.redirect("/dashboard");
      return;
    }

    const data = await pelangganModel.getAll(req.query);
    res.render("pelanggan/index", {
      title: "Data Pelanggan",
      data: data.rows,
      pagination: data.pagination,
      query: req.query,
    });
  } catch (error) {
    next(error);
  }
}

async function createForm(req, res, next) {
  try {
    const paket = await paketModel.getAll({ page: 1, limit: 100 });
    res.render("pelanggan/form", {
      title: "Tambah Pelanggan",
      item: null,
      paket: paket.rows,
    });
  } catch (error) {
    next(error);
  }
}

async function store(req, res, next) {
  const connection = await pool.getConnection();
  try {
    const errors = validatePelanggan(req.body);
    if (errors.length) {
      errors.forEach((message) => req.flash("error", message));
      res.redirect("/pelanggan/create");
      return;
    }

    await connection.beginTransaction();
    const credentials = await accountService.buildCustomerAccount({
      nama: req.body.nama,
      no_hp: req.body.no_hp,
    });
    const [userResult] = await connection.query("INSERT INTO users SET ?", {
      username: credentials.username,
      password: credentials.password,
      role: "pelanggan",
    });
    const pelangganPayload = {
      user_id: userResult.insertId,
      nama: req.body.nama,
      email: req.body.email || null,
      no_hp: req.body.no_hp,
      alamat: req.body.alamat,
      latitude: req.body.latitude || null,
      longitude: req.body.longitude || null,
      id_paket: req.body.id_paket,
      tanggal_daftar: new Date().toISOString().split("T")[0],
    };
    const [pelangganResult] = await connection.query(
      "INSERT INTO pelanggan SET ?",
      pelangganPayload
    );
    const pelanggan = {
      id: pelangganResult.insertId,
      ...pelangganPayload,
    };
    await connection.commit();
    await notificationService.createNotification({
      pesan: `Pemasangan baru pelanggan ${req.body.nama}.`,
      role_tujuan: "teknisi",
      tipe: "psb",
      alamat: req.body.alamat,
      id_pelanggan: pelanggan.id,
    });
    req.flash(
      "success",
      `Pelanggan berhasil ditambahkan. Akun login otomatis: ${credentials.username} / ${credentials.rawPassword}`
    );
    res.redirect("/pelanggan");
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
}

async function editForm(req, res, next) {
  try {
    const [item, paket] = await Promise.all([
      pelangganModel.getById(req.params.id),
      paketModel.getAll({ page: 1, limit: 100 }),
    ]);
    res.render("pelanggan/form", {
      title: "Edit Pelanggan",
      item,
      paket: paket.rows,
    });
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const errors = validatePelanggan(req.body);
    if (errors.length) {
      errors.forEach((message) => req.flash("error", message));
      res.redirect(`/pelanggan/${req.params.id}/edit`);
      return;
    }

    const existing = await pelangganModel.getById(req.params.id);
    const pelangganPayload = {
      nama: req.body.nama,
      email: req.body.email || null,
      no_hp: req.body.no_hp,
      alamat: req.body.alamat,
      latitude: req.body.latitude || null,
      longitude: req.body.longitude || null,
      id_paket: req.body.id_paket,
      tanggal_daftar: existing?.tanggal_daftar,
    };
    await pelangganModel.update(req.params.id, pelangganPayload);
    const synced = await accountService.syncCustomerAccount({
      id: Number(req.params.id),
      ...pelangganPayload,
    });
    req.flash(
      "success",
      `Pelanggan berhasil diupdate. Akun terkait: ${synced.username}`
    );
    res.redirect("/pelanggan");
  } catch (error) {
    next(error);
  }
}

async function destroy(req, res, next) {
  try {
    const item = await pelangganModel.getById(req.params.id);
    if (item?.user_id) {
      await userModel.remove(item.user_id);
    } else {
      await pelangganModel.remove(req.params.id);
    }
    req.flash("success", "Pelanggan berhasil dihapus.");
    res.redirect("/pelanggan");
  } catch (error) {
    next(error);
  }
}

module.exports = { index, createForm, store, editForm, update, destroy };
