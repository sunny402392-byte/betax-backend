// daily.cron.js
const cron = require("node-cron");
const moment = require("moment-timezone");
const { calculateDailyROIForUsers } = require("../services/dailyRoi");
const { tradingNodeCron } = require("../utils/levelIncome.calculation");

// DAILY ROI - DISABLED
// Run every day at IST 12:10 AM (00:10 IST)
// IST is UTC+5:30, so IST 00:10 = UTC 18:40 (previous day)
// Using '10 0 * * *' assuming server is in IST, if server is in UTC use '40 18 * * *'
// cron.schedule("1 0 * * *", async () => {
//   const istTime = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
//   // console.log(`⏰ Daily ROI & Trading Cron executed at IST: ${istTime}`);
//   try {
//       await calculateDailyROIForUsers();
//       await tradingNodeCron();
//       // console.log("🎉 Daily ROI + Trading Profit Completed Successfully!");
//     } catch (error) {
//       console.error("❌ Error in Daily ROI Cron:", error.message);
//     }
// });
