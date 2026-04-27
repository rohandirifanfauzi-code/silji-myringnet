const baseModel = require("./baseModel");

module.exports = {
  getByTaskId: (idTugas) =>
    baseModel.findAll({
      table: "hasil_pekerjaan",
      filters: { id_tugas: idTugas },
      page: 1,
      limit: 20,
      orderBy: "id DESC",
    }),
  create: (data) => baseModel.create("hasil_pekerjaan", data),
};
