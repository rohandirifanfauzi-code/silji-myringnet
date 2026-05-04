const keluhanModel = require("../models/keluhanModel");
const pelangganModel = require("../models/pelangganModel");
const tugasTeknisiModel = require("../models/tugasTeknisiModel");
const teknisiModel = require("../models/teknisiModel");
const hasilPekerjaanModel = require("../models/hasilPekerjaanModel");
const notifikasiModel = require("../models/notifikasiModel");
const notificationService = require("../services/notificationService");
const billingService = require("../services/billingService");
const { pool } = require("../models/baseModel");
const {
  TASK_STATUS,
  COMPLAINT_STATUS,
  BILL_STATUS,
  NOTIFICATION_STATUS,
  NOTIFICATION_LIFECYCLE,
} = require("../constants/statuses");

function mapTaskStatusToComplaintStatus(status) {
  if (status === TASK_STATUS.DONE) {
    return COMPLAINT_STATUS.DONE;
  }
  if (status === TASK_STATUS.IN_PROGRESS || status === TASK_STATUS.PENDING) {
    return COMPLAINT_STATUS.IN_PROGRESS;
  }
  return COMPLAINT_STATUS.NEW;
}

function todayDateInput() {
  return new Date().toISOString().slice(0, 10);
}

async function generateBillIfPsbCompleted(task, nextStatus) {
  if (!task || task.tipe_tugas !== "psb") {
    return;
  }

  if (task.status === TASK_STATUS.DONE || nextStatus !== TASK_STATUS.DONE) {
    return;
  }

  await billingService.generateBillAfterPsbCompletion(task.id_pelanggan, new Date());
}

async function index(req, res, next) {
  try {
    if (req.user.role === "teknisi") {
      const [tugasTeknisi, tugasHistory] = await Promise.all([
        tugasTeknisiModel.getAll({
          ...req.query,
          id_teknisi: req.user.teknisi_id,
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
        tugas: tugasTeknisi.rows,
        tugasHistory: tugasHistory.rows,
        teknisi: [],
        pagination: tugasTeknisi.pagination,
        query: req.query,
      });
      return;
    }

    const filters =
      req.user.role === "pelanggan"
        ? { ...req.query, id_pelanggan: req.user.pelanggan_id }
        : req.user.role === "admin"
          ? { ...req.query, unassignedOnly: true }
        : req.query;

    if (req.user.role === "pelanggan") {
      res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
      res.set("Pragma", "no-cache");
      res.set("Expires", "0");
    }

    const [keluhan, teknisi, tugas] = await Promise.all([
      keluhanModel.getAll(filters),
      teknisiModel.getAll({ page: 1, limit: 100 }),
      tugasTeknisiModel.getAll(
        req.user.role === "pelanggan"
          ? { page: 1, limit: 100, id_pelanggan: req.user.pelanggan_id }
          : { page: 1, limit: 100 }
      ),
    ]);
    res.render("keluhan/index", {
      title:
        req.user.role === "pelanggan"
          ? "Keluhan Saya"
          : "Keluhan & Tugas Teknisi",
      data: keluhan.rows,
      tugas: tugas.rows,
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

    const keluhanId = await keluhanModel.create({
      id_pelanggan: idPelanggan,
      deskripsi: req.body.deskripsi,
      tanggal: req.body.tanggal,
      status: req.body.status || COMPLAINT_STATUS.NEW,
    });
    await notificationService.createNotification("Keluhan baru berhasil dibuat.");
    await notificationService.createExternalForCustomer({
      id_pelanggan: idPelanggan,
      subject: "Keluhan diterima",
      message: `Keluhan #${keluhanId} telah diterima dan akan diproses oleh MyRingNet.`,
    });
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
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [keluhanRows] = await connection.query(
      `SELECT keluhan.*, pelanggan.nama AS nama_pelanggan, pelanggan.alamat AS alamat_pelanggan
       FROM keluhan
       LEFT JOIN pelanggan ON pelanggan.id = keluhan.id_pelanggan
       WHERE keluhan.id = ?
       FOR UPDATE`,
      [req.body.id_keluhan]
    );
    const keluhan = keluhanRows[0];

    if (!keluhan) {
      await connection.rollback();
      req.flash("error", "Keluhan tidak ditemukan.");
      res.redirect("/keluhan");
      return;
    }

    if (keluhan.status !== COMPLAINT_STATUS.NEW) {
      await connection.rollback();
      req.flash("error", "Keluhan sudah diproses atau selesai.");
      res.redirect("/keluhan");
      return;
    }

    const [taskResult] = await connection.query("INSERT INTO tugas_teknisi SET ?", {
      id_keluhan: req.body.id_keluhan,
      id_pelanggan: keluhan.id_pelanggan || null,
      id_teknisi: req.body.id_teknisi,
      detail_lokasi: keluhan.alamat_pelanggan || "-",
      tipe_tugas: "maintenance",
      tanggal_tugas: todayDateInput(),
      status: TASK_STATUS.PENDING,
    });
    const taskId = taskResult.insertId;

    await connection.query("UPDATE keluhan SET ? WHERE id = ?", [
      { status: COMPLAINT_STATUS.IN_PROGRESS },
      req.body.id_keluhan,
    ]);
    await connection.query("INSERT INTO notifikasi SET ?", {
      pesan: `Keluhan #${req.body.id_keluhan} telah di-assign ke teknisi.`,
      role_tujuan: "admin",
      tipe: "general",
      tanggal: new Date(),
      status_baca: NOTIFICATION_STATUS.UNREAD,
      status_notifikasi: NOTIFICATION_LIFECYCLE.PENDING,
    });
    await connection.query("INSERT INTO notifikasi SET ?", {
      pesan: `Tugas maintenance baru untuk ${keluhan?.nama_pelanggan || "pelanggan"}.`,
      role_tujuan: "teknisi",
      tipe: "maintenance",
      alamat: keluhan.alamat_pelanggan || null,
      id_teknisi: req.body.id_teknisi,
      id_pelanggan: keluhan.id_pelanggan || null,
      id_tugas: taskId,
      tanggal: new Date(),
      status_baca: NOTIFICATION_STATUS.UNREAD,
      status_notifikasi: NOTIFICATION_LIFECYCLE.PENDING,
    });

    await connection.commit();
    req.flash("success", "Teknisi berhasil di-assign.");
    res.redirect("/keluhan");
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    next(error);
  } finally {
    if (connection) {
      connection.release();
    }
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
    if (req.body.status === TASK_STATUS.DONE || req.body.status === TASK_STATUS.IN_PROGRESS) {
      await notifikasiModel.updateByTaskId(req.params.id, {
        status_notifikasi:
          req.body.status === TASK_STATUS.DONE
            ? NOTIFICATION_LIFECYCLE.DONE
            : NOTIFICATION_LIFECYCLE.SCHEDULED,
      });
    }
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
    if (!req.file) {
      req.flash("error", "File bukti wajib diupload dalam format JPG atau PNG.");
      res.redirect("/keluhan");
      return;
    }

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
    await tugasTeknisiModel.update(req.body.id_tugas, { status: TASK_STATUS.DONE });
    await generateBillIfPsbCompleted(task, TASK_STATUS.DONE);
    await notifikasiModel.updateByTaskId(req.body.id_tugas, {
      status_notifikasi: NOTIFICATION_LIFECYCLE.DONE,
    });
    if (task.id_keluhan) {
      await keluhanModel.update(task.id_keluhan, { status: COMPLAINT_STATUS.DONE });
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
  mapTaskStatusToComplaintStatus,
};
