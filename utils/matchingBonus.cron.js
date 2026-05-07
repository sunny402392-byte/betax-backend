const cron = require('node-cron');
const moment = require('moment-timezone');
const { UserModel } = require('../models/user.model');
const { calculateMatchingBonus } = require('./matchingBonus');

// Matching Income Cron - COMMENTED OUT
// Run every day at IST 12:10 AM (00:10 IST)
// IST is UTC+5:30, so IST 00:10 = UTC 18:40 (previous day)
// Using '10 0 * * *' assuming server is in IST, if server is in UTC use '40 18 * * *'
// cron.schedule('10 0 * * *', async () => {
//   try {
//     const istTime = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
//     // console.log(`⏰ Matching Bonus Cron executed at IST: ${istTime}`);
//     // console.log("✅ Running daily matching bonus calculation...");
//
//     const users = await UserModel.find({}); // sabhi users
//
//     for (let user of users) {
//       // calculate matching bonus for each new user (10% example)
//       await calculateMatchingBonus(user._id, 10);
//     }
//
//     // console.log("✅ Daily matching bonus calculation completed.");
//   } catch (err) {
//     console.error("Error in matching bonus cron:", err);
//   }
// });