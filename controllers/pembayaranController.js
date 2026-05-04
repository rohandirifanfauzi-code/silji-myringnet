const pembayaranModel = require("../models/pembayaranModel");
const tagihanModel = require("../models/tagihanModel");
const notificationService = require("../services/notificationService");
const QRCode = require("qrcode");
const { pool } = require("../models/baseModel");
const {
  BILL_STATUS,
  NOTIFICATION_LIFECYCLE,
  NOTIFICATION_STATUS,
  PAYMENT_STATUS,
} = require("../constants/statuses");
const {
  validatePaymentPreparation,
  validateCashPayment,
} = require("../services/validationService");

function normalizeMethod(value) {
  return String(value || "").toLowerCase();
}

function buildVaNumber(tagihan) {
  return `VA${tagihan.id_pelanggan}${Date.now()}`;
}

function buildPaymentReference(tagihan, metode) {
  return `SIM-${metode.toUpperCase()}-${tagihan.id}-${Date.now()}`;
}

async function findBillForPayment(connection, req, idTagihan) {
  const params = [];
  let whereClause = "";

  if (req.user.role === "pelanggan") {
    whereClause = "tagihan.id_pelanggan = ? AND tagihan.status_tagihan = ?";
    params.push(req.user.pelanggan_id, BILL_STATUS.UNPAID);
  } else {
    whereClause = "tagihan.id = ?";
    params.push(idTagihan);
  }

  const [rows] = await connection.query(
    `SELECT tagihan.*, pelanggan.nama AS nama_pelanggan, paket.nama_paket, paket.harga
     FROM tagihan
     LEFT JOIN pelanggan ON pelanggan.id = tagihan.id_pelanggan
     LEFT JOIN paket ON paket.id = tagihan.id_paket
     WHERE ${whereClause}
     ORDER BY tagihan.tanggal_tagihan DESC, tagihan.id DESC
     LIMIT 1
     FOR UPDATE`,
    params
  );
  return rows[0] || null;
}

async function createPaymentNotification(connection, message) {
  await connection.query("INSERT INTO notifikasi SET ?", {
    pesan: message,
    role_tujuan: "admin",
    tipe: "general",
    tanggal: new Date(),
    status_baca: NOTIFICATION_STATUS.UNREAD,
    status_notifikasi: NOTIFICATION_LIFECYCLE.PENDING,
  });
}

async function findPendingPayment(connection, billId, method) {
  const [rows] = await connection.query(
    `SELECT pembayaran.*, tagihan.id_pelanggan, tagihan.status_tagihan
     FROM pembayaran
     INNER JOIN tagihan ON tagihan.id = pembayaran.id_tagihan
     WHERE pembayaran.id_tagihan = ? AND pembayaran.metode = ? AND pembayaran.status = ?
     ORDER BY pembayaran.id DESC
     LIMIT 1
     FOR UPDATE`,
    [billId, method, PAYMENT_STATUS.PENDING]
  );
  return rows[0] || null;
}

function isPaidBill(status) {
  return String(status || "").toLowerCase() === BILL_STATUS.PAID;
}

function isPaidPayment(payment) {
  return (
    String(payment?.status || "").toLowerCase() === PAYMENT_STATUS.PAID ||
    String(payment?.status_pembayaran || "").toLowerCase() === PAYMENT_STATUS.PAID
  );
}

async function buildPaymentDraft(payment, tagihan) {
  const draft = {
    paymentId: payment.id,
    metode: payment.metode,
    jumlah: Number(payment.jumlah_bayar),
    vaNumber: payment.va_number,
    paymentReference: payment.payment_reference,
    pelanggan: tagihan.nama_pelanggan,
    paket: tagihan.nama_paket,
    tagihanId: tagihan.id,
  };

  if (payment.metode === "qris") {
    draft.qrCode = await QRCode.toDataURL(
      JSON.stringify({
        id_tagihan: tagihan.id,
        nominal: Number(tagihan.jumlah_tagihan),
        nama_pelanggan: tagihan.nama_pelanggan,
      })
    );
  }

  return draft;
}

async function index(req, res, next) {
  try {
    if (req.user.role === "teknisi") {
      req.flash("error", "Teknisi tidak memiliki akses ke pembayaran.");
      res.redirect("/dashboard");
      return;
    }

    const filters =
      req.user.role === "pelanggan"
        ? { ...req.query, id_pelanggan: req.user.pelanggan_id }
        : req.query;

    const data = await pembayaranModel.getAll(filters);
    const activeBill =
      req.user.role === "pelanggan"
        ? await tagihanModel.findActiveByCustomer(req.user.pelanggan_id)
        : null;
    const tagihan =
      req.user.role === "admin"
        ? await tagihanModel.getAll({
            page: 1,
            limit: 200,
            status: BILL_STATUS.UNPAID,
          })
        : { rows: activeBill ? [activeBill] : [] };
    let paymentDraft = null;
    if (req.query.payment_id) {
      const payment = await pembayaranModel.getById(req.query.payment_id);
      if (
        payment &&
        (req.user.role === "admin" ||
          Number(payment.id_pelanggan) === Number(req.user.pelanggan_id))
      ) {
        const relatedBill = await tagihanModel.getById(payment.id_tagihan);
        paymentDraft = await buildPaymentDraft(payment, relatedBill);
      }
    }

    res.render("pembayaran/index", {
      title: req.user.role === "pelanggan" ? "Pembayaran Saya" : "Pembayaran",
      data: data.rows,
      pagination: data.pagination,
      query: filters,
      tagihan: tagihan.rows,
      activeBill,
      paymentDraft,
    });
  } catch (error) {
    next(error);
  }
}

async function prepare(req, res, next) {
  let connection;
  try {
    const validationErrors = validatePaymentPreparation(req.body);
    if (validationErrors.length) {
      validationErrors.forEach((message) => req.flash("error", message));
      res.redirect("/pembayaran");
      return;
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const tagihan = await findBillForPayment(connection, req, req.body.id_tagihan);
    if (!tagihan) {
      await connection.rollback();
      req.flash("error", "Tagihan tidak ditemukan.");
      res.redirect("/pembayaran");
      return;
    }

    if (isPaidBill(tagihan.status_tagihan)) {
      await connection.rollback();
      req.flash("error", "Tagihan sudah lunas dan tidak dapat dibayar lagi.");
      res.redirect("/pembayaran");
      return;
    }

    if (
      req.user.role === "pelanggan" &&
      Number(tagihan.id_pelanggan) !== Number(req.user.pelanggan_id)
    ) {
      await connection.rollback();
      req.flash("error", "Anda hanya dapat membayar tagihan milik sendiri.");
      res.redirect("/pembayaran");
      return;
    }

    const metode = normalizeMethod(req.body.metode);
    if (!["qris", "va", "cash"].includes(metode)) {
      await connection.rollback();
      req.flash("error", "Metode pembayaran tidak valid.");
      res.redirect("/pembayaran");
      return;
    }

    if (metode === "cash") {
      if (req.user.role === "pelanggan") {
        await connection.query("INSERT INTO pembayaran SET ?", {
          id_tagihan: tagihan.id,
          metode: "cash",
          va_number: null,
          payment_reference: buildPaymentReference(tagihan, "cash"),
          jumlah_bayar: tagihan.jumlah_tagihan,
          tanggal_bayar: new Date(),
          status: PAYMENT_STATUS.PAID,
          status_pembayaran: PAYMENT_STATUS.PAID,
        });
        await connection.query("UPDATE tagihan SET ? WHERE id = ?", [
          { status_tagihan: BILL_STATUS.PAID },
          tagihan.id,
        ]);
        await createPaymentNotification(
          connection,
          `Pembayaran CASH untuk tagihan #${tagihan.id} berhasil diproses.`
        );
        await connection.commit();
        await notificationService.createExternalForCustomer({
          id_pelanggan: tagihan.id_pelanggan,
          subject: "Pembayaran berhasil",
          message: `Pembayaran cash untuk tagihan #${tagihan.id} berhasil diproses.`,
        });
        req.flash("success", "Pembayaran cash berhasil diproses.");
        res.redirect("/pembayaran");
        return;
      }
      await connection.rollback();
      res.redirect(`/pembayaran?id_tagihan=${tagihan.id}&metode=cash`);
      return;
    }

    let payment = await findPendingPayment(connection, tagihan.id, metode);
    if (!payment) {
      const [paymentResult] = await connection.query("INSERT INTO pembayaran SET ?", {
        id_tagihan: tagihan.id,
        metode,
        va_number: metode === "va" ? buildVaNumber(tagihan) : null,
        payment_reference: buildPaymentReference(tagihan, metode),
        jumlah_bayar: tagihan.jumlah_tagihan,
        tanggal_bayar: new Date(),
        status: PAYMENT_STATUS.PENDING,
        status_pembayaran: PAYMENT_STATUS.PENDING,
      });
      payment = { id: paymentResult.insertId };
    }

    await connection.commit();
    res.redirect(`/pembayaran?payment_id=${payment.id}`);
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

async function store(req, res, next) {
  let connection;
  try {
    const metode = normalizeMethod(req.body.metode);

    if (metode === "cash") {
      const validationErrors =
        req.user.role === "pelanggan" ? [] : validateCashPayment(req.body);
      if (validationErrors.length) {
        validationErrors.forEach((message) => req.flash("error", message));
        res.redirect("/pembayaran");
        return;
      }

      connection = await pool.getConnection();
      await connection.beginTransaction();

      const tagihan = await findBillForPayment(connection, req, req.body.id_tagihan);
      if (!tagihan) {
        await connection.rollback();
        req.flash("error", "Tagihan tidak ditemukan.");
        res.redirect("/pembayaran");
        return;
      }

      if (isPaidBill(tagihan.status_tagihan)) {
        await connection.rollback();
        req.flash("error", "Tagihan sudah lunas dan tidak dapat dibayar lagi.");
        res.redirect("/pembayaran");
        return;
      }

      if (
        req.user.role === "pelanggan" &&
        Number(tagihan.id_pelanggan) !== Number(req.user.pelanggan_id)
      ) {
        await connection.rollback();
        req.flash("error", "Anda hanya dapat membayar tagihan milik sendiri.");
        res.redirect("/pembayaran");
        return;
      }

      const amount = Number(req.body.jumlah_bayar || tagihan.jumlah_tagihan);
      await connection.query("INSERT INTO pembayaran SET ?", {
        id_tagihan: tagihan.id,
        metode: "cash",
        va_number: null,
        payment_reference: buildPaymentReference(tagihan, "cash"),
        jumlah_bayar: amount,
        tanggal_bayar: req.body.tanggal_bayar || new Date(),
        status: PAYMENT_STATUS.PAID,
        status_pembayaran: PAYMENT_STATUS.PAID,
      });
      await connection.query("UPDATE tagihan SET ? WHERE id = ?", [
        { status_tagihan: BILL_STATUS.PAID },
        tagihan.id,
      ]);
      await createPaymentNotification(
        connection,
        `Pembayaran cash untuk tagihan #${tagihan.id} berhasil diproses.`
      );
      await connection.commit();
      await notificationService.createExternalForCustomer({
        id_pelanggan: tagihan.id_pelanggan,
        subject: "Pembayaran berhasil",
        message: `Pembayaran cash untuk tagihan #${tagihan.id} berhasil diproses.`,
      });
      req.flash("success", "Pembayaran cash berhasil disimpan.");
      res.redirect("/pembayaran");
      return;
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [paymentRows] = await connection.query(
      `SELECT pembayaran.*, tagihan.id_pelanggan, tagihan.status_tagihan
       FROM pembayaran
       INNER JOIN tagihan ON tagihan.id = pembayaran.id_tagihan
       WHERE pembayaran.id = ?
       LIMIT 1
       FOR UPDATE`,
      [req.body.payment_id]
    );
    const payment = paymentRows[0];
    if (!payment) {
      await connection.rollback();
      req.flash("error", "Data pembayaran tidak ditemukan.");
      res.redirect("/pembayaran");
      return;
    }

    if (isPaidBill(payment.status_tagihan) || isPaidPayment(payment)) {
      await connection.rollback();
      req.flash("error", "Pembayaran ini sudah lunas dan tidak dapat diproses ulang.");
      res.redirect("/pembayaran");
      return;
    }

    if (
      req.user.role === "pelanggan" &&
      Number(payment.id_pelanggan) !== Number(req.user.pelanggan_id)
    ) {
      await connection.rollback();
      req.flash("error", "Anda hanya dapat memproses pembayaran milik sendiri.");
      res.redirect("/pembayaran");
      return;
    }

    await connection.query("UPDATE pembayaran SET ? WHERE id = ?", [
      {
        status: PAYMENT_STATUS.PAID,
        status_pembayaran: PAYMENT_STATUS.PAID,
        tanggal_bayar: new Date(),
      },
      payment.id,
    ]);
    await connection.query("UPDATE tagihan SET ? WHERE id = ?", [
      { status_tagihan: BILL_STATUS.PAID },
      payment.id_tagihan,
    ]);
    await createPaymentNotification(
      connection,
      `Pembayaran ${payment.metode.toUpperCase()} untuk tagihan #${payment.id_tagihan} berhasil diproses.`
    );
    await connection.commit();
    await notificationService.createExternalForCustomer({
      id_pelanggan: payment.id_pelanggan,
      subject: "Pembayaran berhasil",
      message: `Pembayaran ${payment.metode.toUpperCase()} untuk tagihan #${payment.id_tagihan} berhasil diproses.`,
    });
    req.flash("success", `Pembayaran ${payment.metode.toUpperCase()} berhasil dikonfirmasi.`);
    res.redirect("/pembayaran");
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

async function destroy(req, res, next) {
  try {
    await pembayaranModel.remove(req.params.id);
    req.flash("success", "Pembayaran berhasil dihapus.");
    res.redirect("/pembayaran");
  } catch (error) {
    next(error);
  }
}

module.exports = { index, prepare, store, destroy };
