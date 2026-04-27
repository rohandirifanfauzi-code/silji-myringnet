const baseModel = require("./baseModel");

function getAll(params) {
  return baseModel.findAll({
    table: "paket",
    searchableFields: ["nama_paket", "kecepatan", "deskripsi"],
    search: params.search,
    page: params.page,
    limit: params.limit,
    orderBy: "id DESC",
  });
}

module.exports = {
  getAll,
  getById: (id) => baseModel.findById("paket", id),
  create: (data) => baseModel.create("paket", data),
  update: (id, data) => baseModel.update("paket", id, data),
  remove: (id) => baseModel.remove("paket", id),
};
