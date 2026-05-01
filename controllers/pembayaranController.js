const pembayaranModel = require("../models/pembayaranModel");
const tagihanModel = require("../models/tagihanModel");
const notificationService = require("../services/notificationService");
const QRCode = require("qrcode");
const {
  BILL_STATUS,
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

async function buildPaymentDraft(payment, tagihan) {
  const draft = {
    paymentId: payment.id,
    metode: payment.metode,
    jumlah: Number(payment.jumlah_bayar),
    vaNumber: payment.va_number,
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
    const tagihan = await tagihanModel.getAll({
      page: 1,
      limit: 200,
      status: BILL_STATUS.UNPAID,
      id_pelanggan:
        req.user.role === "pelanggan"
          ? req.user.pelanggan_id
          : undefined,
    });
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
      paymentDraft,
    });
  } catch (error) {
    next(error);
  }
}

async function prepare(req, res, next) {
  try {
    const validationErrors = validatePaymentPreparation(req.body);
    if (validationErrors.length) {
      validationErrors.forEach((message) => req.flash("error", message));
      res.redirect("/pembayaran");
      return;
    }

    const tagihan = await tagihanModel.getById(req.body.id_tagihan);
    if (!tagihan) {
      req.flash("error", "Tagihan tidak ditemukan.");
      res.redirect("/pembayaran");
      return;
    }

    if (
      req.user.role === "pelanggan" &&
      Number(tagihan.id_pelanggan) !== Number(req.user.pelanggan_id)
    ) {
      req.flash("error", "Anda hanya dapat membayar tagihan milik sendiri.");
      res.redirect("/pembayaran");
      return;
    }

    const metode = normalizeMethod(req.body.metode);
    if (!["qris", "va", "cash"].includes(metode)) {
      req.flash("error", "Metode pembayaran tidak valid.");
      res.redirect("/pembayaran");
      return;
    }

    if (metode === "cash") {
      res.redirect(`/pembayaran?id_tagihan=${tagihan.id}&metode=cash`);
      return;
    }

    let payment = await pembayaranModel.findPendingByBillAndMethod(tagihan.id, metode);
    if (!payment) {
      const paymentId = await pembayaranModel.create({
        id_tagihan: tagihan.id,
        metode,
        va_number: metode === "va" ? buildVaNumber(tagihan) : null,
        jumlah_bayar: tagihan.jumlah_tagihan,
        tanggal_bayar: new Date(),
        status: PAYMENT_STATUS.PENDING,
      });
      payment = await pembayaranModel.getById(paymentId);
    }

    res.redirect(`/pembayaran?payment_id=${payment.id}`);
  } catch (error) {
    next(error);
  }
}

async function store(req, res, next) {
  try {
    const metode = normalizeMethod(req.body.metode);

    if (metode === "cash") {
      const validationErrors = validateCashPayment(req.body);
      if (validationErrors.length) {
        validationErrors.forEach((message) => req.flash("error", message));
        res.redirect("/pembayaran");
        return;
      }

      const tagihan = await tagihanModel.getById(req.body.id_tagihan);
      if (!tagihan) {
        req.flash("error", "Tagihan tidak ditemukan.");
        res.redirect("/pembayaran");
        return;
      }

      if (
        req.user.role === "pelanggan" &&
        Number(tagihan.id_pelanggan) !== Number(req.user.pelanggan_id)
      ) {
        req.flash("error", "Anda hanya dapat membayar tagihan milik sendiri.");
        res.redirect("/pembayaran");
        return;
      }

      const amount = Number(req.body.jumlah_bayar || tagihan.jumlah_tagihan);
      await pembayaranModel.create({
        id_tagihan: tagihan.id,
        metode: "cash",
        va_number: null,
        jumlah_bayar: amount,
        tanggal_bayar: req.body.tanggal_bayar,
        status: PAYMENT_STATUS.PAID,
      });
      await tagihanModel.update(tagihan.id, { status_tagihan: BILL_STATUS.PAID });
      await notificationService.createNotification(
        `Pembayaran cash untuk tagihan #${tagihan.id} berhasil diproses.`
      );
      req.flash("success", "Pembayaran cash berhasil disimpan.");
      res.redirect("/pembayaran");
      return;
    }

    const payment = await pembayaranModel.getById(req.body.payment_id);
    if (!payment) {
      req.flash("error", "Data pembayaran tidak ditemukan.");
      res.redirect("/pembayaran");
      return;
    }

    if (
      req.user.role === "pelanggan" &&
      Number(payment.id_pelanggan) !== Number(req.user.pelanggan_id)
    ) {
      req.flash("error", "Anda hanya dapat memproses pembayaran milik sendiri.");
      res.redirect("/pembayaran");
      return;
    }

    await pembayaranModel.update(payment.id, {
      status: PAYMENT_STATUS.PAID,
      tanggal_bayar: new Date(),
    });
    await tagihanModel.update(payment.id_tagihan, { status_tagihan: BILL_STATUS.PAID });
    await notificationService.createNotification(
      `Pembayaran ${payment.metode.toUpperCase()} untuk tagihan #${payment.id_tagihan} berhasil diproses.`
    );
    req.flash("success", `Pembayaran ${payment.metode.toUpperCase()} berhasil dikonfirmasi.`);
    res.redirect("/pembayaran");
  } catch (error) {
    next(error);
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
