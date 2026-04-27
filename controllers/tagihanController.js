const tagihanModel = require("../models/tagihanModel");
const pelangganModel = require("../models/pelangganModel");
const paketModel = require("../models/paketModel");
const notificationService = require("../services/notificationService");

async function index(req, res, next) {
  try {
    const filters =
      req.session.user.role === "pelanggan"
        ? { ...req.query, id_pelanggan: req.session.user.pelanggan_id }
        : req.query;

    if (req.session.user.role === "teknisi") {
      req.flash("error", "Teknisi tidak memiliki akses ke tagihan.");
      res.redirect("/dashboard");
      return;
    }

    const data = await tagihanModel.getAll(filters);
    res.render("tagihan/index", {
      title: req.session.user.role === "pelanggan" ? "Tagihan Saya" : "Data Tagihan",
      data: data.rows,
      pagination: data.pagination,
      query: filters,
    });
  } catch (error) {
    next(error);
  }
}

async function createForm(req, res, next) {
  try {
    const [pelanggan, paket] = await Promise.all([
      pelangganModel.getAll({ page: 1, limit: 100 }),
      paketModel.getAll({ page: 1, limit: 100 }),
    ]);
    res.render("tagihan/form", {
      title: "Tambah Tagihan",
      item: null,
      pelanggan: pelanggan.rows,
      paket: paket.rows,
    });
  } catch (error) {
    next(error);
  }
}

async function store(req, res, next) {
  try {
    const id = await tagihanModel.create({
      id_pelanggan: req.body.id_pelanggan,
      id_paket: req.body.id_paket,
      tanggal_tagihan: req.body.tanggal_tagihan,
      jumlah_tagihan: req.body.jumlah_tagihan,
      status_tagihan: req.body.status_tagihan,
    });
    await notificationService.createNotification(
      `Tagihan baru #${id} berhasil dibuat untuk pelanggan ID ${req.body.id_pelanggan}.`
    );
    req.flash("success", "Tagihan berhasil ditambahkan.");
    res.redirect("/tagihan");
  } catch (error) {
    next(error);
  }
}

async function editForm(req, res, next) {
  try {
    const [item, pelanggan, paket] = await Promise.all([
      tagihanModel.getById(req.params.id),
      pelangganModel.getAll({ page: 1, limit: 100 }),
      paketModel.getAll({ page: 1, limit: 100 }),
    ]);
    res.render("tagihan/form", {
      title: "Edit Tagihan",
      item,
      pelanggan: pelanggan.rows,
      paket: paket.rows,
    });
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    await tagihanModel.update(req.params.id, {
      id_pelanggan: req.body.id_pelanggan,
      id_paket: req.body.id_paket,
      tanggal_tagihan: req.body.tanggal_tagihan,
      jumlah_tagihan: req.body.jumlah_tagihan,
      status_tagihan: req.body.status_tagihan,
    });
    req.flash("success", "Tagihan berhasil diupdate.");
    res.redirect("/tagihan");
  } catch (error) {
    next(error);
  }
}

async function destroy(req, res, next) {
  try {
    await tagihanModel.remove(req.params.id);
    req.flash("success", "Tagihan berhasil dihapus.");
    res.redirect("/tagihan");
  } catch (error) {
    next(error);
  }
}

module.exports = { index, createForm, store, editForm, update, destroy };
