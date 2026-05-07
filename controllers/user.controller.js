const mongoose = require("mongoose");
const { TransactionModel } = require("../models/transaction.model");
const { UserModel } = require("../models/user.model");
const { RewardModel } = require("../models/reward.model");
const { CommissionIncome } = require("../models/commission.model");
const logger = require("../utils/logger");
const {
  getDownlineArray,
  getDirectPartnersDownlines,
  getDownlineTree,
} = require("../utils/getteams.downline");
const { calculateTeamDivision, saveTeamDivision } = require("../utils/teamDivision.calculation");
const { TeamDivisionModel } = require("../models/teamDivision.model");
const ethers = require("ethers");
const ROIHistory = require("../models/roiHistory");
const { distributeGenerationROI } = require("../controllers/roi.controller");
const { calculateDailyROIForUser } = require("../services/dailyRoi");
const generationHistory = require("../models/generation.model");
const { IncomeModel } = require("../models/income.model");

exports.getUser = async (req, res) => {
  try {
    const user = await UserModel.findById(req.user._id)
      .populate({ path: "incomeDetails", select: "income" })
      .populate({ path: "sponsor", select: "id username -_id" });
    if (!user)
      return res
        .status(500)
        .json({ success: false, message: "User not found." });
    const activeUsers = await UserModel.countDocuments({
      sponsor: user._id,
      "active.isActive": true,
    });
    res.status(200).json({
      success: true,
      data: { ...user._doc, activeUsers },
      role: user.role,
      token: user.token.token,
      message: "Get Profile successfully.",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.ProfilePictureUpdate = async (req, res) => {
  try {
    const { picture } = req.body;
    const user = await UserModel.findById(req.user._id);
    if (!user)
      return res
        .status(500)
        .json({ success: false, message: "User not found." });
    if (user.picture != picture) {
      user.picture = await uploadToImageKit(picture, "Profiles");
      await user.save();
    }
    res
      .status(200)
      .json({ success: true, message: "Profile Picture update successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getDirectPartners = async (req, res) => {
  const userId = req.user._id;
  try {
    const partners = await UserModel.find({ sponsor: userId })
      .populate("partners")
      .sort({ createdAt: -1 });
    // // console.log(partners);
    res.status(200).json({
      success: true,
      data: partners,
      message: "Get Partners successfully.",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTradingProfitIncomes = async (req, res) => {
  try {
    const history = await CommissionIncome.find({
      user: req.user._id,
      type: "Trading Profit Income",
    })
      .populate("user")
      .populate([
        { path: "package", select: "-users" },
        { path: "tx", select: "createdAt id amount" },
      ]);
    const totalIncome = history.reduce(
      (sum, investment) => sum + investment.income,
      0
    );
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayLevelIncome = history.filter(
      (investment) => investment.createdAt >= startOfToday
    );
    const todayTotal = todayLevelIncome.reduce(
      (sum, investment) => sum + investment.income,
      0
    );
    res.status(200).json({
      success: true,
      message: "Trading Profit Incomes Reports",
      data: { history, totalIncome, todayTotal },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
exports.getLevelIncomes = async (req, res) => {
  try {
    const history = await CommissionIncome.find({
      user: req.user._id,
      type: "Level Income",
    }).populate({ path: "user fromUser", select: "id account username" });
    const totalIncome = history.reduce(
      (sum, investment) => sum + investment.income,
      0
    );
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayLevelIncome = history.filter(
      (investment) => investment.createdAt >= startOfToday
    );
    const todayTotal = todayLevelIncome.reduce(
      (sum, investment) => sum + investment.income,
      0
    );
    res.status(200).json({
      success: true,
      message: "Level Incomes Reports",
      data: { history, totalIncome, todayTotal },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
exports.getMatchingIncomes = async (req, res) => {
  try {
    const history = await CommissionIncome.find({
      user: req.user._id,
      type: "Matching Income",
    });
    const totalIncome = history.reduce(
      (sum, investment) => sum + investment.income,
      0
    );
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayLevelIncome = history.filter(
      (investment) => investment.createdAt >= startOfToday
    );
    const todayTotal = todayLevelIncome.reduce(
      (sum, investment) => sum + investment.income,
      0
    );
    res.status(200).json({
      success: true,
      message: "Matching Income Reports",
      data: { history, totalIncome, todayTotal },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
exports.getGlobalAchieverIncomes = async (req, res) => {
  try {
    const history = await CommissionIncome.find({
      user: req.user._id,
      type: "Global Archive Reward",
    })
      .populate("user")
      .populate([{ path: "reward", select: "title investment" }]);
    const totalIncome = history.reduce(
      (sum, investment) => sum + investment.income,
      0
    );
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayLevelIncome = history.filter(
      (investment) => investment.createdAt >= startOfToday
    );
    const todayTotal = todayLevelIncome.reduce(
      (sum, investment) => sum + investment.income,
      0
    );
    res.status(200).json({
      success: true,
      message: "Global Archive Reward Reports",
      data: { history, totalIncome, todayTotal },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
exports.getRankRewardIncomes = async (req, res) => {
  try {
    const history = await CommissionIncome.find({
      user: req.user._id,
      type: "Rank Reward",
    }).populate([{ path: "reward", select: "title investment" }]);
    res.status(200).json({
      success: true,
      message: "Monthly Incomes Reports",
      data: { history },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
exports.getReferralIncomes = async (req, res) => {
  try {
    const history = await CommissionIncome.find({
      user: req.user._id,
      type: "Referral Income",
    }).populate([{ path: "user fromUser", select: "id account username" }]);
    const totalIncome = history.reduce(
      (sum, investment) => sum + investment.income,
      0
    );
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayReferralIncome = history.filter(
      (investment) => investment.createdAt >= startOfToday
    );
    const todayTotal = todayReferralIncome.reduce(
      (sum, investment) => sum + investment.income,
      0
    );
    res.status(200).json({
      success: true,
      message: "Referral Incomes Reports",
      data: { history, totalIncome, todayTotal },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
exports.getInvestmentReports = async (req, res) => {
  try {
    const history = await TransactionModel.find({
      user: req.user._id,
      type: "Deposit",
    }).sort({ createdAt: -1 });
    const totalIncome = history.reduce(
      (total, investment) => total + investment.investment,
      0
    );
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayInvestments = history.filter(
      (txn) => txn.createdAt >= startOfToday
    );
    const todayTotal = todayInvestments.reduce(
      (sum, txn) => sum + txn.investment,
      0
    );
    res.status(200).json({
      success: true,
      message: "Wallet Recharge Investment Reports",
      data: { history, totalIncome, todayTotal },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getWithdrawalReports = async (req, res) => {
  try {
    const history = await TransactionModel.find({
      user: req.user._id,
      type: "Withdrawal",
    }).sort({ createdAt: -1 });
    
    // Calculate totals
    const totalAmount = history.reduce(
      (total, investment) => total + (investment.investment || 0),
      0
    );
    const totalGasFee = history.reduce(
      (total, txn) => total + (txn.gasFee || 0),
      0
    );
    const totalNetAmount = history.reduce(
      (total, txn) => total + (txn.netAmount || 0),
      0
    );
    
    // Today's calculations
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayInvestments = history.filter(
      (txn) => txn.createdAt >= startOfToday
    );
    const todayTotal = todayInvestments.reduce(
      (sum, txn) => sum + (txn.investment || 0),
      0
    );
    const todayGasFee = todayInvestments.reduce(
      (sum, txn) => sum + (txn.gasFee || 0),
      0
    );
    const todayNetAmount = todayInvestments.reduce(
      (sum, txn) => sum + (txn.netAmount || 0),
      0
    );
    
    res.status(200).json({
      success: true,
      message: "Withdrawal History",
      data: { 
        history, 
        summary: {
          totalAmount: totalAmount, // Total withdrawal requests
          totalGasFee: totalGasFee, // Total gas fees paid
          totalNetAmount: totalNetAmount, // Total amount received/expected
          todayTotal: todayTotal,
          todayGasFee: todayGasFee,
          todayNetAmount: todayNetAmount
        }
      },
    });
  } catch (error) {
    logger.error('Get withdrawal reports failed', { userId: req.user?._id, error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getIncomeSummary = async (req, res) => {
  try {
    const userId = req.user._id;
    // // console.log('getIncomeSummary - userId:', userId, 'type:', typeof userId);
    const objectUserId = new mongoose.Types.ObjectId(userId);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
    
    // Get user's investment from user model
    const user = await UserModel.findById(userId).select('investment');
    // // console.log('User data:', user);
    const userInvestment = user?.investment || 0;
    // // console.log('userInvestment:', userInvestment);
    
    // Direct partners count
    const partners = await UserModel.countDocuments({ sponsor: userId });
    const partnerActive = await UserModel.countDocuments({
      sponsor: userId,
      "active.isActive": true,
    });
    const partnerInactive = await UserModel.countDocuments({
      sponsor: userId,
      "active.isActive": false,
    });

    // Income sources according to Avifx.global requirements
    const incomeSources = {
      trading: {
        model: CommissionIncome,
        field: "income",
        match: { type: "Trading Profit Income" }, // Trade ROI (4-7% monthly)
      },
      level: {
        model: CommissionIncome,
        field: "income",
        match: { type: "Level Income" }, // Level Income (27% total distribution)
      },
      globalAchiever: {
        model: CommissionIncome,
        field: "income",
        match: { type: "Global Archive Reward" }, // Royalty Club Income (2-6%)
      },
      rankReward: {
        model: CommissionIncome,
        field: "income",
        match: { type: "Rank Reward" }, // Aviation Rank Rewards (Flight Officer to Supreme Air Marshal)
      },
      referral: {
        model: CommissionIncome,
        field: "income",
        match: { type: "Referral Income" }, // Sponsor Income (5% instant)
      },
      transaction: {
        model: TransactionModel,
        field: "investment",
        match: { type: "Deposit", status: "Completed" }, // User's total investment
      },
      withdraw: {
        model: TransactionModel,
        field: "investment",
        match: { type: "Withdrawal", status: "Completed" }, // Total withdrawals
      },
    };
    
    const results = {};
    let totalIncome = 0;
    let todayIncome = 0;

    const promises = [];

    for (const key in incomeSources) {
      const { model, field, match = {} } = incomeSources[key];
      const baseMatch = { user: objectUserId, ...match };
      // // console.log(`Query for ${key}:`, JSON.stringify(baseMatch));

      // Total income per source
      promises.push(
        model.aggregate([
          { $match: baseMatch },
          { $group: { _id: null, total: { $sum: `$${field}` } } },
        ])
      );
      // Today's income per source
      promises.push(
        model.aggregate([
          {
            $match: {
              ...baseMatch,
              createdAt: { $gte: todayStart, $lte: todayEnd },
            },
          },
          { $group: { _id: null, total: { $sum: `$${field}` } } },
        ])
      );
    }

    const allResults = await Promise.all(promises);
    // // console.log('Aggregation results:', JSON.stringify(allResults, null, 2));

    Object.keys(incomeSources).forEach((key, i) => {
      const total = allResults[i * 2]?.[0]?.total || 0;
      const today = allResults[i * 2 + 1]?.[0]?.total || 0;

      results[`total${capitalize(key)}`] = total;
      results[`today${capitalize(key)}`] = today;

      // Calculate total income (excluding transaction and withdraw)
      if (["trading", "level", "globalAchiever", "rankReward", "referral"].includes(key)) {
        totalIncome += total;
        todayIncome += today;
      }
    });

    // Get downline users for team business calculation
    const { downlineUserIds } = await getDownlineArray({
      userId,
      listShow: false,
    });
    
    // Total team business (for rank qualification)
    const totalTeamInvestment = await TransactionModel.aggregate([
      {
        $match: {
          user: { $in: downlineUserIds },
          type: "Deposit",
          status: "Completed",
        },
      },
      { $group: { _id: null, total: { $sum: "$investment" } } },
    ]);
    const totalTeamTransaction = totalTeamInvestment?.[0]?.total || 0;

    // Today's team business
    const todayTeamInvestment = await TransactionModel.aggregate([
      {
        $match: {
          user: { $in: downlineUserIds },
          createdAt: { $gte: todayStart, $lte: todayEnd },
          type: "Deposit",
          status: "Completed",
        },
      },
      { $group: { _id: null, total: { $sum: "$investment" } } },
    ]);
    const todayTeamTransaction = todayTeamInvestment?.[0]?.total || 0;
    
    return res.status(200).json({
      success: true,
      message: "Get User Income Summary - Avifx.global",
      data: {
        // User's Investment (from user model)
        userInvestment, // Direct from user.investment field
        
        // Investment & Withdrawals (from transactions)
        totalInvestment: results.totalTransaction || 0, // Total from completed deposits
        totalTransaction: results.totalTransaction || 0, // Total from completed deposits
        todayTransaction: results.todayTransaction || 0,
        totalWithdraw: results.totalWithdraw || 0,
        todayWithdraw: results.todayWithdraw || 0,
        
        // Trade ROI (4-7% monthly, 200% cap)
        totalTrading: results.totalTrading || 0,
        todayTrading: results.todayTrading || 0,
        
        // Sponsor Income (5% instant)
        totalReferral: results.totalReferral || 0,
        todayReferral: results.todayReferral || 0,
        
        // Level Income (27% distribution, 300% cap)
        totalLevel: results.totalLevel || 0,
        todayLevel: results.todayLevel || 0,
        
        // Rank Rewards (Aviation ranks - Flight Officer to Supreme Air Marshal)
        totalRankReward: results.totalRankReward || 0,
        todayRankReward: results.todayRankReward || 0,
        
        // Royalty Club Income (2-6% monthly pool)
        totalGlobalAchiever: results.totalGlobalAchiever || 0,
        todayGlobalAchiever: results.todayGlobalAchiever || 0,
        
        // Total Income (all sources combined)
        totalIncome,
        todayIncome,
        
        // Team Statistics
        partners, // Direct referrals
        partnerActive,
        partnerInactive,
        totalDownlineUsers: downlineUserIds.length - 1,
        
        // Team Business (for rank qualification)
        totalTeamTransaction,
        todayTeamTransaction,
      },
    });
  } catch (error) {
    logger.error('Get income summary failed', { userId: req.user?._id, error: error.message });
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.getRecentTransactions = async (req, res) => {
  try {
    const { _id: userId } = req.user;
    const transactions = await TransactionModel.find({ user: userId, type: "Deposit" })
      .sort({ createdAt: -1 })
      .limit(10);
    return res.status(200).json({
      success: true,
      data: transactions,
    });
  } catch (err) {
    logger.error('Get recent transactions failed', { userId: req.user?._id, error: err.message });
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.getTodaysTradingProfit = async (req, res) => {
  try {
    const userId = req.user._id;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const records = await CommissionIncome.find({
      user: userId,
      type: "Trading Profit Income",
      createdAt: { $gte: today }
    }).sort({ createdAt: -1 });

    const total = records.reduce((sum, r) => sum + r.income, 0);

    return res.json({
      success: true,
      message: "Today's Trading Profit",
      today: today,
      totalTodayIncome: total,
      entries: records
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

exports.getIncomeHistory = async (req, res) => {
  try {
    const { _id: userId } = req.user;
    const transactions = await CommissionIncome.find({ user: userId })
      .populate("fromUser", "username email account")
      .populate("package", "title")
      .populate("reward", "title")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Map 'amount' to 'investment' for frontend compatibility
    const formattedData = transactions.map(item => ({
      ...item,
      investment: item.amount || item.investment || 0
    }));

    return res.status(200).json({
      success: true,
      data: formattedData,
    });
  } catch (err) {
    console.error("❌ API Error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

exports.GlobalAchieverLeaderBoard = async (req, res) => {
  try {
    const user = await UserModel.findById(req.user._id, {
      _id: 1,
      investment: 1,
    });
    const rewards = await RewardModel.find(
      { status: true, type: "Global Archive Reward" },
      { reward: 0, picture: 0, updatedAt: 0 }
    );
    const { powerLagBusiness, weakerLagBusiness } =
      await getDirectPartnersDownlines({ userId: user._id });
    // const { left, right } = await getDownlineArray({ userId: user._id });
    // const leftTotal = left.reduce((total, partner) => total + Number(partner.investment || 0), 0);
    // const rightTotal = right.reduce((total, partner) => total + Number(partner.investment || 0), 0);
    const leftTotal = powerLagBusiness;
    const rightTotal = weakerLagBusiness;

    // // console.log({ leftTotal, rightTotal })
    const maxSideBussiness = Math.min(leftTotal, rightTotal);
    const minSideBussiness = Math.max(leftTotal, rightTotal);
    // const isValid4060 = maxSideBussiness * 1.5 >= minSideBussiness;
    const totalBussiness = Number(maxSideBussiness + minSideBussiness);
    let filterReward = [];
    for (const reward of rewards) {
      const rewardAchieve = await CommissionIncome.findOne({
        type: "Global Archive Reward",
        reward: reward._id,
        user: user._id,
      });
      const isAchieved =
        reward.users.includes(user._id) && totalBussiness >= reward.investment;
      filterReward.push({
        ...reward._doc,
        totalBussiness,
        leftSideBussiness: leftTotal,
        rightSideBussiness: rightTotal,
        users: null,
        createdAt: rewardAchieve?.createdAt || null,
        status: isAchieved ? "Achieved" : "Waiting",
      });
    }
    res.json({
      success: true,
      message: "Global achiever leaderboard fetched successfully",
      data: filterReward,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.RankRewardLeaderBoard = async (req, res) => {
  try {
    const user = await UserModel.findById(req.user._id, {
      _id: 1,
      investment: 1,
    });
    const rewards = await RewardModel.find(
      { status: true, type: "Rank Reward" },
      { percentage: 0, picture: 0, updatedAt: 0 }
    );
    // const { downlineUserIds } = await getDownlineArray({ userId: user._id });

    // // Calculate total downline sales
    // const [totalBussinessInvestment] = await TransactionModel.aggregate([
    //     { $match: { user: { $in: downlineUserIds }, type: "Deposit", status: "Completed" } },
    //     { $group: { _id: null, total: { $sum: "$investment" } } }
    // ]);
    // const totalBussiness = totalBussinessInvestment?.total || 0;

    const { powerLagBusiness, weakerLagBusiness } =
      await getDirectPartnersDownlines({ userId: user._id });
    const leftTotal = powerLagBusiness;
    const rightTotal = weakerLagBusiness;
    const totalBussiness = Math.min(leftTotal, rightTotal);

    let filterReward = [];
    for (const reward of rewards) {
      const rewardAchieve = await CommissionIncome.findOne({
        type: "Rank Reward",
        reward: reward._id,
        user: user._id,
      }).sort({ investment: 1 });
      const isAchieved =
        reward.users.includes(user._id) && totalBussiness >= reward.investment;
      filterReward.push({
        ...reward._doc,
        users: null,
        totalBussiness,
        powerLagBusiness,
        weakerLagBusiness,
        payType: rewardAchieve?.rewardPaid
          ? rewardAchieve?.rewardPaid == "Pending"
            ? rewardAchieve?.rewardPaid
            : rewardAchieve?.rewardPaid == "Processing"
            ? rewardAchieve?.rewardPaid
            : "Completed"
          : "Not Applied",
        createdAt: rewardAchieve?.createdAt || null,
        status: isAchieved ? "Achieved" : "Waiting",
      });
    }
    filterReward.sort((a, b) => a.investment - b.investment);
    res.json({
      success: true,
      message: "Rank leaderboard fetched successfully",
      data: filterReward,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getDownlineTree = async (req, res) => {
  try {
    const { downline } = await getDownlineArray({
      userId: req.user._id,
      listShow: true,
    });
    return res
      .status(200)
      .json({ success: true, message: "Get Downline", data: downline });
  } catch (error) {
    logger.error('Get downline tree failed', { userId: req.user?._id, error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
};

const COMPANY_WALLET = process.env.WALLET_ADDRESS;

logger.info('Company Wallet Address configured', { address: COMPANY_WALLET });

// ✅ Blockchain provider (Infura/Alchemy RPC URL)
const provider = new ethers.JsonRpcProvider(process.env.BSC_RPC);
exports.PackageInvestment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user._id;
    const { amount, txHash, network } = req.body;

    logger.info('Deposit initiated', { userId, amount, txHash, network });

    if (!amount || amount <= 0)
      return res.status(400).json({ success: false, message: "Invalid amount" });

    const amountNumber = Number(amount);
    if (amountNumber < 11)
      return res.status(400).json({ success: false, message: "Minimum deposit amount is $11." });

    if (!txHash || !network)
      return res.status(400).json({ success: false, message: "Transaction hash and network are required." });

    // Check duplicate txHash
    const existing = await TransactionModel.findOne({ hash: txHash });
    if (existing)
      return res.status(400).json({ success: false, message: "This transaction hash has already been used." });

    const user = await UserModel.findById(userId).session(session);
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    // Update user investment
    user.investment = (user.investment || 0) + amountNumber;
    user.active.isActive = true;
    user.active.isCapitalLocked = true;
    await user.save({ session });

    // Save transaction with txHash
    await TransactionModel.create(
      [{
        user: user._id,
        investment: amountNumber,
        type: "Deposit",
        status: "Completed",
        role: "USER",
        hash: txHash,
        clientAddress: network,
      }],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    // Distribute Sponsor Income
    try {
      const { distributeSponsorIncome } = require('./roi.controller');
      await distributeSponsorIncome(user._id, amountNumber);
    } catch (e) {
      logger.error('Sponsor income failed', { userId, error: e.message });
    }

    logger.info('Deposit successful', { userId, amount, txHash, network, newInvestment: user.investment });

    return res.status(200).json({
      success: true,
      message: "Deposit successful! Your mining plan has been activated.",
      data: { investment: user.investment },
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    logger.error('Deposit failed', { userId: req.user?._id, error: err.message });
    return res.status(500).json({ success: false, message: "Internal Server Error", error: err.message });
  }
};

// GET direct partners
exports.getPartners = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await UserModel.findById(userId)
      .populate(
        "partners",
        "id username email account investment active createdAt"
      )
      .lean();

    const partnersCount = user?.partners?.length || 0;

    return res.status(200).json({
      success: true,
      data: {
        partners: user.partners || [],
        totalPartners: partnersCount,
      },
    });
  } catch (err) {
    console.error("❌ getPartners Error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// GET full team (binary tree)
// exports.getMyTeams = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     const user = await UserModel.findById(userId)
//       .populate('leftChild rightChild', 'id username email account investment active createdAt')
//       .lean();

//     // Optionally, you can include leftChild & rightChild in an array as teamUsers
//     const teamUsers = [];
//     if (user.leftChild) teamUsers.push(user.leftChild);
//     if (user.rightChild) teamUsers.push(user.rightChild);

//     return res.status(200).json({
//       success: true,
//       data: {
//         teamUsers,
//         totalTeamUsers: teamUsers.length
//       }
//     });
//   } catch (err) {
//     console.error("❌ getMyTeams Error:", err.message);
//     return res.status(500).json({
//       success: false,
//       message: "Server error"
//     });
//   }
// };

exports.getMyTeams = async (req, res) => {
  try {
    const userId = req.user._id;

    // Use the existing getDownlineArray utility function to get all downlines
    const downlineData = await getDownlineArray({ 
      userId: userId, 
      listShow: true, 
      maxLength: Infinity 
    });

    // Format the downline data for response
    const formattedDownlines = downlineData.downline.map(user => ({
      _id: user._id,
      id: user.id,
      username: user.username,
      walletAddress: user.account || null, // account is a string (wallet address)
      investment: user.investment || 0,
      position: user.position || null,
      active: user.active,
      referralLink: user.referralLink || null,
      createdAt: user.createdAt,
      level: user.level || 0
    }));

    return res.status(200).json({
      success: true,
      message: "Team downlines fetched successfully",
      data: {
        totalTeamUsers: downlineData.total,
        totalActive: downlineData.totalActive,
        totalInactive: downlineData.totalInactive,
        leftTeam: downlineData.left.length,
        rightTeam: downlineData.right.length,
        downlines: formattedDownlines
      }
    });
  } catch (err) {
    console.error("❌ getMyTeams Error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
};

exports.getTransaction = async (req, res) => {
  try {
    const userId = req.user._id;

    const transactions = await TransactionModel.find({ user: userId })
      .populate("user", "name email") // populate user name & email
      .populate("package", "name price") // populate package name & price
      .sort({ createdAt: -1 }); // latest first

    res.status(200).json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    console.error("❌ Error in getTransaction:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch transactions",
      error: error.message,
    });
  }
};

// Get All Team Transactions (User + All Downlines)
exports.getAllTransactions = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get all downline user IDs (includes user's own ID)
    const { downlineUserIds } = await getDownlineArray({
      userId,
      listShow: false,
    });

    if (!downlineUserIds || downlineUserIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Team transactions retrieved successfully.",
        data: {
          transactions: [],
          summary: {
            totalTransactions: 0,
            totalDeposits: 0,
            totalWithdrawals: 0,
            totalAmount: 0,
            teamMembers: 0,
          },
        },
      });
    }

    // Get all transactions for team (user + all downlines)
    const transactions = await TransactionModel.find({
      user: { $in: downlineUserIds },
    })
      .populate({
        path: "user",
        select: "id username email account investment active",
      })
      .populate({
        path: "package",
        select: "title minAmount maxAmount percentage",
      })
      .sort({ createdAt: -1 });

    // Calculate summary
    const totalTransactions = transactions.length;
    const deposits = transactions.filter((t) => t.type === "Deposit");
    const withdrawals = transactions.filter((t) => t.type === "Withdrawal");

    const totalDeposits = deposits.reduce(
      (sum, t) => sum + (t.investment || 0),
      0
    );
    const totalWithdrawals = withdrawals.reduce(
      (sum, t) => sum + (t.investment || 0),
      0
    );
    const totalAmount = totalDeposits - totalWithdrawals;

    // Group by user
    const transactionsByUser = {};
    transactions.forEach((txn) => {
      const userId = txn.user?._id?.toString() || "unknown";
      if (!transactionsByUser[userId]) {
        transactionsByUser[userId] = {
          user: txn.user,
          transactions: [],
          totalDeposits: 0,
          totalWithdrawals: 0,
          transactionCount: 0,
        };
      }
      transactionsByUser[userId].transactions.push(txn);
      transactionsByUser[userId].transactionCount++;
      if (txn.type === "Deposit") {
        transactionsByUser[userId].totalDeposits += txn.investment || 0;
      } else if (txn.type === "Withdrawal") {
        transactionsByUser[userId].totalWithdrawals += txn.investment || 0;
      }
    });

    // Today's transactions
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayTransactions = transactions.filter(
      (txn) => new Date(txn.createdAt) >= startOfToday
    );
    const todayDeposits = todayTransactions
      .filter((t) => t.type === "Deposit")
      .reduce((sum, t) => sum + (t.investment || 0), 0);
    const todayWithdrawals = todayTransactions
      .filter((t) => t.type === "Withdrawal")
      .reduce((sum, t) => sum + (t.investment || 0), 0);

    res.status(200).json({
      success: true,
      message: "Team transactions retrieved successfully.",
      data: {
        transactions: transactions,
        transactionsByUser: Object.values(transactionsByUser),
        summary: {
          totalTransactions: totalTransactions,
          totalDeposits: totalDeposits,
          totalWithdrawals: totalWithdrawals,
          totalAmount: totalAmount,
          teamMembers: downlineUserIds.length,
          todayTransactions: todayTransactions.length,
          todayDeposits: todayDeposits,
          todayWithdrawals: todayWithdrawals,
          depositsCount: deposits.length,
          withdrawalsCount: withdrawals.length,
        },
      },
    });
  } catch (error) {
    console.error("❌ Error in getAllTransactions:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch team transactions",
      error: error.message,
    });
  }
};

exports.getTransactionOf7days = async (req, res) => {
  try {
    const userId = req.user._id; // authenticated user

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // include today + last 6 days
    sevenDaysAgo.setHours(0, 0, 0, 0); // start of the day

    // Aggregation pipeline
    const transactions = await TransactionModel.aggregate([
      {
        $match: {
          user: userId,
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } }, // sort by date ascending
    ]);

    // Fill missing days with count 0
    const result = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const found = transactions.find((t) => t._id === dateStr);
      result.unshift({ date: dateStr, count: found ? found.count : 0 });
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("❌ Error in getTransactionOf7days:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch transaction counts",
      error: error.message,
    });
  }
};

exports.calculateUserROI = async (req, res) => {
  try {
    const userId = req.user._id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID required",
      });
    }

    const result = await calculateDailyROIForUser(userId);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Mining successful! You earned $${Number(result.amount).toFixed(4)} today.`,
      data: result,
    });
  } catch (err) {
    console.error("❌ API Error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.getROIHistory = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID required",
      });
    }

    const roiHistory = await ROIHistory.find({ user: userId });

    return res.status(200).json({
      success: true,
      data: roiHistory,
    });
  } catch (err) {
    console.error("❌ API Error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.getGenerationROIHistory = async (req, res) => {
  try {
    // Optionally, you can filter by userId from auth
    const userId = req.user._id; // authenticated user
    // Example: fetch all records where user is either fromUser or toUser
    const query = {
      $or: [{ fromUser: userId }, { toUser: userId }],
    };

    const history = await GenerationROIHistory.find(query)
      .populate("fromUser", "name email") // populate fromUser's basic info
      .populate("toUser", "name email") // populate toUser's basic info
      .sort({ createdAt: -1 }); // latest first

    res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error("❌ Error in getGenerationHistory:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch generation history",
      error: error.message,
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { username, mobile, telegram, email } = req.body;
    const userId = req.user._id;

    const user = await UserModel.findByIdAndUpdate(
      userId,
      { 
        ...(username && { username }),
        ...(mobile && { mobile }),
        ...(telegram && { telegram }),
        ...(email && { email }),
      },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: user,
    });
  } catch (error) {
    console.error("❌ Error in updateProfile:", error.message);
    res.status(500).json({ success: false, message: "Failed to update profile", error: error.message });
  }
};

exports.getUserByUsername = async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res
      .status(400)
      .json({ success: false, message: "Username is required" });
  }

  try {
    const user = await UserModel.findOne({ username }).select(
      "name username account"
    ); // sirf name aur username fetch kare

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      data: {
        name: user.name,
        username: user.username,
        account: user.account,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching user by username:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getUserDashboardStats = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId)
      return res
        .status(400)
        .json({ success: false, message: "User not found" });

    const objectUserId = new mongoose.Types.ObjectId(userId); // ✅ Use once and reuse

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // --- User info
    const user = await UserModel.findById(userId)
      .select("username email mobile investment totalTeam active")
      .populate("sponsor", "username email")
      .populate("partners", "username email");

    // --- Commission incomes (all types)
    const incomes = await CommissionIncome.aggregate([
      {
        $match: {
          userId: objectUserId,
        },
      },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$income" },
          todayTotal: {
            $sum: {
              $cond: [{ $gte: ["$createdAt", startOfDay] }, "$income", 0],
            },
          },
        },
      },
    ]);

    const incomeMap = {};
    incomes.forEach((item) => {
      incomeMap[item._id] = {
        total: item.total || 0,
        today: item.todayTotal || 0,
      };
    });

    // --- Withdrawals
    const withdrawals = await TransactionModel.aggregate([
      {
        $match: {
          user: objectUserId,
          type: "Withdrawal",
          status: "Completed",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$investment" },
          todayTotal: {
            $sum: {
              $cond: [{ $gte: ["$createdAt", startOfDay] }, "$investment", 0],
            },
          },
        },
      },
    ]);

    const withdrawalTotal = withdrawals[0]?.total || 0;
    const withdrawalToday = withdrawals[0]?.todayTotal || 0;

    // --- Deposits
    const deposits = await TransactionModel.aggregate([
      {
        $match: {
          user: objectUserId,
          type: "Deposit",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$investment" },
          todayTotal: {
            $sum: {
              $cond: [{ $gte: ["$createdAt", startOfDay] }, "$investment", 0],
            },
          },
        },
      },
    ]);

    const depositTotal = deposits[0]?.total || 0;
    const depositToday = deposits[0]?.todayTotal || 0;

    // --- Rewards / Achievements
    const todayGlobalAchiever = await RewardModel.countDocuments({
      userId: objectUserId,
      createdAt: { $gte: startOfDay },
    });

    const totalGlobalAchiever = await RewardModel.countDocuments({
      userId: objectUserId,
    });

    // --- Response
    return res.status(200).json({
      success: true,
      message: "User dashboard stats fetched successfully",
      user: {
        username: user.username,
        email: user.email,
        mobile: user.mobile,
        investment: user.investment,
        totalTeam: user.totalTeam,
        active: user.active,
      },
      incomes: {
        total: Object.values(incomeMap).reduce((a, b) => a + b.total, 0),
        today: Object.values(incomeMap).reduce((a, b) => a + b.today, 0),
        referral: incomeMap["Referral Income"] || { total: 0, today: 0 },
        level: incomeMap["Level Income"] || { total: 0, today: 0 },
        matching: incomeMap["Matching Income"] || { total: 0, today: 0 },
      },
      withdrawals: {
        total: withdrawalTotal,
        today: withdrawalToday,
      },
      deposits: {
        total: depositTotal,
        today: depositToday,
      },
      globalAchievements: {
        total: totalGlobalAchiever,
        today: todayGlobalAchiever,
      },
    });
  } catch (err) {
    console.error("❌ User dashboard stats error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

/**
 * Get Team Division (Team A, B, C) for logged in user
 * Team A = Direct referral with highest business (investment)
 * Team B = Direct referral with second highest business
 * Team C = All other direct referrals
 */
exports.getMyTeamDivision = async (req, res) => {
  try {
    const userId = req.user._id;

    // Calculate fresh team division
    const teamData = await calculateTeamDivision(userId);

    // Save/update the division in database
    await saveTeamDivision(userId, teamData);

    // Get last shuffled info
    const divisionRecord = await TeamDivisionModel.findOne({ user: userId });

    // Format response
    const formatMember = (member) => ({
      _id: member._id,
      id: member.id,
      username: member.username,
      email: member.email,
      walletAddress: member.account || null,
      investment: member.investment || 0,
      active: member.active,
      createdAt: member.createdAt,
      level: member.level || 0
    });

    return res.status(200).json({
      success: true,
      message: "Team division fetched successfully",
      data: {
        teamA: {
          directReferral: teamData.teamA.directReferral ? formatMember(teamData.teamA.directReferral) : null,
          members: teamData.teamA.members.map(formatMember),
          totalMembers: teamData.teamA.members.length,
          totalBusiness: teamData.teamA.totalBusiness
        },
        teamB: {
          directReferral: teamData.teamB.directReferral ? formatMember(teamData.teamB.directReferral) : null,
          members: teamData.teamB.members.map(formatMember),
          totalMembers: teamData.teamB.members.length,
          totalBusiness: teamData.teamB.totalBusiness
        },
        teamC: {
          directReferrals: teamData.teamC.directReferrals?.map(formatMember) || [],
          members: teamData.teamC.members.map(formatMember),
          totalMembers: teamData.teamC.members.length,
          totalBusiness: teamData.teamC.totalBusiness
        },
        summary: {
          totalDirectReferrals: teamData.totalDirectReferrals || 0,
          totalTeamMembers: teamData.totalTeamMembers || 0,
          lastShuffledAt: divisionRecord?.lastShuffledAt || null
        }
      }
    });
  } catch (error) {
    console.error("❌ getMyTeamDivision Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch team division",
      error: error.message
    });
  }
};

/**
 * Get all team members with level information
 */
exports.getAllTeamMembers = async (req, res) => {
  try {
    const userId = req.user._id;

    // Use existing getDownlineArray utility
    const downlineData = await getDownlineArray({ 
      userId: userId, 
      listShow: true, 
      maxLength: Infinity 
    });

    // Get level for each member based on depth from root
    const membersWithLevel = [];
    const levelMap = {};

    // Get direct partners first (Level 1)
    const directPartners = await UserModel.find(
      { sponsor: userId },
      { _id: 1, id: 1, username: 1, account: 1, email: 1, investment: 1, active: 1, createdAt: 1 }
    ).lean();

    directPartners.forEach(p => {
      levelMap[p._id.toString()] = 1;
    });

    // Build level map recursively
    const buildLevelMap = async (parentIds, level) => {
      if (parentIds.length === 0 || level > 30) return;
      
      const children = await UserModel.find(
        { sponsor: { $in: parentIds } },
        { _id: 1 }
      ).lean();
      
      children.forEach(c => {
        levelMap[c._id.toString()] = level;
      });

      await buildLevelMap(children.map(c => c._id), level + 1);
    };

    await buildLevelMap(directPartners.map(p => p._id), 2);

    // Format downline with levels
    const formattedDownlines = downlineData.downline.map(user => ({
      _id: user._id,
      id: user.id,
      username: user.username,
      email: user.email || null,
      walletAddress: user.account || null,
      investment: user.investment || 0,
      position: user.position || null,
      active: user.active,
      referralLink: user.referralLink || null,
      createdAt: user.createdAt,
      level: levelMap[user._id.toString()] || (user.level ? user.level + 1 : 0)
    }));

    return res.status(200).json({
      success: true,
      message: "All team members fetched successfully",
      data: {
        totalTeamUsers: downlineData.total,
        totalActive: downlineData.totalActive,
        totalInactive: downlineData.totalInactive,
        members: formattedDownlines
      }
    });
  } catch (err) {
    console.error("❌ getAllTeamMembers Error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
};

/**
 * Get user's available income balance for reinvestment
 */
exports.getAvailableIncomeBalance = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await UserModel.findById(userId).populate("incomeDetails");
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    let incomeDetails = user.incomeDetails;
    if (!incomeDetails) {
      incomeDetails = await IncomeModel.create({ user: userId });
      user.incomeDetails = incomeDetails._id;
      await user.save();
    }

    // Get reinvestment history
    const reinvestmentHistory = await TransactionModel.find({
      user: userId,
      type: "Reinvestment"
    }).sort({ createdAt: -1 }).limit(10);

    const totalReinvested = await TransactionModel.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId), type: "Reinvestment", status: "Completed" } },
      { $group: { _id: null, total: { $sum: "$investment" } } }
    ]);

    return res.status(200).json({
      success: true,
      message: "Available income balance fetched",
      data: {
        currentIncome: incomeDetails.income?.currentIncome || 0,
        totalIncome: incomeDetails.income?.totalIncome || 0,
        currentInvestment: user.investment || 0,
        totalReinvested: totalReinvested[0]?.total || 0,
        recentReinvestments: reinvestmentHistory
      }
    });
  } catch (error) {
    console.error("❌ getAvailableIncomeBalance Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch income balance",
      error: error.message
    });
  }
};

/**
 * Reinvest from income balance
 * Allows users to reinvest their earned income (ROI, level income, etc.) back into investment
 */
exports.reinvestFromIncome = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user._id;
    const { amount } = req.body;

    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid reinvestment amount"
      });
    }

    const reinvestAmount = Number(amount);

    // Minimum reinvestment validation
    if (reinvestAmount < 10) {
      return res.status(400).json({
        success: false,
        message: "Minimum reinvestment amount is $10"
      });
    }

    // Get user with income details
    const user = await UserModel.findById(userId).populate("incomeDetails").session(session);
    
    if (!user) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Check if user has income details
    let incomeDetails = user.incomeDetails;
    if (!incomeDetails) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "No income balance available"
      });
    }

    // Reload income details within session
    incomeDetails = await IncomeModel.findById(incomeDetails._id).session(session);

    const availableBalance = incomeDetails.income?.currentIncome || 0;

    // Check if user has sufficient balance
    if (availableBalance < reinvestAmount) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Available: $${availableBalance.toFixed(2)}, Requested: $${reinvestAmount.toFixed(2)}`
      });
    }

    // Deduct from current income
    incomeDetails.income.currentIncome -= reinvestAmount;
    await incomeDetails.save({ session });

    // Add to user's investment
    const previousInvestment = user.investment || 0;
    user.investment = previousInvestment + reinvestAmount;
    // Lock capital when reinvestment is made
    user.active.isCapitalLocked = true;
    await user.save({ session });

    // Generate transaction ID
    const { generateCustomId } = require("../utils/generator.uniqueid");
    const transactionId = generateCustomId({ prefix: 'BSG-REINV', max: 14, min: 14 });

    // Create transaction record
    await TransactionModel.create(
      [{
        id: transactionId,
        user: userId,
        investment: reinvestAmount,
        type: "Reinvestment",
        status: "Completed",
        role: "USER",
        clientAddress: user.account || null,
        mainAddress: null,
        hash: null
      }],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: `Successfully reinvested $${reinvestAmount.toFixed(2)} from your income`,
      data: {
        reinvestedAmount: reinvestAmount,
        previousInvestment: previousInvestment,
        newInvestment: user.investment,
        remainingBalance: incomeDetails.income.currentIncome,
        transactionId: transactionId
      }
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("❌ reinvestFromIncome Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to process reinvestment",
      error: error.message
    });
  }
};

/**
 * Get reinvestment history
 */
exports.getReinvestmentHistory = async (req, res) => {
  try {
    const userId = req.user._id;

    const history = await TransactionModel.find({
      user: userId,
      type: "Reinvestment"
    }).sort({ createdAt: -1 });

    const totalReinvested = history.reduce((sum, tx) => sum + (tx.investment || 0), 0);

    // Today's reinvestment
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayReinvestments = history.filter(tx => new Date(tx.createdAt) >= startOfToday);
    const todayTotal = todayReinvestments.reduce((sum, tx) => sum + (tx.investment || 0), 0);

    return res.status(200).json({
      success: true,
      message: "Reinvestment history fetched",
      data: {
        history,
        summary: {
          totalReinvested,
          todayTotal,
          totalTransactions: history.length,
          todayTransactions: todayReinvestments.length
        }
      }
    });
  } catch (error) {
    console.error("❌ getReinvestmentHistory Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch reinvestment history",
      error: error.message
    });
  }
};


// Add this function
exports.verifyReferralCode = async (req, res) => {
  try {
    const { referralCode } = req.params;
    
    if (!referralCode) {
      return res.status(400).json({
        success: false,
        message: "Referral code is required"
      });
    }

    // Find user by id or username
    const user = await UserModel.findOne({referralLink: referralCode}).select('username id');

    // // console.log("Searched for referral code:", user)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Invalid referral code"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Referral code verified",
      data: {
        username: user.username,
        id: user.id
      }
    });
  } catch (error) {
    console.error("Verify referral error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

exports.getReferralProgram = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await UserModel.findById(userId).select('referralLink');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const { downlineUserIds } = await getDownlineArray({ userId, listShow: false });

    const levelMap = {};
    const buildLevels = async (parentIds, level) => {
      if (!parentIds.length || level > 10) return;
      const children = await UserModel.find(
        { sponsor: { $in: parentIds } },
        { _id: 1, id: 1, username: 1, investment: 1, active: 1, createdAt: 1 }
      ).lean();
      children.forEach(c => { levelMap[c._id.toString()] = { ...c, level }; });
      await buildLevels(children.map(c => c._id), level + 1);
    };

    const directPartners = await UserModel.find(
      { sponsor: userId },
      { _id: 1, id: 1, username: 1, investment: 1, active: 1, createdAt: 1 }
    ).lean();
    directPartners.forEach(p => { levelMap[p._id.toString()] = { ...p, level: 1 }; });
    await buildLevels(directPartners.map(p => p._id), 2);

    const levelGroups = {};
    Object.values(levelMap).forEach(member => {
      const lvl = member.level;
      if (!levelGroups[lvl]) levelGroups[lvl] = [];
      levelGroups[lvl].push({
        id: member.id,
        username: member.username,
        investment: member.investment || 0,
        isActive: member.active?.isActive || false,
        joinedAt: member.createdAt,
      });
    });

    const levels = Object.keys(levelGroups).sort((a, b) => a - b).map(lvl => ({
      level: Number(lvl),
      totalUsers: levelGroups[lvl].length,
      activeUsers: levelGroups[lvl].filter(u => u.isActive).length,
      users: levelGroups[lvl],
    }));

    const totalBusiness = await TransactionModel.aggregate([
      { $match: { user: { $in: downlineUserIds }, type: 'Deposit', status: 'Completed' } },
      { $group: { _id: null, total: { $sum: '$investment' } } }
    ]);

    const totalReferralEarning = await CommissionIncome.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId), type: 'Referral Income' } },
      { $group: { _id: null, total: { $sum: '$income' } } }
    ]);

    return res.status(200).json({
      success: true,
      data: {
        referralLink: user.referralLink,
        totalTeam: Object.values(levelMap).length,
        totalBusiness: totalBusiness[0]?.total || 0,
        totalReferralEarning: totalReferralEarning[0]?.total || 0,
        levels,
      }
    });
  } catch (error) {
    console.error('getReferralProgram error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getDepositWallets = async (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      TRC20: process.env.TRC20_WALLET || "TYourTRC20WalletAddressHere",
      BEP20: process.env.BEP20_WALLET || process.env.WALLET_ADDRESS,
    }
  });
};
