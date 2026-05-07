const express = require("express");
const router = express.Router();

const { calculateDailyROIForUsers } = require("../services/dailyRoi");
const { tradingNodeCron } = require("../utils/levelIncome.calculation");
const { UserModel } = require("../models/user.model");
const { calculateWithdrawalStats } = require("../utils/withdrawalHelper");

// Manual ROI Trigger
router.get("/run-daily-roi", async (req, res) => {
  try {
    // console.log("🚀 Manual ROI Trigger Started...");

    await calculateDailyROIForUsers();
    await tradingNodeCron();
    const results = await calculateWithdrawalStats();

    // console.log("🎉 Manual ROI Trigger Finished!");

    res.status(200).json({
      success: true,
      message: "Manual ROI calculation completed.",
      withdrawalStats: results
    });
  } catch (error) {
    // console.log("❌ Error running manual ROI:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Reset ROI Flags
router.post("/reset-roi", async (req, res) => {
  try {
    await UserModel.updateMany({}, { todayRoiCollected: false });
    // console.log("🌙 Reset all users' todayRoiCollected to FALSE");
    res.status(200).json({ success: true, message: "ROI flags reset successfully!" });
  } catch (err) {
    console.error("❌ Error resetting ROI flags:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Reset Withdrawal Stats - Clear all withdrawal info
router.post("/reset-withdrawal-stats", async (req, res) => {
  try {
    // console.log("🔄 Resetting withdrawal stats for all users...");

    const result = await UserModel.updateMany(
      {},
      {
        $set: {
          "withdrawalInfo.totalWithdrawableAmount": 0,
          "withdrawalInfo.availableWithdrawalAmount": 0,
          "withdrawalInfo.withdrawnAmount": 0
        }
      }
    );

    // console.log(`✅ Reset withdrawal stats for ${result.modifiedCount} users`);

    res.status(200).json({
      success: true,
      message: `Withdrawal stats reset successfully for ${result.modifiedCount} users!`,
      modifiedCount: result.modifiedCount
    });
  } catch (err) {
    console.error("❌ Error resetting withdrawal stats:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// COMPLETE RESET - Reset everything (Income, Withdrawals, Transactions, Investment)
router.post("/reset-all-data", async (req, res) => {
  try {
    // console.log("🔄 Starting COMPLETE DATA RESET...");

    const { CommissionIncome } = require("../models/commission.model");
    const { TransactionModel } = require("../models/transaction.model");
    const { IncomeModel } = require("../models/income.model");

    // 1. Delete all Commission Income records
    const deletedCommissions = await CommissionIncome.deleteMany({});
    // console.log(`✅ Deleted ${deletedCommissions.deletedCount} commission income records`);

    // 2. Delete all Withdrawal transactions
    const deletedWithdrawals = await TransactionModel.deleteMany({ type: "Withdrawal" });
    // console.log(`✅ Deleted ${deletedWithdrawals.deletedCount} withdrawal transactions`);

    // 3. Reset all IncomeModel data
    const resetIncome = await IncomeModel.updateMany(
      {},
      {
        $set: {
          "income.currentIncome": 0,
          "income.totalIncome": 0,
          "income.roiWallet": 0,
          "income.levelIncomeWallet": 0,
          "income.depositWallet": 0,
          "referralIncome.income": 0,
          "referralIncome.history": [],
          "levelIncome.income": 0,
          "levelIncome.history": [],
          "matchingIncome.income": 0,
          "matchingIncome.history": [],
          "monthlyIncome.income": 0,
          "monthlyIncome.history": [],
          "globalAchieverIncome.income": 0,
          "globalAchieverIncome.history": [],
          "liveIncome.income": 0,
          "liveIncome.history": [],
          "rankRewardIncome.income": 0,
          "rankRewardIncome.history": [],
          "withdrawal.amount": 0,
          "withdrawal.history": []
        }
      }
    );
    // console.log(`✅ Reset income data for ${resetIncome.modifiedCount} users`);

    // 4. Reset User withdrawal info and investment
    const resetUsers = await UserModel.updateMany(
      {},
      {
        $set: {
          "withdrawalInfo.totalWithdrawableAmount": 0,
          "withdrawalInfo.availableWithdrawalAmount": 0,
          "withdrawalInfo.withdrawnAmount": 0,
          investment: 0,
          todayRoiCollected: false
        }
      }
    );
    // console.log(`✅ Reset user data for ${resetUsers.modifiedCount} users`);

    res.status(200).json({
      success: true,
      message: "Complete data reset successful!",
      details: {
        deletedCommissions: deletedCommissions.deletedCount,
        deletedWithdrawals: deletedWithdrawals.deletedCount,
        resetIncomeRecords: resetIncome.modifiedCount,
        resetUsers: resetUsers.modifiedCount
      }
    });
  } catch (err) {
    console.error("❌ Error in complete reset:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
