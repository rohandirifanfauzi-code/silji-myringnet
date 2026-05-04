const tagihanModel = require("../models/tagihanModel");

async function index(req, res, next) {
  try {
    const filters =
      req.user.role === "pelanggan"
        ? { ...req.query, id_pelanggan: req.user.pelanggan_id }
        : req.query;

    if (req.user.role === "teknisi") {
      req.flash("error", "Teknisi tidak memiliki akses ke tagihan.");
      res.redirect("/dashboard");
      return;
    }

    const data = await tagihanModel.getAll(filters);
    res.render("tagihan/index", {
      title: req.user.role === "pelanggan" ? "Tagihan Saya" : "Data Tagihan",
      data: data.rows,
      pagination: data.pagination,
      query: filters,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { index };
