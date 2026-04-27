const baseModel = require("./baseModel");

function getAll(params) {
  return baseModel.findAll({
    table: "keluhan",
    joins: "LEFT JOIN pelanggan ON pelanggan.id = keluhan.id_pelanggan",
    select: "keluhan.*, pelanggan.nama AS nama_pelanggan",
    searchableFields: ["pelanggan.nama", "keluhan.deskripsi"],
    filters: {
      "keluhan.status": params.status,
      "keluhan.id_pelanggan": params.id_pelanggan,
    },
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
      select: "keluhan.*, pelanggan.nama AS nama_pelanggan",
    }),
  create: (data) => baseModel.create("keluhan", data),
  update: (id, data) => baseModel.update("keluhan", id, data),
  remove: (id) => baseModel.remove("keluhan", id),
};
