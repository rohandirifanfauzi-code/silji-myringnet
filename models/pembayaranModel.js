const baseModel = require("./baseModel");

function getAll(params) {
  return baseModel.findAll({
    table: "pembayaran",
    joins:
      "LEFT JOIN tagihan ON tagihan.id = pembayaran.id_tagihan LEFT JOIN pelanggan ON pelanggan.id = tagihan.id_pelanggan",
    select:
      "pembayaran.*, tagihan.status_tagihan, pelanggan.nama AS nama_pelanggan",
    searchableFields: ["pelanggan.nama", "pembayaran.metode_pembayaran"],
    filters: { "tagihan.id_pelanggan": params.id_pelanggan },
    search: params.search,
    page: params.page,
    limit: params.limit,
    orderBy: "pembayaran.tanggal_bayar DESC",
  });
}

module.exports = {
  getAll,
  getById: (id) =>
    baseModel.findById("pembayaran", id, {
      joins:
        "LEFT JOIN tagihan ON tagihan.id = pembayaran.id_tagihan LEFT JOIN pelanggan ON pelanggan.id = tagihan.id_pelanggan",
      select:
        "pembayaran.*, tagihan.status_tagihan, pelanggan.nama AS nama_pelanggan",
    }),
  create: (data) => baseModel.create("pembayaran", data),
  update: (id, data) => baseModel.update("pembayaran", id, data),
  remove: (id) => baseModel.remove("pembayaran", id),
};
