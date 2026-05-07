const cron = require('node-cron');
const { distributeMonthlyRankRewards, calculateMonthlyRoyalty } = require('../controllers/reward.controller');
const logger = require('../utils/logger');

// Run on 1st of every month at 00:01
cron.schedule('1 0 1 * *', async () => {
  try {
    logger.info('🎁 Starting monthly rank & royalty distribution...');
    await distributeMonthlyRankRewards();
    await calculateMonthlyRoyalty();
    logger.info('✅ Monthly rank & royalty distribution completed');
  } catch (err) {
    logger.error('❌ Rank & Royalty cron error:', err);
  }
});

module.exports = { distributeMonthlyRankRewards, calculateMonthlyRoyalty };
