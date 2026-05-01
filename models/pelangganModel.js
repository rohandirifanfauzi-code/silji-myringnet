const baseModel = require("./baseModel");

function getAll(params) {
  return baseModel.findAll({
    table: "pelanggan",
    joins:
      "LEFT JOIN paket ON paket.id = pelanggan.id_paket LEFT JOIN users ON users.id = pelanggan.user_id",
    select: "pelanggan.*, paket.nama_paket, users.username",
    searchableFields: [
      "pelanggan.nama",
      "pelanggan.no_hp",
      "pelanggan.alamat",
      "paket.nama_paket",
      "users.username",
    ],
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
      joins:
        "LEFT JOIN paket ON paket.id = pelanggan.id_paket LEFT JOIN users ON users.id = pelanggan.user_id",
      select: "pelanggan.*, paket.nama_paket, users.username",
    }),
  create: (data) => baseModel.create("pelanggan", data),
  update: (id, data) => baseModel.update("pelanggan", id, data),
  remove: (id) => baseModel.remove("pelanggan", id),
};
