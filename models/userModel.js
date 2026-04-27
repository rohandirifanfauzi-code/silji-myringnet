const { pool } = require("./baseModel");

async function findByUsername(username) {
  const [rows] = await pool.query(
    `SELECT users.*, pelanggan.nama AS nama_pelanggan, teknisi.nama AS nama_teknisi
     FROM users
     LEFT JOIN pelanggan ON pelanggan.id = users.pelanggan_id
     LEFT JOIN teknisi ON teknisi.id = users.teknisi_id
     WHERE users.username = ?
     LIMIT 1`,
    [username]
  );
  return rows[0] || null;
}

async function findByPelangganId(pelangganId) {
  const [rows] = await pool.query(
    "SELECT * FROM users WHERE pelanggan_id = ? LIMIT 1",
    [pelangganId]
  );
  return rows[0] || null;
}

async function findByTeknisiId(teknisiId) {
  const [rows] = await pool.query(
    "SELECT * FROM users WHERE teknisi_id = ? LIMIT 1",
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

module.exports = {
  findByUsername,
  findByPelangganId,
  findByTeknisiId,
  create,
  update,
};
