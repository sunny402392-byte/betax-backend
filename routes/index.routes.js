var express = require('express');
var router = express.Router();

const userRouter = require('./user.routes');
const adminRouter = require('./admin.routes');
const bannerRouter = require('./banner.routes');
const rewardRouter = require('./reward.routes');
const supportRouter = require('./support.routes');
const enquiryRouter = require('./enquiry.routes');
const packageRouter = require('./package.routes');
const twoFaRouter = require('./2fa.routes');
const transactionRouter = require('./transaction.routes');
const livetradeRouter = require('./livetrade.routes');
const rewardRequestRouter = require('./rewardrequest.routes');
const notificationRouter = require('./notifications.routes');
const fundRouter = require('./fund.routes');
const dollarBankRouter = require('./dollarBank.routes');
const clubRouter = require('./club.routes');



// USER - Mount specific routes first before general /user route
router.use('/user/2fa', twoFaRouter);
router.use('/user/tx', transactionRouter);
router.use('/admin/tx', transactionRouter);
router.use('/user', userRouter);

// PACKAGE CREATE
router.use('/admin/package', packageRouter);
router.use('/user/package', packageRouter);

// ADMIN
router.use('/admin', adminRouter);

// BANNER CREATE
router.use('/admin/banner', bannerRouter);
router.use('/user/banner', bannerRouter);

// REWARD CREATE
router.use('/admin/reward', rewardRouter);
router.use('/user/reward', rewardRouter);

// SUPPORTS
router.use('/admin/support', supportRouter);
router.use('/user/support', supportRouter);

// ENQUIRY
router.use('/admin/enquiry', enquiryRouter);
router.use('/user/enquiry', enquiryRouter);

// LIVE TRADE PROFIT
router.use('/admin/lt', livetradeRouter);

// RANK REWARD AMOUNT REQUEST
router.use('/admin/reward-request', rewardRequestRouter);
router.use('/user/reward-request', rewardRequestRouter);

// FUND ADD -----------------
router.use('/admin/fund', fundRouter);

// --- FUND ADD END -----------------
// ---- NOTIFICATION ROUTE START ----
router.use('/admin/notification', notificationRouter);
router.use('/user/notification', notificationRouter);
// ---- NOTIFICATION ROUTE START ----

// DOLLAR BANK ROUTES
router.use('/dollar-bank', dollarBankRouter);
router.use('/user/dollar-bank', dollarBankRouter);

// CLUB MANAGEMENT ROUTES
router.use('/admin/club', clubRouter);
router.use('/user/club', clubRouter);

module.exports = router;
