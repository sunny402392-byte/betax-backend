const mongoose = require('mongoose');
require('dotenv').config();

const { UserModel } = require('../models/user.model');
const { CommissionIncome } = require('../models/commission.model');
const { calculateMonthlyROIForUsers } = require('../services/dailyRoi');

// Connect to database
mongoose.connect(process.env.DATABASE_URL)
  .then(() => // console.log('✅ Database connected'))
  .catch(err => console.error('❌ Database error:', err));

async function testMonthlyROI() {
  try {
    // console.log('🚀 Running Monthly ROI Distribution...\n');
    
    // Run monthly ROI
    await calculateMonthlyROIForUsers();

    // console.log('\n📊 COMPLETE INCOME BREAKDOWN:');
    // console.log('═'.repeat(80));

    // Get all test users
    const users = await UserModel.find({ username: /^User\d+$/ })
      .populate('incomeDetails')
      .sort({ username: 1 });

    let totalInvestment = 0;
    let totalSponsorIncome = 0;
    let totalLevelIncome = 0;
    let totalROI = 0;
    let totalAllIncome = 0;

    for (const user of users) {
      const income = user.incomeDetails;
      if (!income) continue;

      const sponsorIncome = income.referralIncome?.income || 0;
      const levelIncome = income.levelIncome?.income || 0;
      const roiIncome = income.income?.roiWallet || 0;
      const currentIncome = income.income?.currentIncome || 0;
      const totalIncome = income.income?.totalIncome || 0;

      totalInvestment += user.investment;
      totalSponsorIncome += sponsorIncome;
      totalLevelIncome += levelIncome;
      totalROI += roiIncome;
      totalAllIncome += totalIncome;

      // Get commission details
      const commissions = await CommissionIncome.find({ user: user._id })
        .sort({ createdAt: -1 });

      // console.log(`\n${user.username} (ID: ${user.id})`);
      // console.log('─'.repeat(80));
      // console.log(`💼 Investment: $${user.investment.toFixed(2)}`);
      // console.log(`👥 Direct Team: ${user.partners.length}`);
      // console.log(`\n💰 INCOME BREAKDOWN:`);
      // console.log(`  💵 Sponsor Income (5%): $${sponsorIncome.toFixed(2)}`);
      // console.log(`  📊 Level Income (ROI-based): $${levelIncome.toFixed(2)}`);
      // console.log(`  📈 Trade ROI (Monthly): $${roiIncome.toFixed(2)}`);
      // console.log(`  💳 Current Income (Withdrawable): $${currentIncome.toFixed(2)}`);
      // console.log(`  💰 Total Income: $${totalIncome.toFixed(2)}`);
      // console.log(`  📉 ROI Progress: ${((totalIncome / (user.investment * 2)) * 100).toFixed(1)}% / 200%`);

      if (commissions.length > 0) {
        // console.log(`\n📋 RECENT TRANSACTIONS:`);
        commissions.slice(0, 5).forEach((comm, idx) => {
          const type = comm.type;
          const amount = comm.income.toFixed(2);
          const from = comm.fromUser ? 'from downline' : '';
          const level = comm.level ? `L${comm.level}` : '';
          // console.log(`  ${idx + 1}. ${type} ${level} ${from}: $${amount}`);
        });
      }
    }

    // console.log('\n═'.repeat(80));
    // console.log('\n📈 OVERALL STATISTICS:');
    // console.log('═'.repeat(80));
    // console.log(`Total Users: ${users.length}`);
    // console.log(`Total Investment: $${totalInvestment.toFixed(2)}`);
    // console.log(`Total Sponsor Income: $${totalSponsorIncome.toFixed(2)}`);
    // console.log(`Total Level Income: $${totalLevelIncome.toFixed(2)}`);
    // console.log(`Total ROI Distributed: $${totalROI.toFixed(2)}`);
    // console.log(`Total All Income: $${totalAllIncome.toFixed(2)}`);
    // console.log(`\nCompany Payout: $${totalAllIncome.toFixed(2)} (${((totalAllIncome / totalInvestment) * 100).toFixed(2)}% of investment)`);
    // console.log('═'.repeat(80));

    // console.log('\n✅ Monthly ROI distribution completed!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testMonthlyROI();
