require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const dns = require('dns');
const moment = require('moment-timezone');

// Set DNS servers to reliable ones
dns.setServers([
  "8.8.8.8",
  "8.8.4.4",
  "1.1.1.1",
  "1.0.0.1"
]);

const { UserModel } = require('../models/user.model');
const { TransactionModel } = require('../models/transaction.model');
const { IncomeModel } = require('../models/income.model');
const { CommissionIncome } = require('../models/commission.model');
const { PackageModel } = require('../models/package.model');
const { generateCustomId } = require('../utils/generator.uniqueid');
const { NumberFixed } = require('../utils/NumberFixed');
const { levelIncomeCalculate } = require('../utils/levelIncome.calculation');
const connectDB = require('../utils/config.db');

// Helper function to get days in a month
const getDaysInMonth = (date) => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
};

// Helper function to get all dates between two dates
const getDatesBetween = (startDate, endDate) => {
  const dates = [];
  const currentDate = new Date(startDate);
  currentDate.setHours(0, 0, 0, 0);
  
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  
  while (currentDate <= end) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dates;
};

// Calculate investment-based profit (for users without package transactions)
const calculateInvestmentBasedProfit = async (user, targetDate) => {
  try {
    // Ensure income details exist
    let incomeDetails = await IncomeModel.findById(user.incomeDetails);
    if (!incomeDetails) {
      incomeDetails = await IncomeModel.create({ user: user._id });
      user.incomeDetails = incomeDetails._id;
      await user.save();
    }

    if (user.investment < 100) {
      return 0;
    }

    // Calculate ROI percentage based on investment (same as dailyRoi.js)
    let roiPercent = 0;
    if (user.investment >= 100 && user.investment <= 1000) roiPercent = 0.2; // 6% monthly = 0.2% daily
    else if (user.investment >= 1001 && user.investment <= 5000) roiPercent = 0.2333; // 7% monthly = 0.2333% daily
    else if (user.investment >= 5001) roiPercent = 0.25; // 7.5% monthly = 0.25% daily

    if (roiPercent === 0) {
      return 0;
    }

    const finalROI = (user.investment * roiPercent) / 100;

    const targetDateStart = new Date(targetDate);
    targetDateStart.setHours(0, 0, 0, 0);
    const targetDateEnd = new Date(targetDate);
    targetDateEnd.setHours(23, 59, 59, 999);

    // Check if trading profit already exists for this date
    const existingProfit = await CommissionIncome.findOne({
      user: user._id,
      type: "Trading Profit Income",
      status: "Completed",
      createdAt: {
        $gte: targetDateStart,
        $lte: targetDateEnd
      }
    });

    if (existingProfit) {
      return 0; // Already generated for this date
    }

    // Create commission record with backdated createdAt
    const id = generateCustomId({ prefix: 'BT7-TD', max: 14, min: 14 });
    const newMonthly = new CommissionIncome({
      id,
      user: user._id,
      income: finalROI,
      percentage: roiPercent,
      amount: Number(user.investment),
      type: "Trading Profit Income",
      status: "Completed"
    });

    // Set the createdAt to target date
    newMonthly.createdAt = targetDateStart;
    newMonthly.updatedAt = targetDateStart;
    
    await newMonthly.save();
    
    // Update income
    incomeDetails.income.currentIncome = NumberFixed(incomeDetails.income.currentIncome, finalROI);
    incomeDetails.income.totalIncome = NumberFixed(incomeDetails.income.totalIncome, finalROI);
    await incomeDetails.save();
    
    // Distribute generation ROI
    const { distributeGenerationROI } = require('../controllers/roi.controller');
    await distributeGenerationROI(user._id, finalROI);

    return finalROI;
  } catch (error) {
    console.error(`   ❌ Error calculating investment-based profit for ${user.username} on ${targetDate.toISOString().split('T')[0]}:`, error.message);
    return 0;
  }
};

// Calculate trading profit for a specific date
const calculateTradingProfitForDate = async (user, targetDate) => {
  try {
    // Ensure income details exist
    let incomeDetails = await IncomeModel.findById(user.incomeDetails);
    if (!incomeDetails) {
      incomeDetails = await IncomeModel.create({ user: user._id });
      user.incomeDetails = incomeDetails._id;
      await user.save();
    }

    const transactions = await TransactionModel.find({ 
      type: "Deposit", 
      user: user._id,
      status: "Completed"
    }).sort({ createdAt: 1 }); // Sort by creation date

    if (!transactions || transactions.length === 0) {
      // Don't log this for every date check - it's too verbose
      return 0;
    }

    let totalCommission = 0;
    const targetDateStart = new Date(targetDate);
    targetDateStart.setHours(0, 0, 0, 0);
    const targetDateEnd = new Date(targetDate);
    targetDateEnd.setHours(23, 59, 59, 999);

    for (const transaction of transactions) {
      // Check if transaction was completed before or on target date
      const transactionDate = new Date(transaction.createdAt);
      transactionDate.setHours(0, 0, 0, 0);
      if (transactionDate > targetDateStart) {
        continue; // Transaction happened after target date, skip
      }

      // Skip if transaction doesn't have a package
      if (!transaction.package) {
        continue;
      }

      const package = await PackageModel.findById(transaction.package);
      if (!package || package.title === 'LIVE AC') continue;

      // Calculate total trading profit already received for this transaction
      const tradingReports = await CommissionIncome.aggregate([
        { 
          $match: { 
            package: package._id, 
            type: "Trading Profit Income", 
            user: user._id,
            tx: transaction._id
          } 
        },
        { $group: { _id: null, totalIncome: { $sum: "$income" } } }
      ]);
      
      const totalTradingAmount = tradingReports?.[0]?.totalIncome || 0;
      const maxAllowed = transaction.investment * 3;
      const remaining = maxAllowed - totalTradingAmount;
      
      if (remaining <= 0) {
        continue; // Already reached 3X cap
      }

      // Calculate daily percentage based on target date's month
      const daysInMonth = getDaysInMonth(targetDate);
      const dailyPercentage = (package.percentage / daysInMonth);
      const rawIncome = transaction.investment * (dailyPercentage / 100);
      const income = Math.min(rawIncome, remaining); // prevent over-crediting
      
      // Skip if income is 0 or negative
      if (income <= 0) {
        continue;
      }

      // Check if trading profit already exists for this date
      const existingProfit = await CommissionIncome.findOne({
        user: user._id,
        tx: transaction._id,
        package: package._id,
        type: "Trading Profit Income",
        status: "Completed",
        createdAt: {
          $gte: targetDateStart,
          $lte: targetDateEnd
        }
      });

      if (existingProfit) {
        continue; // Already generated for this date
      }

      // Create commission record with backdated createdAt
      const id = generateCustomId({ prefix: 'BT7-TD', max: 14, min: 14 });
      const newMonthly = new CommissionIncome({
        id,
        user: user._id,
        income,
        percentage: dailyPercentage,
        amount: Number(transaction.investment),
        tx: transaction._id,
        type: "Trading Profit Income",
        status: "Completed",
        package: package._id
      });

      // Set the createdAt to target date
      newMonthly.createdAt = targetDateStart;
      newMonthly.updatedAt = targetDateStart;
      
      await newMonthly.save();
      incomeDetails.monthlyIncome.history.push(newMonthly._id);
      totalCommission += income;
    }

    // Update income if commission was distributed
    if (totalCommission > 0) {
      incomeDetails.monthlyIncome.income = NumberFixed(incomeDetails.monthlyIncome.income, totalCommission);
      incomeDetails.income.totalIncome = NumberFixed(incomeDetails.income.totalIncome, totalCommission);
      incomeDetails.income.currentIncome = NumberFixed(incomeDetails.income.currentIncome, totalCommission);
      await incomeDetails.save();
      
      // Level income should be on investment, not on trading profit
      // await levelIncomeCalculate({ userId: user._id, amount: Number(totalCommission) });
    }

    return totalCommission;
  } catch (error) {
    console.error(`   ❌ Error calculating trading profit for ${user.username} on ${targetDate.toISOString().split('T')[0]}:`, error.message);
    return 0;
  }
};

async function generateMissingTradingProfit() {
  try {
    // console.log('🔌 Connecting to database...');
    await connectDB();
    
    // Start date: November 9, 2024 (9-11 se)
    const startDate = new Date('2024-11-09');
    startDate.setHours(0, 0, 0, 0);
    
    // End date: Today
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    // console.log(`\n📅 Date Range: ${startDate.toISOString().split('T')[0]} to ${today.toISOString().split('T')[0]}`);
    
    // Find all active and verified users
    // console.log('\n🔍 Finding active users...');
    const users = await UserModel.find({
      'active.isActive': true,
      'active.isVerified': true,
      'active.isBlocked': false
    }).populate('incomeDetails');

    if (!users || users.length === 0) {
      // console.log('❌ No active users found');
      await mongoose.connection.close();
      process.exit(0);
    }

    // console.log(`✅ Found ${users.length} active users\n`);

    let totalUsersProcessed = 0;
    let totalUsersWithMissingProfit = 0;
    let totalProfitGenerated = 0;

    for (const user of users) {
      totalUsersProcessed++;
      
      // Check activation date - use activeDate if available, otherwise use createdAt
      let activationDate = user.active?.activeDate;
      if (!activationDate) {
        // Fallback to user creation date if no activation date is set
        activationDate = user.createdAt;
        if (!activationDate) {
          // console.log(`${totalUsersProcessed}. ⏭️ Skipping ${user.username || user.id || user._id}: No activation date or creation date found`);
          continue;
        }
      }

      // Check if activation date is today (should not be)
      const activationDateObj = new Date(activationDate);
      activationDateObj.setHours(0, 0, 0, 0);
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      if (activationDateObj >= todayStart) {
        // console.log(`${totalUsersProcessed}. ⏭️ Skipping ${user.username || user.id || user._id}: Activation date is today or future (${activationDateObj.toISOString().split('T')[0]})`);
        continue;
      }

      // Determine the actual start date (max of Nov 9 or activation date)
      const userStartDate = activationDateObj > startDate ? activationDateObj : startDate;
      userStartDate.setHours(0, 0, 0, 0);

      // Get all dates between userStartDate and today
      const datesToProcess = getDatesBetween(userStartDate, today);

      // Check which dates are missing trading profit
      const missingDates = [];
      for (const date of datesToProcess) {
        const dateStart = new Date(date);
        dateStart.setHours(0, 0, 0, 0);
        const dateEnd = new Date(date);
        dateEnd.setHours(23, 59, 59, 999);

        // Check if trading profit exists for this date
        const existingProfit = await CommissionIncome.findOne({
          user: user._id,
          type: "Trading Profit Income",
          status: "Completed",
          createdAt: {
            $gte: dateStart,
            $lte: dateEnd
          }
        });

        if (!existingProfit) {
          missingDates.push(date);
        }
      }

      if (missingDates.length === 0) {
        // console.log(`${totalUsersProcessed}. ✅ ${user.username || user.id || user._id}: All trading profit already generated`);
        continue;
      }

      totalUsersWithMissingProfit++;
      // console.log(`\n${totalUsersProcessed}. 🔄 Processing ${user.username || user.id || user._id}`);
      // console.log(`   📅 Activation Date: ${activationDateObj.toISOString().split('T')[0]}`);
      // console.log(`   📊 Missing dates: ${missingDates.length} days`);
      // console.log(`   📅 Date range: ${userStartDate.toISOString().split('T')[0]} to ${today.toISOString().split('T')[0]}`);

      // Check if user has any deposit transactions
      const allTransactions = await TransactionModel.find({ 
        type: "Deposit", 
        user: user._id,
        status: "Completed"
      });
      
      const transactionsWithPackages = allTransactions.filter(t => t.package);
      
      // If no package transactions but user has investment, use investment-based calculation
      if (transactionsWithPackages.length === 0) {
        if (user.investment && user.investment >= 100) {
          // console.log(`   💰 User has investment (₹${user.investment}) but no package transactions - using investment-based calculation`);
          // Use investment-based approach similar to dailyRoi.js
          let userTotalProfit = 0;
          let daysProcessed = 0;
          
          for (const missingDate of missingDates) {
            const profit = await calculateInvestmentBasedProfit(user, missingDate);
            if (profit > 0) {
              userTotalProfit += profit;
              daysProcessed++;
              // console.log(`   ✅ ${missingDate.toISOString().split('T')[0]}: ₹${profit.toFixed(2)}`);
            }
          }
          
          if (userTotalProfit > 0) {
            totalProfitGenerated += userTotalProfit;
            // console.log(`   💰 Total generated: ₹${userTotalProfit.toFixed(2)} (${daysProcessed} days)`);
          } else {
            // console.log(`   ⚠️ No profit generated`);
          }
        } else {
          // console.log(`   ⚠️ No deposit transactions with packages found and investment < ₹100 - skipping`);
        }
        continue;
      }
      
      // console.log(`   📦 Found ${transactionsWithPackages.length} transaction(s) with packages`);

      let userTotalProfit = 0;
      let daysProcessed = 0;

      // Generate trading profit for each missing date
      for (const missingDate of missingDates) {
        const profit = await calculateTradingProfitForDate(user, missingDate);
        if (profit > 0) {
          userTotalProfit += profit;
          daysProcessed++;
          // console.log(`   ✅ ${missingDate.toISOString().split('T')[0]}: ₹${profit.toFixed(2)}`);
        }
      }

      if (userTotalProfit > 0) {
        totalProfitGenerated += userTotalProfit;
        // console.log(`   💰 Total generated: ₹${userTotalProfit.toFixed(2)} (${daysProcessed} days)`);
      } else {
        // console.log(`   ⚠️ No profit generated (may have reached 3X cap or no valid packages)`);
      }
    }

    // console.log('\n' + '='.repeat(60));
    // console.log('📊 SUMMARY');
    // console.log('='.repeat(60));
    // console.log(`Total users processed: ${totalUsersProcessed}`);
    // console.log(`Users with missing trading profit: ${totalUsersWithMissingProfit}`);
    // console.log(`Total profit generated: ₹${totalProfitGenerated.toFixed(2)}`);
    // console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error generating missing trading profit:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    // console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
}

// Run the script
generateMissingTradingProfit();

