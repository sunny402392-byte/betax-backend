require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const dns = require('dns');

// Set DNS servers to reliable ones
dns.setServers([
  "8.8.8.8",
  "8.8.4.4",
  "1.1.1.1",
  "1.0.0.1"
]);

const { UserModel } = require('../models/user.model');
const { TransactionModel } = require('../models/transaction.model');
const { CommissionIncome } = require('../models/commission.model');
const connectDB = require('../utils/config.db');

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

async function verifyTradingProfit() {
  try {
    // console.log('🔌 Connecting to database...');
    await connectDB();
    
    // Start date: November 9, 2024
    const startDate = new Date('2024-11-09');
    startDate.setHours(0, 0, 0, 0);
    
    // End date: Today
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    // console.log(`\n📅 Verification Date Range: ${startDate.toISOString().split('T')[0]} to ${today.toISOString().split('T')[0]}`);
    
    // Find all active and verified users
    // console.log('\n🔍 Finding active users...');
    const users = await UserModel.find({
      'active.isActive': true,
      'active.isVerified': true,
      'active.isBlocked': false
    });

    if (!users || users.length === 0) {
      // console.log('❌ No active users found');
      await mongoose.connection.close();
      process.exit(0);
    }

    // console.log(`✅ Found ${users.length} active users\n`);

    let totalUsersChecked = 0;
    let usersWithMissingProfit = 0;
    let usersWithCompleteProfit = 0;
    let totalMissingDays = 0;
    const usersWithIssues = [];

    for (const user of users) {
      totalUsersChecked++;
      
      // Check activation date
      let activationDate = user.active?.activeDate;
      if (!activationDate) {
        activationDate = user.createdAt;
        if (!activationDate) {
          continue;
        }
      }

      const activationDateObj = new Date(activationDate);
      activationDateObj.setHours(0, 0, 0, 0);
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      if (activationDateObj >= todayStart) {
        continue; // Skip users activated today or in future
      }

      // Determine the actual start date (max of Nov 9 or activation date)
      const userStartDate = activationDateObj > startDate ? activationDateObj : startDate;
      userStartDate.setHours(0, 0, 0, 0);

      // Get all dates between userStartDate and today
      const datesToCheck = getDatesBetween(userStartDate, today);

      // Check which dates are missing trading profit
      const missingDates = [];
      const existingDates = [];

      for (const date of datesToCheck) {
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

        if (existingProfit) {
          existingDates.push(date.toISOString().split('T')[0]);
        } else {
          missingDates.push(date.toISOString().split('T')[0]);
        }
      }

      // Check if user has transactions or investment
      const hasTransactions = await TransactionModel.exists({ 
        type: "Deposit", 
        user: user._id,
        status: "Completed",
        package: { $exists: true, $ne: null }
      });

      const hasInvestment = user.investment && user.investment >= 100;

      if (missingDates.length > 0) {
        usersWithMissingProfit++;
        totalMissingDays += missingDates.length;
        
        const userInfo = {
          username: user.username || user.id || user._id,
          activationDate: activationDateObj.toISOString().split('T')[0],
          investment: user.investment || 0,
          hasPackageTransactions: !!hasTransactions,
          hasInvestment: hasInvestment,
          totalDays: datesToCheck.length,
          existingDays: existingDates.length,
          missingDays: missingDates.length,
          missingDates: missingDates.slice(0, 10), // Show first 10 missing dates
          dateRange: `${userStartDate.toISOString().split('T')[0]} to ${today.toISOString().split('T')[0]}`
        };
        
        usersWithIssues.push(userInfo);
      } else {
        usersWithCompleteProfit++;
      }
    }

    // console.log('\n' + '='.repeat(80));
    // console.log('📊 VERIFICATION SUMMARY');
    // console.log('='.repeat(80));
    // console.log(`Total users checked: ${totalUsersChecked}`);
    // console.log(`✅ Users with complete trading profit: ${usersWithCompleteProfit}`);
    // console.log(`❌ Users with missing trading profit: ${usersWithMissingProfit}`);
    // console.log(`📅 Total missing days across all users: ${totalMissingDays}`);
    // console.log('='.repeat(80));

    if (usersWithIssues.length > 0) {
      // console.log('\n⚠️  USERS WITH MISSING TRADING PROFIT:\n');
      
      usersWithIssues.forEach((user, index) => {
        // console.log(`${index + 1}. ${user.username}`);
        // console.log(`   📅 Activation Date: ${user.activationDate}`);
        // console.log(`   💰 Investment: ₹${user.investment}`);
        // console.log(`   📦 Has Package Transactions: ${user.hasPackageTransactions ? 'Yes' : 'No'}`);
        // console.log(`   📊 Date Range: ${user.dateRange}`);
        // console.log(`   ✅ Existing Days: ${user.existingDays}/${user.totalDays}`);
        // console.log(`   ❌ Missing Days: ${user.missingDays}/${user.totalDays}`);
        
        if (user.missingDates.length > 0) {
          if (user.missingDates.length <= 5) {
            // console.log(`   📅 Missing Dates: ${user.missingDates.join(', ')}`);
          } else {
            // console.log(`   📅 Missing Dates (first 5): ${user.missingDates.slice(0, 5).join(', ')}... (+${user.missingDates.length - 5} more)`);
          }
        }
        
        // Show reason why profit might be missing
        if (!user.hasPackageTransactions && !user.hasInvestment) {
          // console.log(`   ⚠️  Reason: No package transactions and investment < ₹100`);
        } else if (!user.hasPackageTransactions && user.hasInvestment) {
          // console.log(`   ⚠️  Reason: Has investment but no package transactions (should use investment-based calculation)`);
        } else if (user.hasPackageTransactions) {
          // console.log(`   ⚠️  Reason: Has package transactions but profit not generated`);
        }
        
        // console.log('');
      });
    } else {
      // console.log('\n✅ SUCCESS! All users have complete trading profit records!');
    }

    // Additional statistics
    // console.log('\n' + '='.repeat(80));
    // console.log('📈 ADDITIONAL STATISTICS');
    // console.log('='.repeat(80));
    
    // Count users by investment status
    const usersWithInvestment = users.filter(u => u.investment && u.investment >= 100).length;
    const usersWithPackageTx = await UserModel.countDocuments({
      _id: { $in: users.map(u => u._id) },
      transactions: { $exists: true, $ne: [] }
    });
    
    // console.log(`Users with investment ≥ ₹100: ${usersWithInvestment}`);
    // console.log(`Users with transactions: ${usersWithPackageTx}`);
    
    // Count total trading profit records in date range
    const totalProfitRecords = await CommissionIncome.countDocuments({
      type: "Trading Profit Income",
      status: "Completed",
      createdAt: {
        $gte: startDate,
        $lte: today
      }
    });
    
    // console.log(`Total Trading Profit records (Nov 9 - Today): ${totalProfitRecords}`);
    // console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error verifying trading profit:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    // console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
}

// Run the verification
verifyTradingProfit();


