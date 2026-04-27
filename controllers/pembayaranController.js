const pembayaranModel = require("../models/pembayaranModel");
const tagihanModel = require("../models/tagihanModel");
const notificationService = require("../services/notificationService");

async function index(req, res, next) {
  try {
    if (req.session.user.role === "teknisi") {
      req.flash("error", "Teknisi tidak memiliki akses ke pembayaran.");
      res.redirect("/dashboard");
      return;
    }

    const filters =
      req.session.user.role === "pelanggan"
        ? { ...req.query, id_pelanggan: req.session.user.pelanggan_id }
        : req.query;

    const data = await pembayaranModel.getAll(filters);
    const tagihan = await tagihanModel.getAll({
      page: 1,
      limit: 200,
      status: "BELUM BAYAR",
      id_pelanggan:
        req.session.user.role === "pelanggan"
          ? req.session.user.pelanggan_id
          : undefined,
    });
    res.render("pembayaran/index", {
      title: req.session.user.role === "pelanggan" ? "Pembayaran Saya" : "Pembayaran",
      data: data.rows,
      pagination: data.pagination,
      query: filters,
      tagihan: tagihan.rows,
    });
  } catch (error) {
    next(error);
  }
}

async function store(req, res, next) {
  try {
    const tagihan = await tagihanModel.getById(req.body.id_tagihan);
    if (!tagihan) {
      req.flash("error", "Tagihan tidak ditemukan.");
      res.redirect("/pembayaran");
      return;
    }

    if (
      req.session.user.role === "pelanggan" &&
      Number(tagihan.id_pelanggan) !== Number(req.session.user.pelanggan_id)
    ) {
      req.flash("error", "Anda hanya dapat membayar tagihan milik sendiri.");
      res.redirect("/pembayaran");
      return;
    }

    const amount = Number(req.body.jumlah_bayar);

    await pembayaranModel.create({
      id_tagihan: req.body.id_tagihan,
      metode_pembayaran: req.body.metode_pembayaran,
      jumlah_bayar: amount,
      tanggal_bayar: req.body.tanggal_bayar,
    });

    if (tagihan && amount >= Number(tagihan.jumlah_tagihan)) {
      await tagihanModel.update(req.body.id_tagihan, { status_tagihan: "LUNAS" });
    }

    await notificationService.createNotification(
      `Pembayaran untuk tagihan #${req.body.id_tagihan} berhasil diproses.`
    );
    req.flash("success", "Pembayaran berhasil disimpan.");
    res.redirect("/pembayaran");
  } catch (error) {
    next(error);
  }
}

async function destroy(req, res, next) {
  try {
    await pembayaranModel.remove(req.params.id);
    req.flash("success", "Pembayaran berhasil dihapus.");
    res.redirect("/pembayaran");
  } catch (error) {
    next(error);
  }
}

module.exports = { index, store, destroy };
