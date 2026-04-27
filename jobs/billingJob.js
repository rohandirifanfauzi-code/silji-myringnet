const cron = require("node-cron");
const billingService = require("../services/billingService");

function startBillingJob() {
  cron.schedule("0 5 * * *", async () => {
    try {
      const total = await billingService.generateScheduledBills(new Date());
      console.log(`[billing-job] ${total} tagihan terjadwal dibuat.`);
    } catch (error) {
      console.error("[billing-job] gagal menjalankan scheduler:", error.message);
    }
  });
}

module.exports = { startBillingJob };
