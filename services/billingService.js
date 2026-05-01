const billingModel = require("../models/billingModel");
const tagihanModel = require("../models/tagihanModel");
const notificationService = require("./notificationService");
const { BILL_STATUS } = require("../constants/statuses");

function getBillDay(dateValue) {
  return new Date(dateValue).getDate();
}

function isBillingDate(tanggalDaftar, runDate) {
  const installDate = new Date(tanggalDaftar);
  const targetDay = installDate.getDate();
  const date = new Date(runDate);
  const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return date.getDate() === Math.min(targetDay, lastDayOfMonth);
}

async function createBillForCustomer(customer, billDate) {
  const existing = await tagihanModel.findMonthlyBillByCustomerAndPackage(
    customer.id,
    customer.id_paket,
    billDate
  );

  if (existing) {
    return false;
  }

  await tagihanModel.create({
    id_pelanggan: customer.id,
    id_paket: customer.id_paket,
    tanggal_tagihan: billDate,
    jumlah_tagihan: customer.harga,
    status_tagihan: BILL_STATUS.UNPAID,
  });
  await notificationService.createNotification(
    `Tagihan untuk ${customer.nama} dibuat mengikuti tanggal pemasangan ${getBillDay(
      customer.tanggal_daftar
    )}.`
  );
  return true;
}

async function generateScheduledBills(runDate = new Date()) {
  const customers = await billingModel.getEligibleCustomers();
  let generated = 0;

  for (const customer of customers) {
    if (!isBillingDate(customer.tanggal_daftar, runDate)) {
      continue;
    }

    if (await createBillForCustomer(customer, runDate)) {
      generated += 1;
    }
  }

  return generated;
}

async function generateBillAfterPsbCompletion(customerId, billDate = new Date()) {
  const hasCompletedTask = await billingModel.hasCompletedPsbTask(customerId);
  if (!hasCompletedTask) {
    return null;
  }

  const customer = await billingModel.getCustomerById(customerId);
  if (!customer) {
    return null;
  }

  await createBillForCustomer(customer, billDate);
  return customer;
}

module.exports = {
  generateScheduledBills,
  generateBillAfterPsbCompletion,
  _internals: {
    getBillDay,
    isBillingDate,
    createBillForCustomer,
  },
};
