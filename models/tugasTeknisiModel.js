const baseModel = require("./baseModel");
const { pool } = require("./baseModel");

const baseJoins = `
  LEFT JOIN keluhan ON keluhan.id = tugas_teknisi.id_keluhan
  LEFT JOIN pelanggan pelanggan_keluhan ON pelanggan_keluhan.id = keluhan.id_pelanggan
  LEFT JOIN pelanggan pelanggan_langsung ON pelanggan_langsung.id = tugas_teknisi.id_pelanggan
  LEFT JOIN teknisi ON teknisi.id = tugas_teknisi.id_teknisi
`;

const baseSelect = `
  tugas_teknisi.*,
  COALESCE(pelanggan_keluhan.nama, pelanggan_langsung.nama) AS nama_pelanggan,
  COALESCE(pelanggan_keluhan.alamat, pelanggan_langsung.alamat, tugas_teknisi.detail_lokasi) AS alamat_pelanggan,
  teknisi.nama AS nama_teknisi,
  keluhan.deskripsi AS deskripsi_keluhan
`;

function buildConditions(params = {}) {
  const conditions = [];
  const values = [];

  if (params.status) {
    conditions.push("tugas_teknisi.status = ?");
    values.push(params.status);
  }

  if (params.id_teknisi) {
    conditions.push("tugas_teknisi.id_teknisi = ?");
    values.push(params.id_teknisi);
  }

  if (params.tipe_tugas) {
    conditions.push("tugas_teknisi.tipe_tugas = ?");
    values.push(params.tipe_tugas);
  }

  if (params.tanggal_tugas) {
    conditions.push("tugas_teknisi.tanggal_tugas = ?");
    values.push(params.tanggal_tugas);
  }

  if (params.todayOnly) {
    conditions.push("tugas_teknisi.tanggal_tugas = CURDATE()");
  }

  if (params.historyOnly) {
    conditions.push("tugas_teknisi.tanggal_tugas < CURDATE()");
  }

  if (params.search) {
    conditions.push(
      `(
        COALESCE(pelanggan_keluhan.nama, pelanggan_langsung.nama) LIKE ?
        OR teknisi.nama LIKE ?
        OR tugas_teknisi.detail_lokasi LIKE ?
      )`
    );
    values.push(`%${params.search}%`, `%${params.search}%`, `%${params.search}%`);
  }

  return { conditions, values };
}

async function getAll(params = {}) {
  const { conditions, values } = buildConditions(params);
  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const page = Number(params.page) > 0 ? Number(params.page) : 1;
  const limit = Number(params.limit) > 0 ? Number(params.limit) : 10;
  const offset = (page - 1) * limit;

  const [rows] = await pool.query(
    `SELECT ${baseSelect}
     FROM tugas_teknisi
     ${baseJoins}
     ${whereClause}
     ORDER BY COALESCE(tugas_teknisi.tanggal_tugas, '9999-12-31') ASC, tugas_teknisi.id DESC
     LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM tugas_teknisi
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

async function getTodayByTechnician(teknisiId, limit = 10) {
  const [rows] = await pool.query(
    `SELECT ${baseSelect}
     FROM tugas_teknisi
     ${baseJoins}
     WHERE tugas_teknisi.id_teknisi = ? AND tugas_teknisi.tanggal_tugas = CURDATE()
     ORDER BY tugas_teknisi.status = 'SELESAI', tugas_teknisi.id DESC
     LIMIT ?`,
    [teknisiId, limit]
  );
  return rows;
}

async function getHistoryByTechnician(teknisiId, limit = 10) {
  const [rows] = await pool.query(
    `SELECT ${baseSelect}
     FROM tugas_teknisi
     ${baseJoins}
     WHERE tugas_teknisi.id_teknisi = ? AND tugas_teknisi.tanggal_tugas < CURDATE()
     ORDER BY tugas_teknisi.tanggal_tugas DESC, tugas_teknisi.id DESC
     LIMIT ?`,
    [teknisiId, limit]
  );
  return rows;
}

module.exports = {
  getAll,
  getTodayByTechnician,
  getHistoryByTechnician,
  getById: (id) =>
    baseModel.findById("tugas_teknisi", id, {
      joins: baseJoins,
      select: baseSelect,
    }),
  create: (data) => baseModel.create("tugas_teknisi", data),
  update: (id, data) => baseModel.update("tugas_teknisi", id, data),
  remove: (id) => baseModel.remove("tugas_teknisi", id),
};
