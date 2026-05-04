const baseModel = require("./baseModel");

function getAll(params = {}) {
  return baseModel.findAll({
    table: "audit_log",
    joins: "LEFT JOIN users ON users.id = audit_log.user_id",
    select: "audit_log.*, users.username, users.role",
    searchableFields: ["audit_log.aksi", "audit_log.tabel", "audit_log.deskripsi", "users.username"],
    filters: {
      "audit_log.aksi": params.aksi,
      "audit_log.tabel": params.tabel,
    },
    search: params.search,
    page: params.page,
    limit: params.limit,
    orderBy: "audit_log.created_at DESC, audit_log.id DESC",
  });
}

module.exports = {
  getAll,
  create: (data) => baseModel.create("audit_log", data),
};
