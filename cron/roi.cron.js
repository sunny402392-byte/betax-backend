// roi.cron.js
const cron = require("node-cron");
const moment = require("moment-timezone");
const {UserModel} = require("../models/user.model");

// Run every day at IST 12:10 AM (00:10 IST)
// IST is UTC+5:30, so IST 00:10 = UTC 18:40 (previous day)
// Using '10 0 * * *' assuming server is in IST, if server is in UTC use '40 18 * * *'
cron.schedule("0 0 * * *", async () => {
  try {
    const istTime = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
    // console.log(`⏰ ROI Reset Cron executed at IST: ${istTime}`);
    await UserModel.updateMany({}, { todayRoiCollected: false });
    // console.log("🌙 Reset all users' todayRoiCollected to FALSE (IST 12:10 AM reset)");
  } catch (err) {
    console.error("❌ Error resetting ROI flags:", err.message);
  }
});
