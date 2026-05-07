    const router = require('express').Router();
const RewardController = require('../controllers/reward.controller');
const { isAdminLoggedIn, isLoggedIn } = require('../middleware/authenticate.middleware');

router.post('/create',isAdminLoggedIn,RewardController.RewardCreate);
router.put('/update/:id',isAdminLoggedIn,RewardController.RewardUpdate);
router.delete('/delete/:id',isAdminLoggedIn,RewardController.RewardDelete);
router.put('/status/:id',isAdminLoggedIn,RewardController.RewardStatusUpdate);

router.get('/get-admin-reports',isAdminLoggedIn,RewardController.RewardsAdminReports);
router.get('/get-client-reports',isLoggedIn,RewardController.RewardsClientReports);


router.get('/get-global-acheivers',isAdminLoggedIn,RewardController.RewardsGlobalAcheivers);
router.put('/update-global-acheivers/:id',isAdminLoggedIn,RewardController.RewardsGlobalAcheiversUpdate);
router.put('/status-global-acheivers/:id',isAdminLoggedIn,RewardController.RewardsGlobalAcheiversStatusUpdate);

router.get('/rank-status', isLoggedIn, RewardController.getUserRankStatus);
router.get('/royalty-status', isLoggedIn, RewardController.getRoyaltyStatus);
router.get('/rank-history', isLoggedIn, RewardController.getRankRewardHistory);
router.get('/royalty-history', isLoggedIn, RewardController.getRoyaltyIncomeHistory);


module.exports = router;