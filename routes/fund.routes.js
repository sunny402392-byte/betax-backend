const router = require('express').Router();
const FundController = require("../controllers/fund.controller");
const { isAdminLoggedIn } = require('../middleware/authenticate.middleware');

router.post("/add",isAdminLoggedIn,FundController.Fundadd);
router.get("/get-fund-history",isAdminLoggedIn,FundController.Fundget);


module.exports = router;