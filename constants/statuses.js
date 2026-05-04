const TASK_STATUS = Object.freeze({
  PENDING: "pending",
  IN_PROGRESS: "proses",
  DONE: "selesai",
});

const COMPLAINT_STATUS = Object.freeze({
  NEW: "pending",
  IN_PROGRESS: "proses",
  DONE: "selesai",
});

const BILL_STATUS = Object.freeze({
  UNPAID: "belum_bayar",
  PAID: "lunas",
});

const PAYMENT_STATUS = Object.freeze({
  PENDING: "pending",
  PAID: "paid",
  FAILED: "failed",
});

const NOTIFICATION_STATUS = Object.freeze({
  UNREAD: "unread",
  READ: "read",
  SCHEDULED: "scheduled",
});

const NOTIFICATION_LIFECYCLE = Object.freeze({
  PENDING: "pending",
  SCHEDULED: "scheduled",
  DONE: "done",
});

module.exports = {
  TASK_STATUS,
  COMPLAINT_STATUS,
  BILL_STATUS,
  PAYMENT_STATUS,
  NOTIFICATION_STATUS,
  NOTIFICATION_LIFECYCLE,
};
