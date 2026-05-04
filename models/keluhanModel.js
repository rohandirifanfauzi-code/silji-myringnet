const baseModel = require("./baseModel");

function getAll(params) {
  const filters = {
    "keluhan.status": params.status,
    "keluhan.id_pelanggan": params.id_pelanggan,
  };
  const extraConditions = [];

  if (params.unassignedOnly) {
    filters["keluhan.status"] = "pending";
    extraConditions.push(
      "NOT EXISTS (SELECT 1 FROM tugas_teknisi WHERE tugas_teknisi.id_keluhan = keluhan.id)"
    );
  }

  return baseModel.findAll({
    table: "keluhan",
    joins: "LEFT JOIN pelanggan ON pelanggan.id = keluhan.id_pelanggan",
    select: "keluhan.*, pelanggan.nama AS nama_pelanggan, pelanggan.alamat AS alamat_pelanggan",
    searchableFields: ["pelanggan.nama", "keluhan.deskripsi"],
    filters,
    extraConditions,
    search: params.search,
    page: params.page,
    limit: params.limit,
    orderBy: "keluhan.tanggal DESC",
  });
}

module.exports = {
  getAll,
  getById: (id) =>
    baseModel.findById("keluhan", id, {
      joins: "LEFT JOIN pelanggan ON pelanggan.id = keluhan.id_pelanggan",
      select: "keluhan.*, pelanggan.nama AS nama_pelanggan, pelanggan.alamat AS alamat_pelanggan",
    }),
  create: (data) => baseModel.create("keluhan", data),
  update: (id, data) => baseModel.update("keluhan", id, data),
  remove: (id) => baseModel.remove("keluhan", id),
};
