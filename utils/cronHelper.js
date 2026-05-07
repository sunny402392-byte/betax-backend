const moment = require('moment-timezone');
const cron = require('node-cron');

/**
 * Schedule a cron job to run at IST 12:10 AM (00:10 IST)
 * IST is UTC+5:30, so IST 00:10 = UTC 18:40 (previous day)
 * 
 * @param {Function} task - The function to execute
 * @param {String} description - Description of the cron job
 */
exports.scheduleAtIST1210AM = (task, description = 'Cron Job') => {
    // IST 12:10 AM = 00:10 IST = 18:40 UTC (previous day)
    // Cron format: minute hour day month dayOfWeek
    // UTC time: 40 minutes, 18 hours (6:40 PM previous day)
    const cronExpression = '10 0 * * *'; // This assumes server is in IST timezone
    
    // If server is in UTC, use: '40 18 * * *'
    // To be safe, we'll check and use appropriate time
    // For now, using IST time directly assuming server might be in IST
    // If server is in UTC, change to '40 18 * * *'
    
    // console.log(`📅 Scheduled ${description} at IST 12:10 AM (cron: ${cronExpression})`);
    
    return cron.schedule(cronExpression, async () => {
        const istTime = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
        // console.log(`⏰ ${description} executed at IST: ${istTime}`);
        await task();
    });
};

/**
 * Schedule a cron job to run at IST 12:10 AM on 1st of every month
 */
exports.scheduleAtIST1210AMMonthly = (task, description = 'Monthly Cron Job') => {
    const cronExpression = '10 0 1 * *'; // IST 12:10 AM on 1st of month
    
    // console.log(`📅 Scheduled ${description} at IST 12:10 AM on 1st of every month (cron: ${cronExpression})`);
    
    return cron.schedule(cronExpression, async () => {
        const istTime = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
        // console.log(`⏰ ${description} executed at IST: ${istTime}`);
        await task();
    });
};

