// teamShuffle.cron.js
// Team shuffling cron - Runs every Monday at 3:00 AM IST
const cron = require("node-cron");
const moment = require("moment-timezone");
const { shuffleAllTeams } = require("../utils/teamDivision.calculation");
const logger = require("../utils/logger");

// Cron expression for every Monday at 3:00 AM IST
// IST is UTC+5:30, so 3:00 AM IST = 21:30 UTC (previous day - Sunday)
// Using Asia/Kolkata timezone option
cron.schedule("0 3 * * 1", async () => {
  const istTime = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
  logger.cronLog('Weekly Team Shuffle', 'STARTED', { istTime });

  try {
    const result = await shuffleAllTeams();
    logger.cronLog('Weekly Team Shuffle', 'SUCCESS', { 
      successCount: result.successCount, 
      failCount: result.failCount 
    });
  } catch (err) {
    logger.cronLog('Weekly Team Shuffle', 'FAILED', { 
      error: err.message, 
      stack: err.stack 
    });
  }
}, {
  timezone: "Asia/Kolkata"
});

logger.info('Team Shuffle Cron Job Initialized - Runs every Monday at 3:00 AM IST');


