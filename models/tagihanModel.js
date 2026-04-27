const baseModel = require("./baseModel");
const { pool } = require("./baseModel");

function getAll(params) {
  return baseModel.findAll({
    table: "tagihan",
    joins:
      "LEFT JOIN pelanggan ON pelanggan.id = tagihan.id_pelanggan LEFT JOIN paket ON paket.id = tagihan.id_paket",
    select:
      "tagihan.*, pelanggan.nama AS nama_pelanggan, paket.nama_paket, paket.kecepatan",
    searchableFields: ["pelanggan.nama", "paket.nama_paket"],
    filters: {
      "tagihan.status_tagihan": params.status,
      "tagihan.id_pelanggan": params.id_pelanggan,
    },
    search: params.search,
    page: params.page,
    limit: params.limit,
    orderBy: "tagihan.tanggal_tagihan DESC",
  });
}

async function findMonthlyBillByCustomerAndPackage(idPelanggan, idPaket, periodDate) {
  const [rows] = await pool.query(
    `SELECT * FROM tagihan
     WHERE id_pelanggan = ? AND id_paket = ? AND DATE_FORMAT(tanggal_tagihan, '%Y-%m') = DATE_FORMAT(?, '%Y-%m')
     LIMIT 1`,
    [idPelanggan, idPaket, periodDate]
  );
  return rows[0] || null;
}

module.exports = {
  getAll,
  getById: (id) =>
    baseModel.findById("tagihan", id, {
      joins:
        "LEFT JOIN pelanggan ON pelanggan.id = tagihan.id_pelanggan LEFT JOIN paket ON paket.id = tagihan.id_paket",
      select:
        "tagihan.*, pelanggan.nama AS nama_pelanggan, pelanggan.email, paket.nama_paket, paket.harga",
    }),
  create: (data) => baseModel.create("tagihan", data),
  update: (id, data) => baseModel.update("tagihan", id, data),
  remove: (id) => baseModel.remove("tagihan", id),
  findMonthlyBillByCustomerAndPackage,
};
