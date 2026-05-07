const { isAdminLoggedIn, isLoggedIn } = require("../middleware/authenticate.middleware");
const RankRewardController = require("../controllers/rewardrequest.controller");

const router = require("express").Router();

router.post('/rank-reward-request/:id',isLoggedIn,RankRewardController.RewardRequest);
router.get('/rank-reward-request-history',isAdminLoggedIn,RankRewardController.RewardRequestHistory);
router.get('/rank-reward-history',isAdminLoggedIn,RankRewardController.RewardRequestAllHistory);
router.post('/rank-reward-accept/:id',isAdminLoggedIn,RankRewardController.RewardRequestAccepted);

module.exports = router;