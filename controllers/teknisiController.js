const teknisiModel = require("../models/teknisiModel");

async function index(req, res, next) {
  try {
    const data = await teknisiModel.getAll(req.query);
    res.render("teknisi/index", {
      title: "Data Teknisi",
      data: data.rows,
      pagination: data.pagination,
      query: req.query,
    });
  } catch (error) {
    next(error);
  }
}

function createForm(req, res) {
  res.render("teknisi/form", { title: "Tambah Teknisi", item: null });
}

async function store(req, res, next) {
  try {
    await teknisiModel.create(req.body);
    req.flash("success", "Teknisi berhasil ditambahkan.");
    res.redirect("/teknisi");
  } catch (error) {
    next(error);
  }
}

async function editForm(req, res, next) {
  try {
    const item = await teknisiModel.getById(req.params.id);
    res.render("teknisi/form", { title: "Edit Teknisi", item });
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    await teknisiModel.update(req.params.id, req.body);
    req.flash("success", "Teknisi berhasil diupdate.");
    res.redirect("/teknisi");
  } catch (error) {
    next(error);
  }
}

async function destroy(req, res, next) {
  try {
    await teknisiModel.remove(req.params.id);
    req.flash("success", "Teknisi berhasil dihapus.");
    res.redirect("/teknisi");
  } catch (error) {
    next(error);
  }
}

module.exports = { index, createForm, store, editForm, update, destroy };
