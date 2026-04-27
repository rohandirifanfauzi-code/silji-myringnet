const dashboardModel = require("../models/dashboardModel");
const notifikasiModel = require("../models/notifikasiModel");

async function index(req, res, next) {
  try {
    let summary;
    let metricLabels = {
      totalPelanggan: "Total Pelanggan",
      totalTagihan: "Total Tagihan",
      totalPembayaran: "Total Pembayaran",
      totalKeluhan: "Total Keluhan",
    };
    if (req.session.user.role === "pelanggan") {
      summary = await dashboardModel.getCustomerSummary(req.session.user.pelanggan_id);
      metricLabels = {
        totalPelanggan: "Profil Aktif",
        totalTagihan: "Total Tagihan",
        totalPembayaran: "Riwayat Bayar",
        totalKeluhan: "Keluhan Saya",
      };
    } else if (req.session.user.role === "teknisi") {
      summary = await dashboardModel.getTechnicianSummary(req.session.user.teknisi_id);
      metricLabels = {
        totalPelanggan: "Total Tugas",
        totalTagihan: "Sedang Proses",
        totalPembayaran: "Tugas Selesai",
        totalKeluhan: "Keluhan Aktif",
      };
    } else {
      summary = await dashboardModel.getSummary();
    }

    const notifications = await notifikasiModel.getAll({ page: 1, limit: 5 });
    res.render("dashboard/index", {
      title: "Dashboard",
      summary,
      metricLabels,
      notifications: notifications.rows,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { index };
