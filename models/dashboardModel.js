const { pool } = require("./baseModel");

async function getSummary() {
  const queries = [
    pool.query("SELECT COUNT(*) AS total_pelanggan FROM pelanggan"),
    pool.query("SELECT COUNT(*) AS total FROM tagihan"),
    pool.query("SELECT COUNT(*) AS total FROM pembayaran"),
    pool.query("SELECT COUNT(*) AS total FROM keluhan"),
  ];

  const results = await Promise.all(queries);

  return {
    totalPelanggan: results[0][0][0].total_pelanggan,
    totalTagihan: results[1][0][0].total,
    totalPembayaran: results[2][0][0].total,
    totalKeluhan: results[3][0][0].total,
  };
}

async function getCustomerSummary(pelangganId) {
  const queries = [
    pool.query("SELECT COUNT(*) AS total FROM tagihan WHERE id_pelanggan = ?", [pelangganId]),
    pool.query(
      `SELECT COUNT(*) AS total
       FROM pembayaran
       INNER JOIN tagihan ON tagihan.id = pembayaran.id_tagihan
       WHERE tagihan.id_pelanggan = ?`,
      [pelangganId]
    ),
    pool.query("SELECT COUNT(*) AS total FROM keluhan WHERE id_pelanggan = ?", [pelangganId]),
    pool.query(
      "SELECT COUNT(*) AS total FROM tagihan WHERE id_pelanggan = ? AND status_tagihan = 'belum_bayar'",
      [pelangganId]
    ),
  ];

  const results = await Promise.all(queries);

  return {
    totalPelanggan: 1,
    totalTagihan: results[0][0][0].total,
    totalPembayaran: results[1][0][0].total,
    totalKeluhan: results[2][0][0].total,
    infoTambahan: {
      label: "Tagihan Belum Bayar",
      total: results[3][0][0].total,
    },
  };
}

async function getTechnicianSummary(teknisiId) {
  const queries = [
    pool.query("SELECT COUNT(*) AS total FROM tugas_teknisi WHERE id_teknisi = ?", [teknisiId]),
    pool.query(
      "SELECT COUNT(*) AS total FROM tugas_teknisi WHERE id_teknisi = ? AND status = 'proses'",
      [teknisiId]
    ),
    pool.query(
      "SELECT COUNT(*) AS total FROM tugas_teknisi WHERE id_teknisi = ? AND status = 'selesai'",
      [teknisiId]
    ),
    pool.query(
      `SELECT COUNT(*) AS total
       FROM tugas_teknisi
       INNER JOIN keluhan ON keluhan.id = tugas_teknisi.id_keluhan
       WHERE tugas_teknisi.id_teknisi = ? AND keluhan.status <> 'selesai'`,
      [teknisiId]
    ),
  ];

  const results = await Promise.all(queries);

  return {
    totalPelanggan: results[0][0][0].total,
    totalTagihan: results[1][0][0].total,
    totalPembayaran: results[2][0][0].total,
    totalKeluhan: results[3][0][0].total,
    infoTambahan: {
      label: "Tugas Aktif",
      total: results[1][0][0].total,
    },
  };
}

async function getRecentInstallationRequests(limit = 5) {
  const [rows] = await pool.query(
    `SELECT pelanggan.id, pelanggan.nama, pelanggan.alamat, pelanggan.no_hp, pelanggan.tanggal_daftar,
            paket.nama_paket
     FROM pelanggan
     LEFT JOIN paket ON paket.id = pelanggan.id_paket
     ORDER BY pelanggan.tanggal_daftar DESC, pelanggan.id DESC
     LIMIT ?`,
    [limit]
  );
  return rows;
}

module.exports = {
  getSummary,
  getCustomerSummary,
  getTechnicianSummary,
  getRecentInstallationRequests,
};
