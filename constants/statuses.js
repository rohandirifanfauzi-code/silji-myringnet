const TASK_STATUS = Object.freeze({
  PENDING: "DITUGASKAN",
  IN_PROGRESS: "PROSES",
  DONE: "SELESAI",
});

const COMPLAINT_STATUS = Object.freeze({
  NEW: "BARU",
  IN_PROGRESS: "DIPROSES",
  DONE: "SELESAI",
});

const BILL_STATUS = Object.freeze({
  UNPAID: "BELUM BAYAR",
  PAID: "LUNAS",
});

const PAYMENT_STATUS = Object.freeze({
  PENDING: "pending",
  PAID: "paid",
});

module.exports = {
  TASK_STATUS,
  COMPLAINT_STATUS,
  BILL_STATUS,
  PAYMENT_STATUS,
};
