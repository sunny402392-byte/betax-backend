// Test User50 API Response (Exact format frontend receives)
require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1", "1.0.0.1"]);

async function testUser50API() {
  try {
    await mongoose.connect(process.env.DATABASE_URL || 'mongodb://localhost:27017/avifx');
    
    const { UserModel } = require('../models/user.model');
    const { TransactionModel } = require('../models/transaction.model');
    const { CommissionIncome } = require('../models/commission.model');
    const { getDownlineArray } = require('../utils/getteams.downline');
    
    // console.log('🧪 Testing User50 API Response...\n');
    
    // Find User50
    const user = await UserModel.findOne({ 
      $or: [
        { id: 'BT73560296' },
        { username: 'User50' },
        { username: 'user50' }
      ]
    });
    
    if (!user) {
      // console.log('❌ User50 not found!');
      return;
    }
    
    // console.log('✅ User50 found:', user.username);
    // console.log('Investment in DB:', user.investment);
    
    const userId = user._id;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    // Simulate getIncomeSummary API
    // console.log('\n📊 Simulating API Response...\n');
    
    const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
    
    const partners = await UserModel.countDocuments({ sponsor: userId });
    const partnerActive = await UserModel.countDocuments({ sponsor: userId, "active.isActive": true });
    const partnerInactive = await UserModel.countDocuments({ sponsor: userId, "active.isActive": false });
    
    const incomeSources = {
      trading: { model: CommissionIncome, field: "income", match: { type: "Trading Profit Income" } },
      level: { model: CommissionIncome, field: "income", match: { type: "Level Income" } },
      globalAchiever: { model: CommissionIncome, field: "income", match: { type: "Global Archive Reward" } },
      rankReward: { model: CommissionIncome, field: "income", match: { type: "Rank Reward" } },
      referral: { model: CommissionIncome, field: "income", match: { type: "Referral Income" } },
      transaction: { model: TransactionModel, field: "investment", match: { type: "Deposit", status: "Completed" } },
      withdraw: { model: TransactionModel, field: "investment", match: { type: "Withdrawal", status: "Completed" } },
    };
    
    const results = {};
    let totalIncome = 0;
    let todayIncome = 0;
    const promises = [];
    
    for (const key in incomeSources) {
      const { model, field, match = {} } = incomeSources[key];
      const baseMatch = { user: userId, ...match };
      
      promises.push(
        model.aggregate([
          { $match: baseMatch },
          { $group: { _id: null, total: { $sum: `$${field}` } } },
        ])
      );
      promises.push(
        model.aggregate([
          { $match: { ...baseMatch, createdAt: { $gte: todayStart, $lte: todayEnd } } },
          { $group: { _id: null, total: { $sum: `$${field}` } } },
        ])
      );
    }
    
    const allResults = await Promise.all(promises);
    
    Object.keys(incomeSources).forEach((key, i) => {
      const total = allResults[i * 2]?.[0]?.total || 0;
      const today = allResults[i * 2 + 1]?.[0]?.total || 0;
      
      results[`total${capitalize(key)}`] = total;
      results[`today${capitalize(key)}`] = today;
      
      if (["trading", "level", "globalAchiever", "rankReward", "referral"].includes(key)) {
        totalIncome += total;
        todayIncome += today;
      }
    });
    
    const { downlineUserIds } = await getDownlineArray({ userId, listShow: false });
    
    const totalTeamInvestment = await TransactionModel.aggregate([
      { $match: { user: { $in: downlineUserIds }, type: "Deposit", status: "Completed" } },
      { $group: { _id: null, total: { $sum: "$investment" } } },
    ]);
    const totalTeamTransaction = totalTeamInvestment?.[0]?.total || 0;
    
    const todayTeamInvestment = await TransactionModel.aggregate([
      { $match: { user: { $in: downlineUserIds }, createdAt: { $gte: todayStart, $lte: todayEnd }, type: "Deposit", status: "Completed" } },
      { $group: { _id: null, total: { $sum: "$investment" } } },
    ]);
    const todayTeamTransaction = todayTeamInvestment?.[0]?.total || 0;
    
    // API Response (Exact format)
    const apiResponse = {
      success: true,
      message: "Get User Income Summary - Avifx.global",
      data: {
        totalTransaction: results.totalTransaction || 0,
        todayTransaction: results.todayTransaction || 0,
        totalWithdraw: results.totalWithdraw || 0,
        todayWithdraw: results.todayWithdraw || 0,
        totalTrading: results.totalTrading || 0,
        todayTrading: results.todayTrading || 0,
        totalReferral: results.totalReferral || 0,
        todayReferral: results.todayReferral || 0,
        totalLevel: results.totalLevel || 0,
        todayLevel: results.todayLevel || 0,
        totalRankReward: results.totalRankReward || 0,
        todayRankReward: results.todayRankReward || 0,
        totalGlobalAchiever: results.totalGlobalAchiever || 0,
        todayGlobalAchiever: results.todayGlobalAchiever || 0,
        totalIncome,
        todayIncome,
        partners,
        partnerActive,
        partnerInactive,
        totalDownlineUsers: downlineUserIds.length - 1,
        totalTeamTransaction,
        todayTeamTransaction,
      },
    };
    
    // console.log('═══════════════════════════════════════════════════════');
    // console.log('📊 API RESPONSE (What Frontend Receives)');
    // console.log('═══════════════════════════════════════════════════════');
    // console.log(JSON.stringify(apiResponse, null, 2));
    
    // console.log('\n═══════════════════════════════════════════════════════');
    // console.log('🔍 DASHBOARD CARD VALUES');
    // console.log('═══════════════════════════════════════════════════════');
    // console.log(`Total Team Members: ${apiResponse.data.totalDownlineUsers}`);
    // console.log(`My Investment: $${apiResponse.data.totalTransaction}`);
    // console.log(`Today ROI Income: $${apiResponse.data.todayTrading}`);
    // console.log(`Total ROI Income: $${apiResponse.data.totalTrading}`);
    // console.log(`Sponsor Income (5%): $${apiResponse.data.totalReferral}`);
    // console.log(`Level Income: $${apiResponse.data.totalLevel}`);
    // console.log(`Reward Income: $${apiResponse.data.totalRankReward}`);
    // console.log(`Royalty Income: $${apiResponse.data.totalGlobalAchiever}`);
    // console.log(`Total Income: $${apiResponse.data.totalIncome}`);
    // console.log(`Total Withdrawals: $${apiResponse.data.totalWithdraw}`);
    
    // console.log('\n═══════════════════════════════════════════════════════');
    // console.log('⚠️  ISSUES DETECTED');
    // console.log('═══════════════════════════════════════════════════════');
    
    if (apiResponse.data.totalTransaction === 0) {
      // console.log('❌ CRITICAL: totalTransaction is 0!');
      // console.log('   This means no completed deposits found.');
      // console.log('   User investment in DB: $' + user.investment);
      // console.log('\n   Checking transactions...');
      
      const allDeposits = await TransactionModel.find({ user: userId, type: 'Deposit' });
      // console.log(`   Total deposits: ${allDeposits.length}`);
      
      allDeposits.forEach((d, i) => {
        // console.log(`   ${i + 1}. $${d.investment} - Status: ${d.status}`);
      });
      
      const completedCount = allDeposits.filter(d => d.status === 'Completed').length;
      if (completedCount === 0) {
        // console.log('\n   🔧 FIX: Update transaction status to "Completed"');
      }
    } else {
      // console.log('✅ totalTransaction: $' + apiResponse.data.totalTransaction);
    }
    
    if (apiResponse.data.totalIncome === 0 && apiResponse.data.totalTransaction > 0) {
      // console.log('\n⚠️  No income despite having investment');
      // console.log('   ROI might not be calculated yet');
    }
    
    // console.log('\n✅ Test completed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

testUser50API();
