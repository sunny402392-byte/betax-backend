const cron = require('node-cron');
const moment = require('moment-timezone');
const { tradingNodeCron, matchingNodeCron, globalNodeCron, rewardNodeCron } = require('./levelIncome.calculation');

// Note: This file seems to be a test/development file with every minute cron
// The actual production crons are in cron/daily.cron.js and utils/levelIncome.calculation.js
// Commenting out the every-minute cron to avoid conflicts
// cron.schedule('* * * * *',async () => { 
//     // console.log('Trading Node Cron Job Executed');
//     await tradingNodeCron();
//     // await globalNodeCron();
//     // await rewardNodeCron();
//     // console.log('Global Node Cron Job Executed');
// });

// Matching Income Cron - COMMENTED OUT
// Run on 1st of every month at IST 12:10 AM (00:10 IST)
// IST is UTC+5:30, so IST 00:10 = UTC 18:40 (previous day)
// Using '10 0 1 * *' assuming server is in IST, if server is in UTC use '40 18 1 * *'
// cron.schedule('10 0 1 * *', async()=>{
//     const istTime = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
//     // console.log(`⏰ Matching Node Cron (dailyCron.js) executed at IST: ${istTime}`);
//     await matchingNodeCron();
//     // console.log('Matching Node Cron Job Executed');
// });
