const router = require("express").Router();
const DollarBankController = require("../controllers/dollarBank.controller");
const AdminController = require("../controllers/admin.controller");
const { isLoggedIn, isAdminLoggedIn } = require("../middleware/authenticate.middleware");

//=================DOLLAR BANK USER APIs================================//
router.post("/invest", isLoggedIn, DollarBankController.DollarBankInvestment)
router.post("/invest-from-withdrawal-wallet", isLoggedIn, DollarBankController.TransferFromWithdrawalWalletToDollarBank)
router.post("/withdraw", isLoggedIn, DollarBankController.DollarBankWithdrawal)
router.get("/investments", isLoggedIn, DollarBankController.getDollarBankInvestments)
router.get("/my-investments", isLoggedIn, DollarBankController.getDollarBankInvestments)
router.get("/investment/:investmentId", isLoggedIn, DollarBankController.getDollarBankInvestmentDetails)

//=================DOLLAR BANK ADMIN APIs================================//
router.get("/summary", isAdminLoggedIn, AdminController.getDollarBankSummary)
router.get("/all-users", isAdminLoggedIn, AdminController.getAllUsersDollarBankInvestments)
router.get("/user/:userId", isAdminLoggedIn, AdminController.getUserDollarBankInvestments)
router.get("/withdrawal-requests", isAdminLoggedIn, AdminController.getDollarBankWithdrawalRequests)
router.post("/withdrawal-approve-reject", isAdminLoggedIn, AdminController.approveRejectDollarBankWithdrawal)

module.exports = router;

