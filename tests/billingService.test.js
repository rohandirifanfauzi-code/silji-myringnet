const test = require("node:test");
const assert = require("node:assert/strict");

const billingModel = require("../models/billingModel");
const tagihanModel = require("../models/tagihanModel");
const notificationService = require("../services/notificationService");
const billingService = require("../services/billingService");
const { BILL_STATUS } = require("../constants/statuses");

test("isBillingDate respects customer install day and month length", () => {
  const { isBillingDate } = billingService._internals;
  assert.equal(isBillingDate("2026-01-31", new Date("2026-02-28")), true);
  assert.equal(isBillingDate("2026-01-15", new Date("2026-02-14")), false);
});

test("generateBillAfterPsbCompletion skips when PSB not completed", async () => {
  const originalHasCompleted = billingModel.hasCompletedPsbTask;
  const originalGetCustomer = billingModel.getCustomerById;
  const originalFindMonthly = tagihanModel.findMonthlyBillByCustomerAndPackage;
  const originalCreate = tagihanModel.create;
  const originalNotify = notificationService.createNotification;

  let created = false;

  billingModel.hasCompletedPsbTask = async () => false;
  billingModel.getCustomerById = async () => ({});
  tagihanModel.findMonthlyBillByCustomerAndPackage = async () => null;
  tagihanModel.create = async () => {
    created = true;
  };
  notificationService.createNotification = async () => {};

  const result = await billingService.generateBillAfterPsbCompletion(1, new Date("2026-05-01"));
  assert.equal(result, null);
  assert.equal(created, false);

  billingModel.hasCompletedPsbTask = originalHasCompleted;
  billingModel.getCustomerById = originalGetCustomer;
  tagihanModel.findMonthlyBillByCustomerAndPackage = originalFindMonthly;
  tagihanModel.create = originalCreate;
  notificationService.createNotification = originalNotify;
});

test("generateBillAfterPsbCompletion creates one unpaid bill after completed PSB", async () => {
  const originalHasCompleted = billingModel.hasCompletedPsbTask;
  const originalGetCustomer = billingModel.getCustomerById;
  const originalFindMonthly = tagihanModel.findMonthlyBillByCustomerAndPackage;
  const originalCreate = tagihanModel.create;
  const originalNotify = notificationService.createNotification;

  const createdPayloads = [];

  billingModel.hasCompletedPsbTask = async () => true;
  billingModel.getCustomerById = async () => ({
    id: 22,
    nama: "Budi Santoso",
    tanggal_daftar: "2026-05-01",
    id_paket: 3,
    harga: 400000,
  });
  tagihanModel.findMonthlyBillByCustomerAndPackage = async () => null;
  tagihanModel.create = async (payload) => {
    createdPayloads.push(payload);
    return 101;
  };
  notificationService.createNotification = async () => {};

  const result = await billingService.generateBillAfterPsbCompletion(22, new Date("2026-05-03"));
  assert.equal(result.id, 22);
  assert.equal(createdPayloads.length, 1);
  assert.equal(createdPayloads[0].status_tagihan, BILL_STATUS.UNPAID);
  assert.equal(createdPayloads[0].id_pelanggan, 22);

  billingModel.hasCompletedPsbTask = originalHasCompleted;
  billingModel.getCustomerById = originalGetCustomer;
  tagihanModel.findMonthlyBillByCustomerAndPackage = originalFindMonthly;
  tagihanModel.create = originalCreate;
  notificationService.createNotification = originalNotify;
});
