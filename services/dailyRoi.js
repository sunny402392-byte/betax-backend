const { distributeGenerationROI } = require("../controllers/roi.controller");
const { IncomeModel } = require("../models/income.model");
const { CommissionIncome } = require("../models/commission.model");
const roiHistory = require("../models/roiHistory");
const { UserModel } = require("../models/user.model");
const { generateCustomId } = require("../utils/generator.uniqueid");
const { levelIncomeCalculate } = require("../utils/levelIncome.calculation");
const logger = require("../utils/logger");
const { getUserPlan } = require("../utils/miningPlans");

// Monthly ROI calculation (runs on 1st of every month)
exports.calculateMonthlyROIForUsers = async () => {
  try {
    logger.info('🚀 Starting Monthly ROI Calculation...');

    const users = await UserModel.find().populate("incomeDetails");

    if (!users || users.length === 0) {
      logger.info('⚠️ No users found in database.');
      return;
    }

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const startOfCurrentMonth = new Date(currentYear, currentMonth, 1);

    for (let user of users) {
      const monthlyROI = await CommissionIncome.findOne({
        user: user._id,
        type: "Trading Profit Income",
        status: "Completed",
        createdAt: { $gte: startOfCurrentMonth }
      });

      if (monthlyROI) {
        logger.info('ROI already received this month', { username: user.username });
        continue;
      }

      if (user.investment < 100) {
        logger.info('Minimum investment not met', { username: user.username });
        continue;
      }

      let income = user.incomeDetails;
      if (!income) {
        income = await IncomeModel.create({ user: user._id });
        user.incomeDetails = income._id;
        await user.save();
      }

      const plan = getUserPlan(user.investment);
      if (!plan) continue;
      const dailyRoiPercent = plan.dailyPercent;

      let finalROI = (user.investment * dailyRoiPercent) / 100;

      income.income.roiWallet = (income.income.roiWallet || 0) + finalROI;
      income.income.totalIncome += finalROI;
      await income.save();

      const id = generateCustomId({ prefix: 'BT7-TD', max: 14, min: 14 });
      await CommissionIncome.create({
        id,
        user: user._id,
        income: finalROI,
        percentage: dailyRoiPercent,
        amount: Number(user.investment),
        type: "Trading Profit Income",
        status: "Completed"
      });

      // ✅ Distribute level income on ROI amount (not investment)
      await levelIncomeCalculate({ userId: user._id, amount: finalROI });
      // ❌ Generation ROI disabled (not in project doc)
      // await distributeGenerationROI(user._id, finalROI);

      logger.info('Monthly ROI distributed', { 
        username: user.username, 
        roi: finalROI.toFixed(2), 
        percentage: dailyRoiPercent.toFixed(2) 
      });
    }

    logger.info('🎉 Monthly ROI calculation completed!');
  } catch (err) {
    logger.error('❌ Monthly ROI calculation error', { error: err.message });
  }
};

// Daily ROI (for backward compatibility - currently disabled)
exports.calculateDailyROIForUsers = async () => {
  try {
    logger.info('🚀 Starting Daily ROI Calculation...');

    const users = await UserModel.find().populate("incomeDetails");

    if (!users || users.length === 0) {
      logger.info('⚠️ No users found');
      return;
    }

    for (let user of users) {
      if (user.todayRoiCollected) {
        continue;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTradingProfit = await CommissionIncome.findOne({
        user: user._id,
        type: "Trading Profit Income",
        status: "Completed",
        createdAt: { $gte: today }
      });

      if (todayTradingProfit) {
        user.todayRoiCollected = true;
        await user.save();
        continue;
      }

      if (!getUserPlan(user.investment)) continue;

      let income = user.incomeDetails;
      if (!income) {
        income = await IncomeModel.create({ user: user._id });
        user.incomeDetails = income._id;
        await user.save();
      }

      const plan = getUserPlan(user.investment);
      if (!plan) continue;
      const dailyRoiPercent = plan.dailyPercent;

      let finalROI = (user.investment * dailyRoiPercent) / 100;

      income.income.roiWallet = (income.income.roiWallet || 0) + finalROI;
      income.income.totalIncome += finalROI;
      await income.save();

      const id = generateCustomId({ prefix: 'BT7-TD', max: 14, min: 14 });
      await CommissionIncome.create({
        id,
        user: user._id,
        income: finalROI,
        percentage: dailyRoiPercent,
        amount: Number(user.investment),
        type: "Trading Profit Income",
        status: "Completed"
      });

      user.todayRoiCollected = true;
      await user.save();

      // ✅ Distribute level income on ROI amount
      await levelIncomeCalculate({ userId: user._id, amount: finalROI });
      // ❌ Generation ROI disabled
      // await distributeGenerationROI(user._id, finalROI);
    }

    logger.info('🎉 Daily ROI completed');
  } catch (err) {
    logger.error('❌ Daily ROI error', { error: err.message });
  }
};

// Single user ROI (used after deposit)
exports.calculateDailyROIForUser = async (userId) => {
  try {
    const user = await UserModel.findById(userId).populate("incomeDetails");
    
    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Check if already mined today via todayRoiCollected flag
    if (user.todayRoiCollected) {
      return { success: false, error: "ROI already collected today" };
    }

    if (!getUserPlan(user.investment)) {
      return { success: false, error: "Minimum $11 investment required to start mining" };
    }

    // Get or create income details
    let income;
    if (!user.incomeDetails) {
      income = await IncomeModel.create({ user: user._id });
      user.incomeDetails = income._id;
      await user.save();
    } else {
      income = await IncomeModel.findById(user.incomeDetails._id || user.incomeDetails);
      if (!income) {
        income = await IncomeModel.create({ user: user._id });
        user.incomeDetails = income._id;
        await user.save();
      }
    }

    const plan = getUserPlan(user.investment);
    if (!plan) return { success: false, error: "No matching mining plan for investment" };
    const dailyRoiPercent = plan.dailyPercent;

    let finalROI = (user.investment * dailyRoiPercent) / 100;

    income.income.roiWallet = (income.income.roiWallet || 0) + finalROI;
    income.income.totalIncome = (income.income.totalIncome || 0) + finalROI;
    await income.save();

    const id = generateCustomId({ prefix: 'BT7-TD', max: 14, min: 14 });
    await CommissionIncome.create({
      id,
      user: user._id,
      income: finalROI,
      percentage: dailyRoiPercent,
      amount: Number(user.investment),
      type: "Trading Profit Income",
      status: "Completed"
    });

    user.todayRoiCollected = true;
    await user.save();

    await levelIncomeCalculate({ userId: user._id, amount: finalROI });

    // Update withdrawal wallet immediately
    const { CommissionIncome: CI } = require('../models/commission.model');
    const { TransactionModel: TM } = require('../models/transaction.model');
    const incomeAgg = await CI.aggregate([{ $match: { user: user._id } }, { $group: { _id: null, total: { $sum: '$income' } } }]);
    const totalIncome = incomeAgg[0]?.total || 0;
    const withdrawalAgg = await TM.aggregate([{ $match: { user: user._id, type: 'Withdrawal', status: { $in: ['Pending', 'Processing', 'Completed'] } } }, { $group: { _id: null, total: { $sum: '$investment' } } }]);
    const withdrawn = withdrawalAgg[0]?.total || 0;
    user.withdrawalInfo = {
      availableWithdrawalAmount: Math.max(0, totalIncome - withdrawn),
      withdrawnAmount: withdrawn,
      totalWithdrawableAmount: totalIncome,
    };
    user.markModified('withdrawalInfo');
    await user.save();

    logger.info('Mining ROI distributed', { username: user.username, roi: finalROI.toFixed(4), plan: plan.name });
    return { success: true, amount: finalROI, percentage: dailyRoiPercent };
  } catch (err) {
    logger.error('❌ ROI calculation error', { error: err.message, stack: err.stack });
    return { success: false, error: err.message };
  }
};
