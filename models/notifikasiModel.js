const baseModel = require("./baseModel");

function getAll(params) {
  return baseModel.findAll({
    table: "notifikasi",
    searchableFields: ["pesan"],
    filters: { status_baca: params.status },
    search: params.search,
    page: params.page,
    limit: params.limit,
    orderBy: "tanggal DESC",
  });
}

module.exports = {
  getAll,
  create: (data) => baseModel.create("notifikasi", data),
  update: (id, data) => baseModel.update("notifikasi", id, data),
};
