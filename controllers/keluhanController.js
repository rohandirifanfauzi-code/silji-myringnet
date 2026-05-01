const keluhanModel = require("../models/keluhanModel");
const pelangganModel = require("../models/pelangganModel");
const tugasTeknisiModel = require("../models/tugasTeknisiModel");
const teknisiModel = require("../models/teknisiModel");
const hasilPekerjaanModel = require("../models/hasilPekerjaanModel");
const notificationService = require("../services/notificationService");
const billingService = require("../services/billingService");

function mapTaskStatusToComplaintStatus(status) {
  if (status === "SELESAI") {
    return "SELESAI";
  }
  if (status === "PROSES" || status === "DITUGASKAN") {
    return "DIPROSES";
  }
  return "BARU";
}

async function generateBillIfPsbCompleted(task, nextStatus) {
  if (!task || task.tipe_tugas !== "psb") {
    return;
  }

  if (task.status === "SELESAI" || nextStatus !== "SELESAI") {
    return;
  }

  await billingService.generateBillAfterPsbCompletion(task.id_pelanggan, new Date());
}

async function index(req, res, next) {
  try {
    if (req.user.role === "teknisi") {
      const [tugasHariIni, tugasHistory] = await Promise.all([
        tugasTeknisiModel.getAll({
          ...req.query,
          id_teknisi: req.user.teknisi_id,
          todayOnly: true,
        }),
        tugasTeknisiModel.getAll({
          page: 1,
          limit: 10,
          id_teknisi: req.user.teknisi_id,
          historyOnly: true,
        }),
      ]);
      res.render("keluhan/index", {
        title: "Tugas Teknisi",
        data: [],
        tugas: tugasHariIni.rows,
        tugasHistory: tugasHistory.rows,
        teknisi: [],
        pagination: tugasHariIni.pagination,
        query: req.query,
      });
      return;
    }

    const filters =
      req.user.role === "pelanggan"
        ? { ...req.query, id_pelanggan: req.user.pelanggan_id }
        : req.query;

    if (req.user.role === "pelanggan") {
      res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
      res.set("Pragma", "no-cache");
      res.set("Expires", "0");
    }

    const [keluhan, teknisi, tugas] = await Promise.all([
      keluhanModel.getAll(filters),
      teknisiModel.getAll({ page: 1, limit: 100 }),
      tugasTeknisiModel.getAll({ page: 1, limit: 100 }),
    ]);
    res.render("keluhan/index", {
      title:
        req.user.role === "pelanggan"
          ? "Keluhan Saya"
          : "Keluhan & Tugas Teknisi",
      data: keluhan.rows,
      tugas: req.user.role === "pelanggan" ? [] : tugas.rows,
      teknisi: teknisi.rows,
      pagination: keluhan.pagination,
      query: filters,
    });
  } catch (error) {
    next(error);
  }
}

async function createForm(req, res, next) {
  try {
    if (req.user.role === "teknisi") {
      req.flash("error", "Role Anda tidak dapat membuat keluhan.");
      res.redirect("/keluhan");
      return;
    }

    const pelanggan = await pelangganModel.getAll({ page: 1, limit: 100 });
    res.render("keluhan/form", {
      title: "Buat Keluhan",
      item: null,
      pelanggan: pelanggan.rows,
    });
  } catch (error) {
    next(error);
  }
}

async function store(req, res, next) {
  try {
    if (!["admin", "pelanggan"].includes(req.user.role)) {
      req.flash("error", "Role Anda tidak dapat membuat keluhan.");
      res.redirect("/keluhan");
      return;
    }

    const idPelanggan =
      req.user.role === "pelanggan"
        ? req.user.pelanggan_id
        : req.body.id_pelanggan;

    await keluhanModel.create({
      id_pelanggan: idPelanggan,
      deskripsi: req.body.deskripsi,
      tanggal: req.body.tanggal,
      status: req.body.status || "BARU",
    });
    await notificationService.createNotification("Keluhan baru berhasil dibuat.");
    req.flash("success", "Keluhan berhasil disimpan.");
    res.redirect("/keluhan");
  } catch (error) {
    next(error);
  }
}

async function editForm(req, res, next) {
  try {
    if (req.user.role === "teknisi") {
      req.flash("error", "Role Anda tidak dapat mengubah keluhan.");
      res.redirect("/keluhan");
      return;
    }

    const [item, pelanggan] = await Promise.all([
      keluhanModel.getById(req.params.id),
      pelangganModel.getAll({ page: 1, limit: 100 }),
    ]);

    if (
      req.user.role === "pelanggan" &&
      Number(item?.id_pelanggan) !== Number(req.user.pelanggan_id)
    ) {
      req.flash("error", "Anda hanya dapat mengubah keluhan milik sendiri.");
      res.redirect("/keluhan");
      return;
    }

    res.render("keluhan/form", {
      title: "Edit Keluhan",
      item,
      pelanggan: pelanggan.rows,
    });
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const existing = await keluhanModel.getById(req.params.id);
    if (!existing) {
      req.flash("error", "Keluhan tidak ditemukan.");
      res.redirect("/keluhan");
      return;
    }

    if (
      req.user.role === "pelanggan" &&
      Number(existing.id_pelanggan) !== Number(req.user.pelanggan_id)
    ) {
      req.flash("error", "Anda hanya dapat mengubah keluhan milik sendiri.");
      res.redirect("/keluhan");
      return;
    }

    if (req.user.role === "teknisi") {
      req.flash("error", "Role Anda tidak dapat mengubah keluhan.");
      res.redirect("/keluhan");
      return;
    }

    await keluhanModel.update(req.params.id, {
      id_pelanggan:
        req.user.role === "pelanggan"
          ? req.user.pelanggan_id
          : req.body.id_pelanggan,
      deskripsi: req.body.deskripsi,
      tanggal: req.body.tanggal,
      status: req.user.role === "pelanggan" ? existing.status : req.body.status,
    });
    await notificationService.createNotification(
      `Status keluhan #${req.params.id} diupdate menjadi ${req.body.status}.`
    );
    req.flash("success", "Keluhan berhasil diupdate.");
    res.redirect("/keluhan");
  } catch (error) {
    next(error);
  }
}

async function destroy(req, res, next) {
  try {
    await keluhanModel.remove(req.params.id);
    req.flash("success", "Keluhan berhasil dihapus.");
    res.redirect("/keluhan");
  } catch (error) {
    next(error);
  }
}

async function assignTechnician(req, res, next) {
  try {
    const keluhan = await keluhanModel.getById(req.body.id_keluhan);
    const taskId = await tugasTeknisiModel.create({
      id_keluhan: req.body.id_keluhan,
      id_pelanggan: keluhan?.id_pelanggan || null,
      id_teknisi: req.body.id_teknisi,
      detail_lokasi: req.body.detail_lokasi,
      tipe_tugas: "maintenance",
      tanggal_tugas: null,
      status: "DITUGASKAN",
    });
    await keluhanModel.update(req.body.id_keluhan, { status: "DIPROSES" });
    await notificationService.createNotification(
      `Keluhan #${req.body.id_keluhan} telah di-assign ke teknisi.`
    );
    await notificationService.createNotification({
      pesan: `Tugas maintenance baru untuk ${keluhan?.nama_pelanggan || "pelanggan"}.`,
      role_tujuan: "teknisi",
      tipe: "maintenance",
      alamat: req.body.detail_lokasi,
      id_teknisi: req.body.id_teknisi,
      id_pelanggan: keluhan?.id_pelanggan || null,
      id_tugas: taskId,
    });
    req.flash("success", "Teknisi berhasil di-assign.");
    res.redirect("/keluhan");
  } catch (error) {
    next(error);
  }
}

async function updateTaskStatus(req, res, next) {
  try {
    const task = await tugasTeknisiModel.getById(req.params.id);
    if (!task) {
      req.flash("error", "Tugas teknisi tidak ditemukan.");
      res.redirect("/keluhan");
      return;
    }

    if (
      req.user.role === "teknisi" &&
      Number(task.id_teknisi) !== Number(req.user.teknisi_id)
    ) {
      req.flash("error", "Anda hanya dapat mengubah tugas milik sendiri.");
      res.redirect("/keluhan");
      return;
    }

    await tugasTeknisiModel.update(req.params.id, {
      status: req.body.status,
      detail_lokasi: req.body.detail_lokasi || task.detail_lokasi,
    });
    await generateBillIfPsbCompleted(task, req.body.status);
    if (task.id_keluhan) {
      await keluhanModel.update(task.id_keluhan, {
        status: mapTaskStatusToComplaintStatus(req.body.status),
      });
    }
    await notificationService.createNotification(
      `Status tugas teknisi #${req.params.id} berubah menjadi ${req.body.status}.`
    );
    req.flash("success", "Status tugas berhasil diupdate.");
    res.redirect("/keluhan");
  } catch (error) {
    next(error);
  }
}

async function uploadResult(req, res, next) {
  try {
    const task = await tugasTeknisiModel.getById(req.body.id_tugas);
    if (!task) {
      req.flash("error", "Tugas teknisi tidak ditemukan.");
      res.redirect("/keluhan");
      return;
    }

    if (
      req.user.role === "teknisi" &&
      Number(task.id_teknisi) !== Number(req.user.teknisi_id)
    ) {
      req.flash("error", "Anda hanya dapat mengunggah hasil tugas milik sendiri.");
      res.redirect("/keluhan");
      return;
    }

    await hasilPekerjaanModel.create({
      id_tugas: req.body.id_tugas,
      foto_bukti: req.file ? req.file.filename : null,
      deskripsi: req.body.deskripsi,
    });
    await tugasTeknisiModel.update(req.body.id_tugas, { status: "SELESAI" });
    await generateBillIfPsbCompleted(task, "SELESAI");
    if (task.id_keluhan) {
      await keluhanModel.update(task.id_keluhan, { status: "SELESAI" });
    }
    await notificationService.createNotification(
      `Hasil pekerjaan untuk tugas #${req.body.id_tugas} telah diupload.`
    );
    req.flash("success", "Hasil pekerjaan berhasil diupload.");
    res.redirect("/keluhan");
  } catch (error) {
    next(error);
  }
}

module.exports = {
  index,
  createForm,
  store,
  editForm,
  update,
  destroy,
  assignTechnician,
  updateTaskStatus,
  uploadResult,
};
