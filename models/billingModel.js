const { pool } = require("./baseModel");

async function getEligibleCustomers() {
  const [rows] = await pool.query(
    `SELECT pelanggan.id, pelanggan.nama, pelanggan.tanggal_daftar,
            paket.id AS id_paket, paket.nama_paket, paket.harga
     FROM pelanggan
     INNER JOIN paket ON paket.id = pelanggan.id_paket
     WHERE EXISTS (
       SELECT 1
       FROM tugas_teknisi
       WHERE tugas_teknisi.id_pelanggan = pelanggan.id
         AND tugas_teknisi.tipe_tugas = 'psb'
         AND tugas_teknisi.status = 'selesai'
     )
     ORDER BY pelanggan.id ASC`
  );
  return rows;
}

async function getCustomerById(id) {
  const [rows] = await pool.query(
    `SELECT pelanggan.id, pelanggan.nama, pelanggan.tanggal_daftar,
            pelanggan.no_hp, paket.id AS id_paket, paket.nama_paket, paket.harga
     FROM pelanggan
     INNER JOIN paket ON paket.id = pelanggan.id_paket
     WHERE pelanggan.id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function hasCompletedPsbTask(customerId) {
  const [rows] = await pool.query(
    `SELECT 1
     FROM tugas_teknisi
     WHERE id_pelanggan = ?
       AND tipe_tugas = 'psb'
       AND status = 'selesai'
     LIMIT 1`,
    [customerId]
  );
  return Boolean(rows[0]);
}

module.exports = { getEligibleCustomers, getCustomerById, hasCompletedPsbTask };
