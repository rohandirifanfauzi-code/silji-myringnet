const pool = require("../config/database");

function buildPagination(page = 1, limit = 10) {
  const currentPage = Number(page) > 0 ? Number(page) : 1;
  const perPage = Number(limit) > 0 ? Number(limit) : 10;
  const offset = (currentPage - 1) * perPage;
  return { currentPage, perPage, offset };
}

async function findAll({
  table,
  searchableFields = [],
  filters = {},
  search = "",
  page = 1,
  limit = 10,
  orderBy = "id DESC",
  joins = "",
  select = "*",
}) {
  const { currentPage, perPage, offset } = buildPagination(page, limit);
  const conditions = [];
  const values = [];

  if (search && searchableFields.length) {
    conditions.push(
      `(${searchableFields.map((field) => `${field} LIKE ?`).join(" OR ")})`
    );
    searchableFields.forEach(() => values.push(`%${search}%`));
  }

  Object.entries(filters).forEach(([field, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      conditions.push(`${field} = ?`);
      values.push(value);
    }
  });

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const baseFrom = `FROM ${table} ${joins} ${whereClause}`;

  const [rows] = await pool.query(
    `SELECT ${select} ${baseFrom} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    [...values, perPage, offset]
  );
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total ${baseFrom}`,
    values
  );

  return {
    rows,
    pagination: {
      page: currentPage,
      limit: perPage,
      total: countRows[0].total,
      totalPages: Math.ceil(countRows[0].total / perPage) || 1,
    },
  };
}

async function findById(table, id, options = {}) {
  const select = options.select || `${table}.*`;
  const joins = options.joins || "";
  const idField = options.idField || `${table}.id`;
  const [rows] = await pool.query(
    `SELECT ${select} FROM ${table} ${joins} WHERE ${idField} = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function create(table, data) {
  const [result] = await pool.query(`INSERT INTO ${table} SET ?`, data);
  return result.insertId;
}

async function update(table, id, data) {
  const [result] = await pool.query(`UPDATE ${table} SET ? WHERE id = ?`, [data, id]);
  return result.affectedRows;
}

async function remove(table, id) {
  const [result] = await pool.query(`DELETE FROM ${table} WHERE id = ?`, [id]);
  return result.affectedRows;
}

module.exports = {
  pool,
  findAll,
  findById,
  create,
  update,
  remove,
};
