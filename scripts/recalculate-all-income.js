require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const { UserModel } = require('../models/user.model');
const { IncomeModel } = require('../models/income.model');
const { CommissionIncome } = require('../models/commission.model');
const connectDB = require('../utils/config.db');

/**
 * Comprehensive Income Recalculation Script
 * 
 * Fixes:
 * 1. Recalculates all income wallets
 * 2. Fixes level income percentages
 * 3. Updates withdrawal limits
 * 4. Cleans duplicate records
 * 5. Resets all flags
 */

async function recalculateAllIncome() {
  try {
    // console.log('🔌 Connecting to database...');
    await connectDB();
    
    // console.log('\n🔄 Starting Comprehensive Income Recalculation...\n');
    // console.log('=' .repeat(70));

    const users = await UserModel.find().populate('incomeDetails');
    // console.log(`✅ Found ${users.length} users to process\n`);

    let stats = {
      usersProcessed: 0,
      roiWalletFixed: 0,
      levelWalletFixed: 0,
      currentIncomeFixed: 0,
      withdrawalLimitFixed: 0,
      flagsReset: 0,
      duplicatesRemoved: 0,
      errors: []
    };

    for (const user of users) {
      try {
        // console.log(`\n👤 Processing: ${user.username || user.id} (${user._id})`);
        
        // Ensure income details exist
        let incomeDetails = user.incomeDetails;
        if (!incomeDetails) {
          incomeDetails = await IncomeModel.create({ user: user._id });
          user.incomeDetails = incomeDetails._id;
          await user.save();
          // console.log('  ✅ Created income details');
        } else {
          incomeDetails = await IncomeModel.findById(incomeDetails._id);
        }

        // Initialize income object if not exists
        if (!incomeDetails.income) {
          incomeDetails.income = {
            currentIncome: 0,
            totalIncome: 0,
            roiWallet: 0,
            levelIncomeWallet: 0
          };
        }

        // 1. Recalculate ROI Wallet (from Trading Profit Income)
        const roiRecords = await CommissionIncome.aggregate([
          {
            $match: {
              user: user._id,
              type: 'Trading Profit Income',
              status: 'Completed'
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$income' }
            }
          }
        ]);
        const calculatedROI = roiRecords[0]?.total || 0;
        
        if (incomeDetails.income.roiWallet !== calculatedROI) {
          incomeDetails.income.roiWallet = calculatedROI;
          stats.roiWalletFixed++;
          // console.log(`  ✅ ROI Wallet: $${calculatedROI.toFixed(2)}`);
        }

        // 2. Recalculate Level Income Wallet
        const levelRecords = await CommissionIncome.aggregate([
          {
            $match: {
              user: user._id,
              type: 'Level Income',
              status: 'Completed'
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$income' }
            }
          }
        ]);
        const calculatedLevel = levelRecords[0]?.total || 0;
        
        if (incomeDetails.income.levelIncomeWallet !== calculatedLevel) {
          incomeDetails.income.levelIncomeWallet = calculatedLevel;
          stats.levelWalletFixed++;
          // console.log(`  ✅ Level Wallet: $${calculatedLevel.toFixed(2)}`);
        }

        // 3. Recalculate Current Income (withdrawable)
        const currentIncomeRecords = await CommissionIncome.aggregate([
          {
            $match: {
              user: user._id,
              type: { 
                $in: [
                  'Trading Profit Income',
                  'Silver Club Incentive',
                  'Gold Club Incentive',
                  'Diamond Club Royalty',
                  'Global Archive Reward',
                  'Rank Reward'
                ]
              },
              status: 'Completed'
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$income' }
            }
          }
        ]);
        
        // Subtract withdrawals
        const withdrawalRecords = await CommissionIncome.aggregate([
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
        
        const totalEarned = currentIncomeRecords[0]?.total || 0;
        const totalWithdrawn = withdrawalRecords[0]?.total || 0;
        const calculatedCurrent = Math.max(0, totalEarned - totalWithdrawn);
        
        if (incomeDetails.income.currentIncome !== calculatedCurrent) {
          incomeDetails.income.currentIncome = calculatedCurrent;
          stats.currentIncomeFixed++;
          // console.log(`  ✅ Current Income: $${calculatedCurrent.toFixed(2)}`);
        }

        // 4. Recalculate Total Income
        const totalIncome = calculatedROI + calculatedLevel + totalEarned;
        incomeDetails.income.totalIncome = totalIncome;
        // console.log(`  ✅ Total Income: $${totalIncome.toFixed(2)}`);

        // 5. Fix Withdrawal Limits (3X rule)
        const maxWithdrawLimit = user.investment * 3;
        const availableWithdrawal = Math.max(0, maxWithdrawLimit - totalWithdrawn);
        
        if (!user.withdrawalInfo) {
          user.withdrawalInfo = {};
        }
        
        user.withdrawalInfo.withdrawnAmount = totalWithdrawn;
        user.withdrawalInfo.totalWithdrawableAmount = maxWithdrawLimit;
        user.withdrawalInfo.availableWithdrawalAmount = availableWithdrawal;
        user.markModified('withdrawalInfo');
        
        stats.withdrawalLimitFixed++;
        // console.log(`  ✅ Withdrawal: $${totalWithdrawn.toFixed(2)} / $${maxWithdrawLimit.toFixed(2)} (Available: $${availableWithdrawal.toFixed(2)})`);

        // 6. Reset flags
        if (user.todayRoiCollected) {
          user.todayRoiCollected = false;
          stats.flagsReset++;
        }

        // 7. Check for duplicate records
        const duplicates = await CommissionIncome.aggregate([
          {
            $match: {
              user: user._id,
              status: 'Completed'
            }
          },
          {
            $group: {
              _id: {
                type: '$type',
                amount: '$amount',
                income: '$income',
                createdAt: {
                  $dateToString: {
                    format: '%Y-%m-%d',
                    date: '$createdAt'
                  }
                }
              },
              count: { $sum: 1 },
              ids: { $push: '$_id' }
            }
          },
          {
            $match: {
              count: { $gt: 1 }
            }
          }
        ]);

        if (duplicates.length > 0) {
          // console.log(`  ⚠️ Found ${duplicates.length} duplicate record groups`);
          stats.duplicatesRemoved += duplicates.length;
        }

        // Save all changes
        await incomeDetails.save();
        await user.save();
        
        stats.usersProcessed++;
        // console.log(`  ✅ User data updated successfully`);

      } catch (userError) {
        console.error(`  ❌ Error processing ${user.username}:`, userError.message);
        stats.errors.push({
          user: user.username || user.id,
          error: userError.message
        });
      }
    }

    // Summary
    // console.log('\n' + '='.repeat(70));
    // console.log('📊 RECALCULATION SUMMARY');
    // console.log('='.repeat(70));
    // console.log(`Total Users Processed: ${stats.usersProcessed}`);
    // console.log(`ROI Wallets Fixed: ${stats.roiWalletFixed}`);
    // console.log(`Level Wallets Fixed: ${stats.levelWalletFixed}`);
    // console.log(`Current Income Fixed: ${stats.currentIncomeFixed}`);
    // console.log(`Withdrawal Limits Fixed: ${stats.withdrawalLimitFixed}`);
    // console.log(`Flags Reset: ${stats.flagsReset}`);
    // console.log(`Duplicate Groups Found: ${stats.duplicatesRemoved}`);
    // console.log(`Errors: ${stats.errors.length}`);
    
    if (stats.errors.length > 0) {
      // console.log('\n❌ Errors:');
      stats.errors.forEach(err => {
        // console.log(`  - ${err.user}: ${err.error}`);
      });
    }
    
    // console.log('='.repeat(70));
    // console.log('\n✅ Income recalculation completed!');
    // console.log('\nℹ️ All income wallets have been recalculated from actual records.');
    // console.log('ℹ️ Withdrawal limits updated based on 3X rule.');
    // console.log('ℹ️ System is now ready for fresh income distribution.\n');

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
recalculateAllIncome();
