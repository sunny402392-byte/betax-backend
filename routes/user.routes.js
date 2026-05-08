const router = require("express").Router();
const UserController = require('../controllers/user.controller');
const WalletController = require('../controllers/wallet.controller');
const { isLoggedIn } = require("../middleware/authenticate.middleware");
const FundController = require("../controllers/fund.controller")
const RoiController = require("../controllers/roi.controller")
const PackageController = require("../controllers/package.controller")
const DollarBankController = require("../controllers/dollarBank.controller")
const { verifyReferralCode } = require('../controllers/user.controller');

// ✅ ADD THIS LINE AT TOP (Line 11)
router.get('/verify-referral/:referralCode', verifyReferralCode);

router.get('/get-referral-program', isLoggedIn, UserController.getReferralProgram);

// Telegram auto-register
router.post("/telegram-register", async (req, res) => {
  try {
    const { telegramId, username, referralCode } = req.body;
    if (!telegramId || !username)
      return res.status(400).json({ success: false, message: "telegramId and username required" });
    const botModule = require("../utils/telegramBot");
    if (!botModule || !botModule.autoRegisterFromTelegram)
      return res.status(503).json({ success: false, message: "Telegram bot not configured" });
    const result = await botModule.autoRegisterFromTelegram({ telegramId, username, referralCode });
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/get-user', isLoggedIn, UserController.getUser);
router.post("/update-profile", isLoggedIn, UserController.updateProfile);
// ----------------------- AUTH START -----------------------
router.post('/register', WalletController.WalletRegister);
router.post('/login', WalletController.WalletLogin);
// ----------------------- AUTH END -----------------------

router.get('/dashboard-stats', isLoggedIn, UserController.getUserDashboardStats);


// ------------  ALL INCOMES SUMMARY START ----------------
router.get('/get-income-summary', isLoggedIn, UserController.getIncomeSummary);
router.get('/get-transaction-history',isLoggedIn,UserController.getRecentTransactions)
// ------------  ALL INCOMES SUMMARY END ----------------

// ------------  ALL INCOMES SUMMARY END ----------------
router.get('/get-partners', isLoggedIn, UserController.getPartners);
router.get('/get-myteams' , isLoggedIn, UserController.getMyTeams);
router.get('/get-team-division', isLoggedIn, UserController.getMyTeamDivision);
router.get('/get-all-team-members', isLoggedIn, UserController.getAllTeamMembers);
router.get('/get-investment-reports', isLoggedIn, UserController.getInvestmentReports);

// Reinvestment routes
router.get('/get-income-balance', isLoggedIn, UserController.getAvailableIncomeBalance);
router.post('/reinvest', isLoggedIn, UserController.reinvestFromIncome);
router.get('/get-reinvestment-history', isLoggedIn, UserController.getReinvestmentHistory);
router.get('/get-withdrawal-history', isLoggedIn, UserController.getWithdrawalReports);
const WithdrawalController = require('../controllers/withdrawal.controller');
router.post('/tx/withdrawal-request', isLoggedIn, WithdrawalController.requestWithdrawal);
router.post("/investment", isLoggedIn, UserController.PackageInvestment);
router.get("/deposit-wallets", isLoggedIn, UserController.getDepositWallets);

// Package routes
router.get('/get-all-packages', PackageController.PackagesAllReports);
router.get('/get-package-info', PackageController.PackagesAllReports);

// ------------  FOUR TYPE INCOMES START ----------------
router.get("/get-todays-tradingprofit", isLoggedIn, UserController.getTodaysTradingProfit);
router.get("/get-income-history",isLoggedIn,UserController.getIncomeHistory);
router.get('/get-levelincome-history',isLoggedIn,UserController.getLevelIncomes);
router.get('/get-tradingprofit-history',isLoggedIn,UserController.getTradingProfitIncomes);
router.get('/get-globalachiever-history',isLoggedIn,UserController.getGlobalAchieverIncomes);
router.get('/get-matching-history',isLoggedIn,UserController.getMatchingIncomes);
router.get('/get-referralincome-history',isLoggedIn,UserController.getReferralIncomes);
router.get('/get-rankreward-history',isLoggedIn,UserController.getRankRewardIncomes);
// ------------  FOUR TYPE INCOMES END ----------------


// ------------ DOWNLINE TREE VIEW START ----------------
router.get('/get-global-achiever-leaderboard', isLoggedIn, UserController.GlobalAchieverLeaderBoard);
router.get('/get-rank-reward-leaderboard', isLoggedIn, UserController.RankRewardLeaderBoard);
router.get('/get-downline-tree', isLoggedIn, UserController.getDownlineTree);
// ------------ All transation ----------------
router.get("/get-tansactions" , isLoggedIn , UserController.getTransaction)
router.get("/all-transactions" , isLoggedIn , UserController.getTransaction)
router.get("/7-days-history" , isLoggedIn , UserController.getTransactionOf7days)

//==============================ROI======================================//
router.get('/calculate-roi', isLoggedIn, UserController.calculateUserROI);
router.get('/roi-history', isLoggedIn, UserController.getROIHistory);
router.get('/generation-roi-history', isLoggedIn, UserController.getGenerationROIHistory);


//=================USER TO USER FUND ADD================================//
router.post("/add-fund" , isLoggedIn , FundController.createOnchainPaymentIntent)
router.post("/verify-otp" , isLoggedIn , FundController.verifyOtpAndPrepareUSDTTransfer)
router.post("/verify-transfer" , isLoggedIn , FundController.verifyOnchainPayment)
router.get("/addfund-history" , isLoggedIn , FundController.userTransferHistory)
router.post("/get-name-by-username" , isLoggedIn , UserController.getUserByUsername)

//=================DOLLAR BANK================================//
router.post("/dollar-bank/invest", isLoggedIn, DollarBankController.DollarBankInvestment)
router.post("/dollar-bank/withdraw", isLoggedIn, DollarBankController.DollarBankWithdrawal)
router.get("/dollar-bank/investments", isLoggedIn, DollarBankController.getDollarBankInvestments)
router.get("/dollar-bank/investment/:investmentId", isLoggedIn, DollarBankController.getDollarBankInvestmentDetails)

module.exports = router
