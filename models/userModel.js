const { pool } = require("./baseModel");

async function findByUsername(username) {
  const [rows] = await pool.query(
    `SELECT users.*,
            admin.id AS admin_id,
            admin.nama AS nama_admin,
            admin.email AS email_admin,
            teknisi.id AS teknisi_id,
            teknisi.nama AS nama_teknisi,
            teknisi.no_hp AS no_hp_teknisi,
            teknisi.status AS status_teknisi,
            pelanggan.id AS pelanggan_id,
            pelanggan.nama AS nama_pelanggan,
            pelanggan.alamat AS alamat_pelanggan,
            pelanggan.no_hp AS no_hp_pelanggan,
            pelanggan.id_paket AS paket_pelanggan,
            pelanggan.tanggal_daftar AS tanggal_daftar_pelanggan
     FROM users
     LEFT JOIN admin ON admin.user_id = users.id
     LEFT JOIN teknisi ON teknisi.user_id = users.id
     LEFT JOIN pelanggan ON pelanggan.user_id = users.id
     WHERE users.username = ?
     LIMIT 1`,
    [username]
  );
  return rows[0] || null;
}

async function findByPelangganId(pelangganId) {
  const [rows] = await pool.query(
    `SELECT users.*
     FROM users
     INNER JOIN pelanggan ON pelanggan.user_id = users.id
     WHERE pelanggan.id = ?
     LIMIT 1`,
    [pelangganId]
  );
  return rows[0] || null;
}

async function findByTeknisiId(teknisiId) {
  const [rows] = await pool.query(
    `SELECT users.*
     FROM users
     INNER JOIN teknisi ON teknisi.user_id = users.id
     WHERE teknisi.id = ?
     LIMIT 1`,
    [teknisiId]
  );
  return rows[0] || null;
}

async function create(data) {
  const [result] = await pool.query("INSERT INTO users SET ?", data);
  return result.insertId;
}

async function update(id, data) {
  const [result] = await pool.query("UPDATE users SET ? WHERE id = ?", [data, id]);
  return result.affectedRows;
}

async function remove(id) {
  const [result] = await pool.query("DELETE FROM users WHERE id = ?", [id]);
  return result.affectedRows;
}

module.exports = {
  findByUsername,
  findByPelangganId,
  findByTeknisiId,
  create,
  update,
  remove,
};
