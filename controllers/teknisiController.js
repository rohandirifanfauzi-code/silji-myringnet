const teknisiModel = require("../models/teknisiModel");
const userModel = require("../models/userModel");
const { pool } = require("../models/baseModel");
const accountService = require("../services/accountService");
const { validateTeknisi } = require("../services/validationService");

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
  const connection = await pool.getConnection();
  try {
    const errors = validateTeknisi(req.body);
    if (errors.length) {
      errors.forEach((message) => req.flash("error", message));
      res.redirect("/teknisi/create");
      return;
    }

    await connection.beginTransaction();
    const credentials = await accountService.buildTechnicianAccount({
      nama: req.body.nama,
      no_hp: req.body.no_hp,
    });
    const [userResult] = await connection.query("INSERT INTO users SET ?", {
      username: credentials.username,
      password: credentials.password,
      role: "teknisi",
    });
    await connection.query("INSERT INTO teknisi SET ?", {
      user_id: userResult.insertId,
      nama: req.body.nama,
      no_hp: req.body.no_hp,
      status: req.body.status,
    });
    await connection.commit();
    req.flash(
      "success",
      `Teknisi berhasil ditambahkan. Akun login otomatis: ${credentials.username} / ${credentials.rawPassword}`
    );
    res.redirect("/teknisi");
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
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
    const errors = validateTeknisi(req.body);
    if (errors.length) {
      errors.forEach((message) => req.flash("error", message));
      res.redirect(`/teknisi/${req.params.id}/edit`);
      return;
    }

    await teknisiModel.update(req.params.id, req.body);
    req.flash("success", "Teknisi berhasil diupdate.");
    res.redirect("/teknisi");
  } catch (error) {
    next(error);
  }
}

async function destroy(req, res, next) {
  try {
    const item = await teknisiModel.getById(req.params.id);
    if (item?.user_id) {
      await userModel.remove(item.user_id);
    } else {
      await teknisiModel.remove(req.params.id);
    }
    req.flash("success", "Teknisi berhasil dihapus.");
    res.redirect("/teknisi");
  } catch (error) {
    next(error);
  }
}

module.exports = { index, createForm, store, editForm, update, destroy };
