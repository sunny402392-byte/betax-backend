const { isLoggedIn, isAdminLoggedIn } = require("../middleware/authenticate.middleware");
const livetradeController = require("../controllers/livetrade.controller");
const router = require("express").Router();


router.post('/live-trade-profit/:id', isAdminLoggedIn, livetradeController.LiveTrading);

module.exports = router;