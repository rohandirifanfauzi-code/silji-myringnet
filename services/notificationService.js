const notifikasiModel = require("../models/notifikasiModel");

async function createNotification(payload) {
  const data =
    typeof payload === "string"
      ? { pesan: payload }
      : payload;

  await notifikasiModel.create({
    role_tujuan: "admin",
    tipe: "general",
    alamat: null,
    tanggal_saran: null,
    id_teknisi: null,
    id_pelanggan: null,
    id_tugas: null,
    ...data,
    tanggal: new Date(),
    status_baca: "BELUM",
  });
}

module.exports = { createNotification };
