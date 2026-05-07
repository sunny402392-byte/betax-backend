// combined.daily.cron.js
const cron = require("node-cron");
const moment = require("moment-timezone");
const { UserModel } = require("../models/user.model");
const { calculateWithdrawalStats } = require("../utils/withdrawalHelper");
const logger = require("../utils/logger");

// Run every day at IST midnight (00:00 IST = 18:30 UTC previous day)
cron.schedule("30 18 * * *", async () => {
  const istTime = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
  logger.cronLog('Daily Reset Cron', 'STARTED', { istTime });

  try {
    // Reset todayRoiCollected so users can mine again next day
    await UserModel.updateMany({}, { todayRoiCollected: false });
    logger.info('All todayRoiCollected flags reset - users can mine again');

    // Calculate Withdrawal Stats
    await calculateWithdrawalStats();

    logger.cronLog('Daily Reset Cron', 'SUCCESS');
  } catch (err) {
    logger.cronLog('Daily Reset Cron', 'FAILED', { error: err.message, stack: err.stack });
  }
});
