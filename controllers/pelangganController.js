const pelangganModel = require("../models/pelangganModel");
const paketModel = require("../models/paketModel");
const { pool } = require("../models/baseModel");
const accountService = require("../services/accountService");
const billingService = require("../services/billingService");

async function index(req, res, next) {
  try {
    if (req.session.user.role === "pelanggan") {
      const item = await pelangganModel.getById(req.session.user.pelanggan_id);
      res.render("pelanggan/index", {
        title: "Profil Pelanggan",
        data: item ? [item] : [],
        pagination: { page: 1, limit: 1, total: item ? 1 : 0, totalPages: 1 },
        query: req.query,
      });
      return;
    }

    if (!["admin", "manajemen"].includes(req.session.user.role)) {
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
    await connection.beginTransaction();
    const pelangganPayload = {
      nama: req.body.nama,
      email: req.body.email,
      no_hp: req.body.no_hp,
      alamat: req.body.alamat,
      id_paket: req.body.id_paket,
      tanggal_daftar: req.body.tanggal_daftar,
    };
    const [pelangganResult] = await connection.query(
      "INSERT INTO pelanggan SET ?",
      pelangganPayload
    );
    const pelanggan = {
      id: pelangganResult.insertId,
      ...pelangganPayload,
    };

    const credentials = await accountService.buildCustomerAccount(pelanggan);
    await connection.query("INSERT INTO users SET ?", {
      username: credentials.username,
      password: credentials.password,
      role: "pelanggan",
      nama: pelanggan.nama,
      pelanggan_id: pelanggan.id,
      teknisi_id: null,
    });
    await connection.commit();
    await billingService.generateInitialBillForCustomer(pelanggan.id);
    req.flash(
      "success",
      `Pelanggan berhasil ditambahkan. Akun login otomatis: ${credentials.username} / ${credentials.password}`
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
    const pelangganPayload = {
      nama: req.body.nama,
      email: req.body.email,
      no_hp: req.body.no_hp,
      alamat: req.body.alamat,
      id_paket: req.body.id_paket,
      tanggal_daftar: req.body.tanggal_daftar,
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
    await pelangganModel.remove(req.params.id);
    req.flash("success", "Pelanggan berhasil dihapus.");
    res.redirect("/pelanggan");
  } catch (error) {
    next(error);
  }
}

module.exports = { index, createForm, store, editForm, update, destroy };
