const baseModel = require("./baseModel");
const { pool } = require("./baseModel");

const baseJoins = `
  LEFT JOIN teknisi ON teknisi.id = notifikasi.id_teknisi
  LEFT JOIN pelanggan ON pelanggan.id = notifikasi.id_pelanggan
  LEFT JOIN tugas_teknisi ON tugas_teknisi.id = notifikasi.id_tugas
`;

const baseSelect = `
  notifikasi.*,
  teknisi.nama AS nama_teknisi,
  pelanggan.nama AS nama_pelanggan,
  tugas_teknisi.tipe_tugas,
  tugas_teknisi.tanggal_tugas,
  tugas_teknisi.status AS status_tugas
`;

async function getAll(params = {}) {
  return baseModel.findAll({
    table: "notifikasi",
    joins: baseJoins,
    select: baseSelect,
    searchableFields: ["notifikasi.pesan", "notifikasi.alamat", "pelanggan.nama"],
    filters: {
      "notifikasi.status_notifikasi": params.status_notifikasi || params.status,
      "notifikasi.status_baca": params.status_baca,
      "notifikasi.role_tujuan": params.role_tujuan,
      "notifikasi.tipe": params.tipe,
    },
    search: params.search,
    page: params.page,
    limit: params.limit,
    orderBy: "notifikasi.tanggal DESC, notifikasi.id DESC",
  });
}

async function getLatestByRole(role, limit = 5) {
  const [rows] = await pool.query(
    `SELECT ${baseSelect}
     FROM notifikasi
     ${baseJoins}
     WHERE notifikasi.role_tujuan IN (?, 'semua')
     ORDER BY notifikasi.tanggal DESC, notifikasi.id DESC
     LIMIT ?`,
    [role, limit]
  );
  return rows;
}

async function getForTechnician(teknisiId, params = {}) {
  const page = Number(params.page) > 0 ? Number(params.page) : 1;
  const limit = Number(params.limit) > 0 ? Number(params.limit) : 10;
  const offset = (page - 1) * limit;
  const conditions = [
    "notifikasi.role_tujuan = 'teknisi'",
    "(notifikasi.id_teknisi IS NULL OR notifikasi.id_teknisi = ?)",
  ];
  const values = [teknisiId];

  if (params.status_notifikasi || params.status) {
    conditions.push("notifikasi.status_notifikasi = ?");
    values.push(params.status_notifikasi || params.status);
  }

  if (params.status_baca) {
    conditions.push("notifikasi.status_baca = ?");
    values.push(params.status_baca);
  }

  if (params.search) {
    conditions.push(
      "(notifikasi.pesan LIKE ? OR notifikasi.alamat LIKE ? OR pelanggan.nama LIKE ?)"
    );
    values.push(`%${params.search}%`, `%${params.search}%`, `%${params.search}%`);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  const [rows] = await pool.query(
    `SELECT ${baseSelect}
     FROM notifikasi
     ${baseJoins}
     ${whereClause}
     ORDER BY COALESCE(notifikasi.tanggal_saran, CURDATE()) ASC, notifikasi.tanggal DESC, notifikasi.id DESC
     LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM notifikasi
     ${baseJoins}
     ${whereClause}`,
    values
  );

  return {
    rows,
    pagination: {
      page,
      limit,
      total: countRows[0].total,
      totalPages: Math.ceil(countRows[0].total / limit) || 1,
    },
  };
}

module.exports = {
  getAll,
  getForTechnician,
  getLatest: (limit = 5) => getLatestByRole("admin", limit),
  getLatestByRole,
  getById: (id) =>
    baseModel.findById("notifikasi", id, {
      joins: baseJoins,
      select: baseSelect,
    }),
  create: (data) => baseModel.create("notifikasi", data),
  update: (id, data) => baseModel.update("notifikasi", id, data),
  updateByTaskId: async (idTugas, data) => {
    const [result] = await pool.query("UPDATE notifikasi SET ? WHERE id_tugas = ?", [
      data,
      idTugas,
    ]);
    return result.affectedRows;
  },
};
