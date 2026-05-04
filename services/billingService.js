const billingModel = require("../models/billingModel");
const tagihanModel = require("../models/tagihanModel");
const notificationService = require("./notificationService");
const { pool } = require("../models/baseModel");
const {
  BILL_STATUS,
  NOTIFICATION_LIFECYCLE,
  NOTIFICATION_STATUS,
} = require("../constants/statuses");

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
  let connection;
  let created = false;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const existing = await tagihanModel.findMonthlyBillByCustomerAndPackage(
      customer.id,
      customer.id_paket,
      billDate,
      connection
    );

    if (!existing) {
      await tagihanModel.create(
        {
          id_pelanggan: customer.id,
          id_paket: customer.id_paket,
          tanggal_tagihan: billDate,
          jumlah_tagihan: customer.harga,
          status_tagihan: BILL_STATUS.UNPAID,
        },
        connection
      );
      await connection.query("INSERT INTO notifikasi SET ?", {
        pesan: `Tagihan untuk ${customer.nama} dibuat mengikuti tanggal pemasangan ${getBillDay(
          customer.tanggal_daftar
        )}.`,
        role_tujuan: "admin",
        tipe: "general",
        tanggal: new Date(),
        status_baca: NOTIFICATION_STATUS.UNREAD,
        status_notifikasi: NOTIFICATION_LIFECYCLE.PENDING,
      });
      created = true;
    }

    await connection.commit();
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }

  if (created) {
    await notificationService.createExternalForCustomer({
      id_pelanggan: customer.id,
      subject: "Tagihan baru",
      message: `Tagihan internet ${customer.nama} sebesar Rp ${Number(customer.harga).toLocaleString("id-ID")} telah dibuat.`,
    });
  }

  return created;
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
