const auditModel = require("../models/auditModel");

async function index(req, res, next) {
  try {
    const data = await auditModel.getAll(req.query);
    res.render("audit/index", {
      title: "Audit Log",
      data: data.rows,
      pagination: data.pagination,
      query: req.query,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { index };
