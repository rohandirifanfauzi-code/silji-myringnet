const baseModel = require("./baseModel");

function getAll(params) {
  return baseModel.findAll({
    table: "pembayaran",
    joins:
      "LEFT JOIN tagihan ON tagihan.id = pembayaran.id_tagihan LEFT JOIN pelanggan ON pelanggan.id = tagihan.id_pelanggan",
    select:
      "pembayaran.*, tagihan.status_tagihan, pelanggan.nama AS nama_pelanggan, tagihan.jumlah_tagihan",
    searchableFields: ["pelanggan.nama", "pembayaran.metode", "pembayaran.va_number"],
    filters: {
      "tagihan.id_pelanggan": params.id_pelanggan,
      "pembayaran.status": params.status_pembayaran,
    },
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
        "pembayaran.*, tagihan.status_tagihan, pelanggan.nama AS nama_pelanggan, tagihan.id_pelanggan, tagihan.jumlah_tagihan",
    }),
  create: (data) => baseModel.create("pembayaran", data),
  update: (id, data) => baseModel.update("pembayaran", id, data),
  remove: (id) => baseModel.remove("pembayaran", id),
  findPendingByBillAndMethod: async (idTagihan, metode) => {
    const [rows] = await baseModel.pool.query(
      `SELECT pembayaran.*, tagihan.id_pelanggan, pelanggan.nama AS nama_pelanggan
       FROM pembayaran
       INNER JOIN tagihan ON tagihan.id = pembayaran.id_tagihan
       INNER JOIN pelanggan ON pelanggan.id = tagihan.id_pelanggan
       WHERE pembayaran.id_tagihan = ? AND pembayaran.metode = ? AND pembayaran.status = 'pending'
       ORDER BY pembayaran.id DESC
       LIMIT 1`,
      [idTagihan, metode]
    );
    return rows[0] || null;
  },
  findByReference: async (reference) => {
    const [rows] = await baseModel.pool.query(
      `SELECT pembayaran.*, tagihan.id_pelanggan, tagihan.status_tagihan
       FROM pembayaran
       INNER JOIN tagihan ON tagihan.id = pembayaran.id_tagihan
       WHERE pembayaran.payment_reference = ?
       LIMIT 1`,
      [reference]
    );
    return rows[0] || null;
  },
};
