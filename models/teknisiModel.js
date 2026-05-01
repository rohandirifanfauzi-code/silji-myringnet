const baseModel = require("./baseModel");

function getAll(params) {
  return baseModel.findAll({
    table: "teknisi",
    joins: "LEFT JOIN users ON users.id = teknisi.user_id",
    select: "teknisi.*, users.username",
    searchableFields: ["teknisi.nama", "teknisi.no_hp", "users.username"],
    filters: { status: params.status },
    search: params.search,
    page: params.page,
    limit: params.limit,
    orderBy: "id DESC",
  });
}

module.exports = {
  getAll,
  getById: (id) =>
    baseModel.findById("teknisi", id, {
      joins: "LEFT JOIN users ON users.id = teknisi.user_id",
      select: "teknisi.*, users.username",
    }),
  create: (data) => baseModel.create("teknisi", data),
  update: (id, data) => baseModel.update("teknisi", id, data),
  remove: (id) => baseModel.remove("teknisi", id),
};
