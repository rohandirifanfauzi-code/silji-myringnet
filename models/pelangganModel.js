const baseModel = require("./baseModel");

function getAll(params) {
  return baseModel.findAll({
    table: "pelanggan",
    joins: "LEFT JOIN paket ON paket.id = pelanggan.id_paket",
    select: "pelanggan.*, paket.nama_paket",
    searchableFields: ["pelanggan.nama", "pelanggan.email", "pelanggan.no_hp", "pelanggan.alamat", "paket.nama_paket"],
    search: params.search,
    page: params.page,
    limit: params.limit,
    orderBy: "tanggal_daftar DESC",
  });
}

module.exports = {
  getAll,
  getById: (id) =>
    baseModel.findById("pelanggan", id, {
      joins: "LEFT JOIN paket ON paket.id = pelanggan.id_paket",
      select: "pelanggan.*, paket.nama_paket",
    }),
  create: (data) => baseModel.create("pelanggan", data),
  update: (id, data) => baseModel.update("pelanggan", id, data),
  remove: (id) => baseModel.remove("pelanggan", id),
};
