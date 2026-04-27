const paketModel = require("../models/paketModel");

async function index(req, res, next) {
  try {
    const data = await paketModel.getAll(req.query);
    res.render("paket/index", {
      title: "Data Paket",
      data: data.rows,
      pagination: data.pagination,
      query: req.query,
    });
  } catch (error) {
    next(error);
  }
}

function createForm(req, res) {
  res.render("paket/form", { title: "Tambah Paket", item: null });
}

async function store(req, res, next) {
  try {
    await paketModel.create(req.body);
    req.flash("success", "Paket berhasil ditambahkan.");
    res.redirect("/paket");
  } catch (error) {
    next(error);
  }
}

async function editForm(req, res, next) {
  try {
    const item = await paketModel.getById(req.params.id);
    res.render("paket/form", { title: "Edit Paket", item });
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    await paketModel.update(req.params.id, req.body);
    req.flash("success", "Paket berhasil diupdate.");
    res.redirect("/paket");
  } catch (error) {
    next(error);
  }
}

async function destroy(req, res, next) {
  try {
    await paketModel.remove(req.params.id);
    req.flash("success", "Paket berhasil dihapus.");
    res.redirect("/paket");
  } catch (error) {
    next(error);
  }
}

module.exports = { index, createForm, store, editForm, update, destroy };
