const baseModel = require("./baseModel");

function getAll(params) {
  return baseModel.findAll({
    table: "teknisi",
    searchableFields: ["nama", "no_hp"],
    filters: { status: params.status },
    search: params.search,
    page: params.page,
    limit: params.limit,
    orderBy: "id DESC",
  });
}

module.exports = {
  getAll,
  getById: (id) => baseModel.findById("teknisi", id),
  create: (data) => baseModel.create("teknisi", data),
  update: (id, data) => baseModel.update("teknisi", id, data),
  remove: (id) => baseModel.remove("teknisi", id),
};
