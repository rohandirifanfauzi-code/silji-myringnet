const analyticsModel = require("../models/analyticsModel");

async function dashboard(req, res, next) {
  try {
    const [summary, monthly] = await Promise.all([
      analyticsModel.getManagementSummary(),
      analyticsModel.getMonthlyAnalytics(),
    ]);
    res.render("manajemen/dashboard", {
      title: "Dashboard Manajemen",
      summary,
      monthly,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { dashboard };
