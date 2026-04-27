const notifikasiModel = require("../models/notifikasiModel");

async function index(req, res, next) {
  try {
    const data = await notifikasiModel.getAll(req.query);
    res.render("notifikasi/index", {
      title: "Notifikasi",
      data: data.rows,
      pagination: data.pagination,
      query: req.query,
    });
  } catch (error) {
    next(error);
  }
}

async function markRead(req, res, next) {
  try {
    await notifikasiModel.update(req.params.id, { status_baca: "SUDAH" });
    res.redirect("/notifikasi");
  } catch (error) {
    next(error);
  }
}

module.exports = { index, markRead };
