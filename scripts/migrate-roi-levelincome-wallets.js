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
const { IncomeModel } = require('../models/income.model');
const { CommissionIncome } = require('../models/commission.model');
const { TransactionModel } = require('../models/transaction.model');
const connectDB = require('../utils/config.db');

/**
 * Migration Script: Populate ROI Wallet and Level Income Wallet
 * 
 * This script calculates and sets the correct ROI and Level Income wallet balances
 * for all users based on their historical CommissionIncome records.
 * 
 * Logic:
 * 1. Get all Trading Profit Income (ROI) - goes to roiWallet
 * 2. Get all Level Income - goes to levelIncomeWallet
 * 3. Calculate what's already withdrawn from currentIncome
 * 4. Adjust wallets accordingly
 */
async function migrateROIAndLevelIncomeWallets() {
  try {
    // console.log('🔌 Connecting to database...');
    await connectDB();
    // console.log('✅ Connected to database\n');

    // Get all users with income details
    const users = await UserModel.find({}).populate('incomeDetails');
    // console.log(`📊 Found ${users.length} users to process\n`);

    let processedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        processedCount++;
        // console.log(`\n[${processedCount}/${users.length}] Processing user: ${user.username || user.id || user._id}`);

        // Get or create income details
        let incomeDetails = user.incomeDetails;
        if (!incomeDetails) {
          // console.log('   ⚠️  No income details found, creating new...');
          incomeDetails = await IncomeModel.create({ user: user._id });
          user.incomeDetails = incomeDetails._id;
          await user.save();
        } else {
          incomeDetails = await IncomeModel.findById(incomeDetails._id || incomeDetails);
        }

        if (!incomeDetails) {
          // console.log('   ❌ Failed to get/create income details');
          errorCount++;
          continue;
        }

        // Calculate total ROI from Trading Profit Income
        const roiRecords = await CommissionIncome.find({
          user: user._id,
          type: 'Trading Profit Income',
          status: 'Completed'
        });

        const totalROI = roiRecords.reduce((sum, record) => {
          return sum + (record.income || 0);
        }, 0);

        // console.log(`   💰 Total ROI earned: $${totalROI.toFixed(2)} (${roiRecords.length} records)`);

        // Calculate total Level Income
        const levelIncomeRecords = await CommissionIncome.find({
          user: user._id,
          type: 'Level Income',
          status: 'Completed'
        });

        const totalLevelIncome = levelIncomeRecords.reduce((sum, record) => {
          return sum + (record.income || 0);
        }, 0);

        // console.log(`   📈 Total Level Income earned: $${totalLevelIncome.toFixed(2)} (${levelIncomeRecords.length} records)`);

        // Get current income state
        const currentIncome = incomeDetails.income?.currentIncome || 0;
        const totalIncome = incomeDetails.income?.totalIncome || 0;
        const withdrawnAmount = incomeDetails.withdrawal?.amount || 0;

        // console.log(`   📊 Current Income: $${currentIncome.toFixed(2)}`);
        // console.log(`   📊 Total Income: $${totalIncome.toFixed(2)}`);
        // console.log(`   💸 Withdrawn: $${withdrawnAmount.toFixed(2)}`);

        // Calculate what was actually earned from other sources (non-ROI, non-Level Income)
        const otherIncomeTypes = ['Referral Income', 'Matching Income', 'Live Trading Income', 'Global Archive Reward', 'Rank Reward'];
        const otherIncomeRecords = await CommissionIncome.find({
          user: user._id,
          type: { $in: otherIncomeTypes },
          status: 'Completed'
        });

        const totalOtherIncome = otherIncomeRecords.reduce((sum, record) => {
          return sum + (record.income || 0);
        }, 0);

        // console.log(`   💵 Other Income (non-ROI/Level): $${totalOtherIncome.toFixed(2)}`);

        // Calculate total earned income (all types)
        const totalEarnedIncome = totalROI + totalLevelIncome + totalOtherIncome;
        // console.log(`   📊 Total Earned Income: $${totalEarnedIncome.toFixed(2)}`);

        // Strategy: Calculate wallet balances based on what user has earned minus what was withdrawn
        // Since withdrawals came from currentIncome (which had all income types mixed),
        // we need to estimate how much ROI/Level Income was withdrawn
        
        const totalROIAndLevelIncome = totalROI + totalLevelIncome;
        
        // Calculate expected currentIncome (only from other income sources, minus withdrawals)
        const expectedCurrentIncome = Math.max(0, totalOtherIncome - withdrawnAmount);
        
        // If currentIncome > expectedCurrentIncome, the excess is likely ROI/Level Income
        // This is the ROI/Level Income that's still in currentIncome (not withdrawn)
        const roiLevelIncomeStillInCurrentIncome = Math.max(0, currentIncome - expectedCurrentIncome);
        
        // Calculate how much ROI/Level Income was actually withdrawn
        // If withdrawnAmount >= totalROIAndLevelIncome, all ROI/Level Income was withdrawn
        // Otherwise, calculate proportionally
        let roiLevelIncomeWithdrawn = 0;
        if (totalIncome > 0) {
          // Estimate withdrawal ratio from total income
          const withdrawalRatio = Math.min(1, withdrawnAmount / totalIncome);
          roiLevelIncomeWithdrawn = totalROIAndLevelIncome * withdrawalRatio;
        } else if (withdrawnAmount > 0) {
          // If totalIncome is 0 but there were withdrawals, assume all ROI/Level Income was withdrawn
          roiLevelIncomeWithdrawn = totalROIAndLevelIncome;
        }
        
        // Calculate remaining ROI/Level Income (not withdrawn)
        const remainingROIAndLevelIncome = Math.max(0, totalROIAndLevelIncome - roiLevelIncomeWithdrawn);
        
        // Distribute remaining between ROI and Level Income proportionally
        let roiWalletBalance = 0;
        let levelIncomeWalletBalance = 0;
        
        if (totalROIAndLevelIncome > 0 && remainingROIAndLevelIncome > 0) {
          const roiRatio = totalROI / totalROIAndLevelIncome;
          const levelIncomeRatio = totalLevelIncome / totalROIAndLevelIncome;
          
          roiWalletBalance = remainingROIAndLevelIncome * roiRatio;
          levelIncomeWalletBalance = remainingROIAndLevelIncome * levelIncomeRatio;
        }
        
        // Round to avoid floating point issues
        roiWalletBalance = Math.round(roiWalletBalance * 100) / 100;
        levelIncomeWalletBalance = Math.round(levelIncomeWalletBalance * 100) / 100;
        
        const totalDepositWalletBalance = roiWalletBalance + levelIncomeWalletBalance;

        // console.log(`   🔄 Analysis:`);
        // console.log(`      Total ROI/Level Income earned: $${totalROIAndLevelIncome.toFixed(2)}`);
        // console.log(`      Estimated ROI/Level Income withdrawn: $${roiLevelIncomeWithdrawn.toFixed(2)}`);
        // console.log(`      Remaining ROI/Level Income: $${remainingROIAndLevelIncome.toFixed(2)}`);
        // console.log(`      ROI/Level Income still in currentIncome: $${roiLevelIncomeStillInCurrentIncome.toFixed(2)}`);

        // Update wallets
        const oldROIWallet = incomeDetails.income?.roiWallet || 0;
        const oldLevelIncomeWallet = incomeDetails.income?.levelIncomeWallet || 0;

        incomeDetails.income.roiWallet = roiWalletBalance;
        incomeDetails.income.levelIncomeWallet = levelIncomeWalletBalance;
        
        // Adjust currentIncome: Remove ROI/Level Income that should now be in wallets
        // Only remove the amount that's actually remaining (not withdrawn)
        if (roiLevelIncomeStillInCurrentIncome > 0 && remainingROIAndLevelIncome > 0) {
          // Remove the minimum of what's in currentIncome and what should be in wallets
          const amountToRemove = Math.min(roiLevelIncomeStillInCurrentIncome, remainingROIAndLevelIncome);
          const newCurrentIncome = Math.max(0, currentIncome - amountToRemove);
          incomeDetails.income.currentIncome = newCurrentIncome;
          // console.log(`   🔄 Adjusted Current Income: $${currentIncome.toFixed(2)} → $${newCurrentIncome.toFixed(2)} (removed $${amountToRemove.toFixed(2)})`);
        } else {
          // console.log(`   ℹ️  Current Income unchanged: $${currentIncome.toFixed(2)}`);
        }

        await incomeDetails.save();

        // console.log(`   ✅ Updated wallets:`);
        // console.log(`      ROI Wallet: $${oldROIWallet.toFixed(2)} → $${roiWalletBalance.toFixed(2)}`);
        // console.log(`      Level Income Wallet: $${oldLevelIncomeWallet.toFixed(2)} → $${levelIncomeWalletBalance.toFixed(2)}`);
        // console.log(`      Total Deposit Wallet: $${totalDepositWalletBalance.toFixed(2)}`);

        updatedCount++;

      } catch (error) {
        console.error(`   ❌ Error processing user ${user.username || user.id}:`, error.message);
        errorCount++;
      }
    }

    // console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    // console.log('🎉 Migration Completed!');
    // console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    // console.log(`✅ Total users processed: ${processedCount}`);
    // console.log(`✅ Users updated: ${updatedCount}`);
    // console.log(`❌ Errors: ${errorCount}`);
    // console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Migration Error:', error);
  } finally {
    await mongoose.connection.close();
    // console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

// Run migration
migrateROIAndLevelIncomeWallets();

