const dashboardModel = require("../models/dashboardModel");
const notifikasiModel = require("../models/notifikasiModel");
const tugasTeknisiModel = require("../models/tugasTeknisiModel");
const tagihanModel = require("../models/tagihanModel");

async function index(req, res, next) {
  try {
    let summary = null;
    let notifications = [];
    let todayTasks = [];
    let taskHistory = [];
    let customerBills = [];

    if (req.user.role === "admin") {
      [summary, notifications] = await Promise.all([
        dashboardModel.getSummary(),
        notifikasiModel.getLatest(5),
      ]);
    } else if (req.user.role === "manajemen") {
      res.redirect("/manajemen/dashboard");
      return;
    } else if (req.user.role === "pelanggan") {
      summary = await dashboardModel.getCustomerSummary(req.user.pelanggan_id);
      customerBills = (
        await tagihanModel.getAll({
          page: 1,
          limit: 5,
          id_pelanggan: req.user.pelanggan_id,
        })
      ).rows;
      res.render("dashboard/index", {
        title: "Dashboard",
        summary,
        notifications,
        todayTasks,
        taskHistory,
        customerBills,
      });
      return;
    } else if (req.user.role === "teknisi") {
      todayTasks = await tugasTeknisiModel.getTodayByTechnician(
        req.user.teknisi_id,
        6
      );
      taskHistory = await tugasTeknisiModel.getHistoryByTechnician(
        req.user.teknisi_id,
        6
      );
    }

    res.render("dashboard/index", {
      title: "Dashboard",
      summary,
      notifications,
      todayTasks,
      taskHistory,
      customerBills,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { index };
