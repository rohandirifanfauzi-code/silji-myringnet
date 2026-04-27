const notifikasiModel = require("../models/notifikasiModel");

async function createNotification(pesan) {
  await notifikasiModel.create({
    pesan,
    tanggal: new Date(),
    status_baca: "BELUM",
  });
}

module.exports = { createNotification };
