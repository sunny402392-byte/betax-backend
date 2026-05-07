const dns = require('dns');
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1", "1.0.0.1"]);

const mongoose = require('mongoose');
const { UserModel } = require('../models/user.model');
const { IncomeModel } = require('../models/income.model');
const { CommissionIncome } = require('../models/commission.model');
require('dotenv').config();

async function removeDuplicateROI() {
    try {
        // console.log('🚀 Starting Duplicate ROI Cleanup...\n');
        await mongoose.connect(process.env.DATABASE_URL);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find all users with duplicate Trading Profit today
        const users = await UserModel.find({
            'active.isActive': true,
            investment: { $gte: 100 }
        });

        let totalDeleted = 0, totalReversed = 0;

        for (const user of users) {
            // Find all Trading Profit records for today
            const todayRecords = await CommissionIncome.find({
                user: user._id,
                type: "Trading Profit Income",
                status: "Completed",
                createdAt: { $gte: today }
            }).sort({ createdAt: 1 }); // Oldest first

            if (todayRecords.length > 1) {
                // console.log(`\n🔍 ${user.username}: Found ${todayRecords.length} records`);

                // Keep first, delete rest
                const toDelete = todayRecords.slice(1);
                
                for (const record of toDelete) {
                    // Reverse income
                    const income = await IncomeModel.findOne({ user: user._id });
                    if (income) {
                        income.income.roiWallet -= record.income;
                        income.income.totalIncome -= record.income;
                        await income.save();
                        totalReversed += record.income;
                    }

                    // Delete record
                    await CommissionIncome.deleteOne({ _id: record._id });
                    totalDeleted++;
                    
                    // console.log(`  ❌ Deleted: $${record.income.toFixed(2)}`);
                }
            }
        }

        // console.log('\n' + '='.repeat(60));
        // console.log('📊 CLEANUP SUMMARY');
        // console.log('='.repeat(60));
        // console.log(`🗑️  Records deleted: ${totalDeleted}`);
        // console.log(`💰 Amount reversed: $${totalReversed.toFixed(2)}`);
        // console.log('='.repeat(60) + '\n');

        await mongoose.connection.close();
        // console.log('✅ Cleanup completed!\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        await mongoose.connection.close();
        process.exit(1);
    }
}

removeDuplicateROI();
