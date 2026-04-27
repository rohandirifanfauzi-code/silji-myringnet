const baseModel = require("./baseModel");

function getAll(params) {
  return baseModel.findAll({
    table: "tugas_teknisi",
    joins:
      "LEFT JOIN keluhan ON keluhan.id = tugas_teknisi.id_keluhan LEFT JOIN pelanggan ON pelanggan.id = keluhan.id_pelanggan LEFT JOIN teknisi ON teknisi.id = tugas_teknisi.id_teknisi",
    select:
      "tugas_teknisi.*, pelanggan.nama AS nama_pelanggan, teknisi.nama AS nama_teknisi, keluhan.deskripsi AS deskripsi_keluhan",
    searchableFields: ["pelanggan.nama", "teknisi.nama", "tugas_teknisi.detail_lokasi"],
    filters: {
      "tugas_teknisi.status": params.status,
      "tugas_teknisi.id_teknisi": params.id_teknisi,
    },
    search: params.search,
    page: params.page,
    limit: params.limit,
    orderBy: "tugas_teknisi.id DESC",
  });
}

module.exports = {
  getAll,
  getById: (id) =>
    baseModel.findById("tugas_teknisi", id, {
      joins:
        "LEFT JOIN keluhan ON keluhan.id = tugas_teknisi.id_keluhan LEFT JOIN pelanggan ON pelanggan.id = keluhan.id_pelanggan LEFT JOIN teknisi ON teknisi.id = tugas_teknisi.id_teknisi",
      select:
        "tugas_teknisi.*, pelanggan.nama AS nama_pelanggan, teknisi.nama AS nama_teknisi, keluhan.deskripsi AS deskripsi_keluhan",
    }),
  create: (data) => baseModel.create("tugas_teknisi", data),
  update: (id, data) => baseModel.update("tugas_teknisi", id, data),
  remove: (id) => baseModel.remove("tugas_teknisi", id),
};
