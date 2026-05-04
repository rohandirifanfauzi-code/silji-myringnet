const notifikasiModel = require("../models/notifikasiModel");
const pelangganModel = require("../models/pelangganModel");
const nodemailer = require("nodemailer");
const {
  NOTIFICATION_STATUS,
  NOTIFICATION_LIFECYCLE,
} = require("../constants/statuses");

function normalizePhone(value = "") {
  const digits = String(value).replace(/\D/g, "");
  if (!digits) {
    return "";
  }
  if (digits.startsWith("62")) {
    return digits;
  }
  if (digits.startsWith("0")) {
    return `62${digits.slice(1)}`;
  }
  return digits;
}

function buildWhatsAppLink(noHp, message) {
  const phone = normalizePhone(noHp);
  if (!phone) {
    return null;
  }
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function createTransporter() {
  if (!process.env.SMTP_HOST) {
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        }
      : undefined,
  });
}

async function createNotification(payload) {
  const data =
    typeof payload === "string"
      ? { pesan: payload }
      : payload;

  await notifikasiModel.create({
    role_tujuan: "admin",
    tipe: "general",
    alamat: null,
    tanggal_saran: null,
    id_teknisi: null,
    id_pelanggan: null,
    id_tugas: null,
    ...data,
    tanggal: new Date(),
    status_baca: NOTIFICATION_STATUS.UNREAD,
    status_notifikasi: data.status_notifikasi || NOTIFICATION_LIFECYCLE.PENDING,
  });
}

async function createExternalForCustomer({ id_pelanggan, subject, message }) {
  try {
    if (!id_pelanggan) {
      return { whatsappLink: null, emailSent: false };
    }

    if (!process.env.SMTP_HOST && process.env.EXTERNAL_NOTIFICATION_LOOKUP !== "true") {
      return { whatsappLink: null, emailSent: false, skipped: true };
    }

    const pelanggan = await pelangganModel.getById(id_pelanggan);
    if (!pelanggan) {
      return { whatsappLink: null, emailSent: false };
    }

    const whatsappLink = buildWhatsAppLink(pelanggan.no_hp, message);
    const transporter = createTransporter();
    let emailSent = false;

    if (transporter && pelanggan.email) {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || "SILJI MyRingNet <noreply@myringnet.local>",
        to: pelanggan.email,
        subject,
        text: message,
      });
      emailSent = true;
    }

    return { whatsappLink, emailSent };
  } catch (error) {
    console.warn("[notifikasi-eksternal] dilewati:", error.message);
    return { whatsappLink: null, emailSent: false };
  }
}

module.exports = { createNotification, createExternalForCustomer, buildWhatsAppLink };
