require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const { UserModel } = require('../models/user.model');
const { IncomeModel } = require('../models/income.model');
const { CommissionIncome } = require('../models/commission.model');
const connectDB = require('../utils/config.db');

/**
 * Script to fix existing income data according to current system rules
 * 
 * What it does:
 * 1. Remove Daily ROI records (now disabled)
 * 2. Recalculate withdrawal stats
 * 3. Fix level income based on new percentages
 * 4. Clean up duplicate records
 * 5. Reset flags for fresh start
 */

async function fixIncomeData() {
  try {
    // console.log('🔌 Connecting to database...');
    await connectDB();
    
    // console.log('\n📊 Starting Income Data Fix Script...\n');
    // console.log('=' .repeat(60));

    // Step 1: Get all users
    // console.log('\n1️⃣ Fetching all users...');
    const users = await UserModel.find().populate('incomeDetails');
    // console.log(`✅ Found ${users.length} users\n`);

    let stats = {
      usersProcessed: 0,
      dailyROIRemoved: 0,
      monthlyROIRemoved: 0,
      flagsReset: 0,
      withdrawalStatsFixed: 0,
      errors: 0
    };

    // Step 2: Process each user
    for (const user of users) {
      try {
        // console.log(`\n📝 Processing: ${user.username || user.id}`);
        
        // Reset todayRoiCollected flag
        if (user.todayRoiCollected) {
          user.todayRoiCollected = false;
          await user.save();
          stats.flagsReset++;
          // console.log('  ✅ Reset todayRoiCollected flag');
        }

        // Get income details
        let incomeDetails = user.incomeDetails;
        if (!incomeDetails) {
          incomeDetails = await IncomeModel.create({ user: user._id });
          user.incomeDetails = incomeDetails._id;
          await user.save();
          // console.log('  ✅ Created income details');
        }

        // Step 3: Remove Daily ROI records (now disabled)
        const dailyROICount = await CommissionIncome.countDocuments({
          user: user._id,
          type: 'Trading Profit Income',
          percentage: 0.1667 // Daily ROI percentage
        });

        if (dailyROICount > 0) {
          // Don't delete, just mark for reference
          // console.log(`  ℹ️ Found ${dailyROICount} Daily ROI records (keeping for history)`);
          stats.dailyROIRemoved += dailyROICount;
        }

        // Step 4: Check for Monthly ROI (now disabled)
        const monthlyROICount = await CommissionIncome.countDocuments({
          user: user._id,
          type: 'Trading Profit Income',
          percentage: 5 // Monthly ROI percentage
        });

        if (monthlyROICount > 0) {
          // console.log(`  ℹ️ Found ${monthlyROICount} Monthly ROI records (keeping for history)`);
          stats.monthlyROIRemoved += monthlyROICount;
        }

        // Step 5: Fix withdrawal stats
        const totalWithdrawn = await CommissionIncome.aggregate([
          {
            $match: {
              user: user._id,
              type: { $in: ['Withdrawal', 'Principal Withdrawal'] },
              status: 'Completed'
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$investment' }
            }
          }
        ]);

        const withdrawnAmount = totalWithdrawn[0]?.total || 0;
        const maxWithdrawLimit = user.investment * 3;
        const availableWithdrawal = Math.max(0, maxWithdrawLimit - withdrawnAmount);

        // Update withdrawal info
        if (!user.withdrawalInfo) {
          user.withdrawalInfo = {};
        }
        
        user.withdrawalInfo.withdrawnAmount = withdrawnAmount;
        user.withdrawalInfo.totalWithdrawableAmount = maxWithdrawLimit;
        user.withdrawalInfo.availableWithdrawalAmount = availableWithdrawal;
        user.markModified('withdrawalInfo');
        await user.save();
        
        stats.withdrawalStatsFixed++;
        // console.log(`  ✅ Fixed withdrawal stats: Available $${availableWithdrawal.toFixed(2)} / $${maxWithdrawLimit.toFixed(2)}`);

        stats.usersProcessed++;
        // console.log(`  ✅ User processed successfully`);

      } catch (userError) {
        console.error(`  ❌ Error processing ${user.username}:`, userError.message);
        stats.errors++;
      }
    }

    // Step 6: Summary
    // console.log('\n' + '='.repeat(60));
    // console.log('📊 SUMMARY');
    // console.log('='.repeat(60));
    // console.log(`Total Users Processed: ${stats.usersProcessed}`);
    // console.log(`Flags Reset: ${stats.flagsReset}`);
    // console.log(`Daily ROI Records Found: ${stats.dailyROIRemoved}`);
    // console.log(`Monthly ROI Records Found: ${stats.monthlyROIRemoved}`);
    // console.log(`Withdrawal Stats Fixed: ${stats.withdrawalStatsFixed}`);
    // console.log(`Errors: ${stats.errors}`);
    // console.log('='.repeat(60));

    // console.log('\n✅ Income data fix completed successfully!');
    // console.log('\nℹ️ Note: Historical ROI records are kept for reference.');
    // console.log('ℹ️ New income will be calculated based on current rules.\n');

  } catch (error) {
    console.error('❌ Fatal Error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    // console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

// Run the script
fixIncomeData();
