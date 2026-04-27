const { pool } = require("./baseModel");

async function getEligibleCustomers() {
  const [rows] = await pool.query(
    `SELECT pelanggan.id, pelanggan.nama, pelanggan.email, pelanggan.tanggal_daftar,
            paket.id AS id_paket, paket.nama_paket, paket.harga
     FROM pelanggan
     INNER JOIN paket ON paket.id = pelanggan.id_paket
     ORDER BY pelanggan.id ASC`
  );
  return rows;
}

async function getCustomerById(id) {
  const [rows] = await pool.query(
    `SELECT pelanggan.id, pelanggan.nama, pelanggan.email, pelanggan.tanggal_daftar,
            pelanggan.no_hp, paket.id AS id_paket, paket.nama_paket, paket.harga
     FROM pelanggan
     INNER JOIN paket ON paket.id = pelanggan.id_paket
     WHERE pelanggan.id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

module.exports = { getEligibleCustomers, getCustomerById };
