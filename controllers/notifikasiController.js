const notifikasiModel = require("../models/notifikasiModel");
const tugasTeknisiModel = require("../models/tugasTeknisiModel");
const {
  TASK_STATUS,
  NOTIFICATION_STATUS,
  NOTIFICATION_LIFECYCLE,
} = require("../constants/statuses");

async function index(req, res, next) {
  try {
    const data =
      req.user.role === "teknisi"
        ? await notifikasiModel.getForTechnician(req.user.teknisi_id, req.query)
        : await notifikasiModel.getAll({ ...req.query, role_tujuan: "admin" });
    res.render("notifikasi/index", {
      title: "Notifikasi",
      data: data.rows,
      pagination: data.pagination,
      query: req.query,
    });
  } catch (error) {
    next(error);
  }
}

async function markRead(req, res, next) {
  try {
    const item = await notifikasiModel.getById(req.params.id);
    if (!item) {
      req.flash("error", "Notifikasi tidak ditemukan.");
      res.redirect("/notifikasi");
      return;
    }
    if (
      req.user.role === "teknisi" &&
      item.role_tujuan === "teknisi" &&
      item.id_teknisi &&
      Number(item.id_teknisi) !== Number(req.user.teknisi_id)
    ) {
      req.flash("error", "Anda tidak dapat mengakses notifikasi ini.");
      res.redirect("/notifikasi");
      return;
    }
    await notifikasiModel.update(req.params.id, { status_baca: NOTIFICATION_STATUS.READ });
    res.redirect("/notifikasi");
  } catch (error) {
    next(error);
  }
}

async function scheduleTask(req, res, next) {
  try {
    const item = await notifikasiModel.getById(req.params.id);
    if (!item) {
      req.flash("error", "Notifikasi tidak ditemukan.");
      res.redirect("/notifikasi");
      return;
    }

    if (item.role_tujuan !== "teknisi") {
      req.flash("error", "Notifikasi ini bukan untuk teknisi.");
      res.redirect("/notifikasi");
      return;
    }

    if (item.id_teknisi && Number(item.id_teknisi) !== Number(req.user.teknisi_id)) {
      req.flash("error", "Anda tidak dapat mengatur tugas ini.");
      res.redirect("/notifikasi");
      return;
    }

    if (!req.body.tanggal_tugas) {
      req.flash("error", "Tanggal tugas wajib diisi.");
      res.redirect("/notifikasi");
      return;
    }

    let taskId = item.id_tugas;

    if (taskId) {
      const updated = await tugasTeknisiModel.update(taskId, {
        tanggal_tugas: req.body.tanggal_tugas,
        id_teknisi: req.user.teknisi_id,
        status: TASK_STATUS.IN_PROGRESS,
      });
      if (!updated) {
        taskId = null;
      }
    }

    if (!taskId) {
      taskId = await tugasTeknisiModel.create({
        id_keluhan: null,
        id_pelanggan: item.id_pelanggan || null,
        id_teknisi: req.user.teknisi_id,
        detail_lokasi: item.alamat || "-",
        tipe_tugas: item.tipe === "psb" ? "psb" : "maintenance",
        tanggal_tugas: req.body.tanggal_tugas,
        status: TASK_STATUS.IN_PROGRESS,
      });
    }

    await notifikasiModel.update(req.params.id, {
      id_tugas: taskId,
      id_teknisi: req.user.teknisi_id,
      tanggal_saran: req.body.tanggal_tugas,
      status_baca: NOTIFICATION_STATUS.SCHEDULED,
      status_notifikasi: NOTIFICATION_LIFECYCLE.SCHEDULED,
    });

    req.flash("success", "Jadwal tugas berhasil diatur.");
    res.redirect("/notifikasi");
  } catch (error) {
    next(error);
  }
}

module.exports = { index, markRead, scheduleTask };
