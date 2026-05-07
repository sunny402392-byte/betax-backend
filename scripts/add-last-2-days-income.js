const mongoose = require('mongoose');
require('dotenv').config();
const dns = require('dns');
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1", "1.0.0.1"]);

const { UserModel } = require('../models/user.model');
const { IncomeModel } = require('../models/income.model');
const { CommissionIncome } = require('../models/commission.model');
const { generateCustomId } = require('../utils/generator.uniqueid');
const { levelIncomeCalculate } = require('../utils/levelIncome.calculation');

// Connect to database with timeout settings
mongoose.connect(process.env.DATABASE_URL, {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
})
  .then(() => // console.log('✅ Database connected'))
  .catch(err => {
    console.error('❌ Database error:', err);
    process.exit(1);
  });

async function addLast2DaysIncome() {
  try {
    // console.log('🚀 Adding last 2 days trading income for all users...\n');

    // Wait for connection
    await new Promise(resolve => setTimeout(resolve, 2000));

    const users = await UserModel.find({ username: /^User\d+$/ })
      .populate('incomeDetails')
      .sort({ username: 1 });

    if (users.length === 0) {
      // console.log('❌ No users found. Run create-50-users-chain.js first!');
      process.exit(1);
    }

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const dayBefore = new Date(today);
    dayBefore.setDate(dayBefore.getDate() - 2);

    // console.log(`📅 Adding income for:`);
    // console.log(`   Day 1: ${dayBefore.toDateString()}`);
    // console.log(`   Day 2: ${yesterday.toDateString()}\n`);

    let totalROIDay1 = 0;
    let totalROIDay2 = 0;
    let totalLevelIncomeDay1 = 0;
    let totalLevelIncomeDay2 = 0;

    // Day 1 (2 days ago)
    // console.log('📊 DAY 1 - Trading Income Distribution:');
    // console.log('═'.repeat(80));

    for (const user of users) {
      if (user.investment < 100) continue;

      let income = user.incomeDetails;
      if (!income) {
        income = await IncomeModel.create({ user: user._id });
        user.incomeDetails = income._id;
        await user.save();
      }

      const maxReturn = user.investment * 2;
      const totalEarned = income?.income?.totalIncome || 0;
      if (totalEarned >= maxReturn) continue;

      // Calculate ROI percentage
      let monthlyRoiPercent = 0;
      if (user.investment >= 100 && user.investment <= 1000) monthlyRoiPercent = 4;
      else if (user.investment >= 1100 && user.investment <= 5000) monthlyRoiPercent = 5;
      else if (user.investment >= 5001 && user.investment <= 10000) monthlyRoiPercent = 6;
      else if (user.investment >= 10001) monthlyRoiPercent = 7;

      let finalROI = (user.investment * monthlyRoiPercent) / 100;

      if (totalEarned + finalROI > maxReturn) {
        finalROI = maxReturn - totalEarned;
      }

      // Add to ROI wallet
      income.income.roiWallet = (income.income.roiWallet || 0) + finalROI;
      income.income.totalIncome += finalROI;
      await income.save();

      // Create commission record with Day 1 date
      const id = generateCustomId({ prefix: 'BT7-TD', max: 14, min: 14 });
      const commission = await CommissionIncome.create({
        id,
        user: user._id,
        income: finalROI,
        percentage: monthlyRoiPercent,
        amount: Number(user.investment),
        type: "Trading Profit Income",
        status: "Completed",
        createdAt: dayBefore
      });

      totalROIDay1 += finalROI;

      // Distribute level income on ROI
      const levelIncomesBefore = await CommissionIncome.countDocuments({
        type: "Level Income",
        createdAt: { $gte: dayBefore }
      });

      await levelIncomeCalculate({ userId: user._id, amount: finalROI });

      const levelIncomesAfter = await CommissionIncome.countDocuments({
        type: "Level Income",
        createdAt: { $gte: dayBefore }
      });

      const levelIncomesAdded = levelIncomesAfter - levelIncomesBefore;

      // Update level income dates to Day 1
      if (levelIncomesAdded > 0) {
        await CommissionIncome.updateMany(
          {
            type: "Level Income",
            createdAt: { $gte: today }
          },
          {
            $set: { createdAt: dayBefore }
          }
        );
      }

      // console.log(`✅ ${user.username}: ROI $${finalROI.toFixed(2)} (${monthlyRoiPercent}%) + ${levelIncomesAdded} level incomes`);
    }

    // console.log(`\n💰 Day 1 Total ROI: $${totalROIDay1.toFixed(2)}\n`);

    // Day 2 (yesterday)
    // console.log('📊 DAY 2 - Trading Income Distribution:');
    // console.log('═'.repeat(80));

    for (const user of users) {
      if (user.investment < 100) continue;

      let income = await IncomeModel.findById(user.incomeDetails);
      if (!income) continue;

      const maxReturn = user.investment * 2;
      const totalEarned = income?.income?.totalIncome || 0;
      if (totalEarned >= maxReturn) continue;

      // Calculate ROI percentage
      let monthlyRoiPercent = 0;
      if (user.investment >= 100 && user.investment <= 1000) monthlyRoiPercent = 4;
      else if (user.investment >= 1100 && user.investment <= 5000) monthlyRoiPercent = 5;
      else if (user.investment >= 5001 && user.investment <= 10000) monthlyRoiPercent = 6;
      else if (user.investment >= 10001) monthlyRoiPercent = 7;

      let finalROI = (user.investment * monthlyRoiPercent) / 100;

      if (totalEarned + finalROI > maxReturn) {
        finalROI = maxReturn - totalEarned;
      }

      // Add to ROI wallet
      income.income.roiWallet = (income.income.roiWallet || 0) + finalROI;
      income.income.totalIncome += finalROI;
      await income.save();

      // Create commission record with Day 2 date
      const id = generateCustomId({ prefix: 'BT7-TD', max: 14, min: 14 });
      await CommissionIncome.create({
        id,
        user: user._id,
        income: finalROI,
        percentage: monthlyRoiPercent,
        amount: Number(user.investment),
        type: "Trading Profit Income",
        status: "Completed",
        createdAt: yesterday
      });

      totalROIDay2 += finalROI;

      // Distribute level income on ROI
      const levelIncomesBefore = await CommissionIncome.countDocuments({
        type: "Level Income",
        createdAt: { $gte: yesterday }
      });

      await levelIncomeCalculate({ userId: user._id, amount: finalROI });

      const levelIncomesAfter = await CommissionIncome.countDocuments({
        type: "Level Income",
        createdAt: { $gte: yesterday }
      });

      const levelIncomesAdded = levelIncomesAfter - levelIncomesBefore;

      // Update level income dates to Day 2
      if (levelIncomesAdded > 0) {
        await CommissionIncome.updateMany(
          {
            type: "Level Income",
            createdAt: { $gte: today }
          },
          {
            $set: { createdAt: yesterday }
          }
        );
      }

      // console.log(`✅ ${user.username}: ROI $${finalROI.toFixed(2)} (${monthlyRoiPercent}%) + ${levelIncomesAdded} level incomes`);
    }

    // console.log(`\n💰 Day 2 Total ROI: $${totalROIDay2.toFixed(2)}\n`);

    // Summary
    // console.log('═'.repeat(80));
    // console.log('\n📈 COMPLETE INCOME SUMMARY (Last 2 Days):');
    // console.log('═'.repeat(80));

    const allUsers = await UserModel.find({ username: /^User\d+$/ })
      .populate('incomeDetails')
      .sort({ username: 1 });

    let grandTotalSponsor = 0;
    let grandTotalLevel = 0;
    let grandTotalROI = 0;
    let grandTotal = 0;

    for (const user of allUsers) {
      const income = user.incomeDetails;
      if (!income) continue;

      const sponsorIncome = income.referralIncome?.income || 0;
      const levelIncome = income.levelIncome?.income || 0;
      const roiIncome = income.income?.roiWallet || 0;
      const totalIncome = income.income?.totalIncome || 0;

      grandTotalSponsor += sponsorIncome;
      grandTotalLevel += levelIncome;
      grandTotalROI += roiIncome;
      grandTotal += totalIncome;

      if (totalIncome > 0) {
        // console.log(`\n${user.username} (Investment: $${user.investment})`);
        // console.log(`  💵 Sponsor Income: $${sponsorIncome.toFixed(2)}`);
        // console.log(`  📊 Level Income: $${levelIncome.toFixed(2)}`);
        // console.log(`  📈 Trade ROI (2 days): $${roiIncome.toFixed(2)}`);
        // console.log(`  💰 Total Income: $${totalIncome.toFixed(2)}`);
        // console.log(`  📉 Progress: ${((totalIncome / (user.investment * 2)) * 100).toFixed(1)}% / 200%`);
      }
    }

    // console.log('\n═'.repeat(80));
    // console.log('\n🎯 GRAND TOTALS:');
    // console.log(`  💵 Total Sponsor Income: $${grandTotalSponsor.toFixed(2)}`);
    // console.log(`  📊 Total Level Income: $${grandTotalLevel.toFixed(2)}`);
    // console.log(`  📈 Total Trade ROI (2 days): $${grandTotalROI.toFixed(2)}`);
    // console.log(`  💰 Grand Total Income: $${grandTotal.toFixed(2)}`);
    // console.log('═'.repeat(80));

    // console.log('\n✅ Last 2 days income added successfully!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addLast2DaysIncome();
