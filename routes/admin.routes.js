const router = require("express").Router()
const AdminController = require("../controllers/admin.controller");
const { isAdminLoggedIn } = require("../middleware/authenticate.middleware");

router.post('/login', AdminController.AdminLogin);
router.post('/create', AdminController.AdminCreate);
router.put('/update/:id', AdminController.AdminUpdate);
router.delete('/delete/:id', AdminController.AdminDelete);
router.get('/profile', AdminController.AdminProfile);
router.put('/password-change',isAdminLoggedIn, AdminController.ChangePassword);
router.post('/logout', AdminController.AdminLogout);
router.get("/dashboard-stats" , AdminController.getAdminStats);

// REPORTS
router.get('/get-income-summary', AdminController.getIncomeSummary);
router.get('/all-users',isAdminLoggedIn, AdminController.getAllPartners);
router.post('/get-user',isAdminLoggedIn, AdminController.getUser);
router.get('/user-block/:id', isAdminLoggedIn,AdminController.UserBlock);
router.get('/user-roi-block/:id',isAdminLoggedIn, AdminController.UserROIBlock);
router.get('/user-currentIncome-hold/:id',isAdminLoggedIn, AdminController.UserCurrentIncomeHold);
router.get('/user-capital-lock/:id',isAdminLoggedIn, AdminController.UserCapitalLock);
router.get('/get-investment-history',isAdminLoggedIn, AdminController.getInvestmentReports);
router.post("/update-user-info/:id",isAdminLoggedIn, AdminController.updateUserInfo);
router.get('/get-withdrawal-history', AdminController.getWithdrawReports);
router.get('/get-levelincome-history', AdminController.getLevelIncomes);
router.get('/get-tradingprofit-history', AdminController.getTradingProfitIncomes);
router.get('/get-globalachiever-history', AdminController.getGlobalAchieverIncomes);   
router.get('/get-matching-history', AdminController.getMatchingIncomes);
router.get('/get-referralincome-history', AdminController.getReferralIncomes);
router.get('/get-rankreward-history', AdminController.getRankRewardIncomes);
router.get('/get-direct-downline', AdminController.getDirectDownline);
router.post('/get-dashboard-access', AdminController.getAdminToDashboardUser);
router.get("/recent-transactions" , AdminController.getRecentTransactions)
router.get("/all-transactions" , AdminController.getAllTransactions)
router.get("/income-history" , AdminController.getIncomeHistory)

//=================DOLLAR BANK ADMIN APIs================================//
router.get("/dollar-bank/summary", isAdminLoggedIn, AdminController.getDollarBankSummary)
router.get("/dollar-bank/all-users", isAdminLoggedIn, AdminController.getAllUsersDollarBankInvestments)
router.get("/dollar-bank/user/:userId", isAdminLoggedIn, AdminController.getUserDollarBankInvestments)
router.get("/dollar-bank/withdrawal-requests", isAdminLoggedIn, AdminController.getDollarBankWithdrawalRequests)
router.post("/dollar-bank/withdrawal-approve-reject", isAdminLoggedIn, AdminController.approveRejectDollarBankWithdrawal)

module.exports = router