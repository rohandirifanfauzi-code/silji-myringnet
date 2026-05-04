const notificationService = require("../services/notificationService");
const auditService = require("../services/auditService");
const { pool } = require("../models/baseModel");
const { BILL_STATUS, PAYMENT_STATUS } = require("../constants/statuses");

async function callback(req, res, next) {
  let connection;
  try {
    const reference = req.body.payment_reference || req.body.reference;
    const status = String(req.body.status || req.body.status_pembayaran || "").toLowerCase();

    if (!reference || ![PAYMENT_STATUS.PAID, PAYMENT_STATUS.FAILED, PAYMENT_STATUS.PENDING].includes(status)) {
      res.status(400).json({ success: false, message: "Payload callback tidak valid." });
      return;
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [paymentRows] = await connection.query(
      `SELECT pembayaran.*, tagihan.id_pelanggan, tagihan.status_tagihan
       FROM pembayaran
       INNER JOIN tagihan ON tagihan.id = pembayaran.id_tagihan
       WHERE pembayaran.payment_reference = ?
       LIMIT 1
       FOR UPDATE`,
      [reference]
    );
    const payment = paymentRows[0];
    if (!payment) {
      await connection.rollback();
      res.status(404).json({ success: false, message: "Payment reference tidak ditemukan." });
      return;
    }

    if (
      status === PAYMENT_STATUS.PAID &&
      (payment.status === PAYMENT_STATUS.PAID ||
        payment.status_pembayaran === PAYMENT_STATUS.PAID ||
        payment.status_tagihan === BILL_STATUS.PAID)
    ) {
      await connection.rollback();
      if (req.accepts("html")) {
        req.flash("error", "Pembayaran ini sudah lunas dan tidak dapat diproses ulang.");
        res.redirect("/pembayaran");
        return;
      }
      res.status(409).json({ success: false, message: "Pembayaran sudah lunas." });
      return;
    }

    await connection.query("UPDATE pembayaran SET ? WHERE id = ?", [
      {
        status,
        status_pembayaran: status,
        tanggal_bayar: new Date(),
      },
      payment.id,
    ]);

    if (status === PAYMENT_STATUS.PAID) {
      await connection.query("UPDATE tagihan SET ? WHERE id = ?", [
        { status_tagihan: BILL_STATUS.PAID },
        payment.id_tagihan,
      ]);
    }

    await connection.commit();

    if (status === PAYMENT_STATUS.PAID) {
      await notificationService.createExternalForCustomer({
        id_pelanggan: payment.id_pelanggan,
        subject: "Pembayaran berhasil",
        message: `Pembayaran tagihan #${payment.id_tagihan} berhasil dikonfirmasi.`,
      });
    }

    await auditService.log(req, "payment_callback", "pembayaran", `Callback ${reference} menjadi ${status}.`);
    if (req.accepts("html")) {
      req.flash("success", `Callback gateway berhasil: ${reference} menjadi ${status}.`);
      res.redirect("/pembayaran");
      return;
    }
    res.json({ success: true, payment_reference: reference, status });
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

module.exports = { callback };
