const dns = require('dns');
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1", "1.0.0.1"]);

const mongoose = require('mongoose');
const { UserModel } = require('../models/user.model');
const { IncomeModel } = require('../models/income.model');
const { CommissionIncome } = require('../models/commission.model');
require('dotenv').config();

async function deleteAllLevelIncome() {
    try {
        // console.log('🚀 Starting Level Income Cleanup...\n');
        await mongoose.connect(process.env.DATABASE_URL);

        // Find all Level Income records
        const levelIncomeRecords = await CommissionIncome.find({
            type: "Level Income",
            status: "Completed"
        });

        // console.log(`📊 Total Level Income records found: ${levelIncomeRecords.length}\n`);

        let totalDeleted = 0, totalReversed = 0;

        // Group by user
        const userIncomeMap = {};
        for (const record of levelIncomeRecords) {
            if (!userIncomeMap[record.user]) {
                userIncomeMap[record.user] = [];
            }
            userIncomeMap[record.user].push(record);
        }

        // Process each user
        for (const [userId, records] of Object.entries(userIncomeMap)) {
            const user = await UserModel.findById(userId);
            if (!user) continue;

            const totalIncome = records.reduce((sum, r) => sum + r.income, 0);

            // Reverse income
            const income = await IncomeModel.findOne({ user: userId });
            if (income) {
                income.levelIncome.income -= totalIncome;
                income.income.totalIncome -= totalIncome;
                income.income.levelIncomeWallet -= totalIncome;
                
                // Remove from history
                income.levelIncome.history = [];
                
                await income.save();
                totalReversed += totalIncome;
            }

            // console.log(`✅ ${user.username}: Reversed $${totalIncome.toFixed(2)} (${records.length} records)`);
        }

        // Delete all Level Income records
        const deleteResult = await CommissionIncome.deleteMany({
            type: "Level Income",
            status: "Completed"
        });

        totalDeleted = deleteResult.deletedCount;

        // console.log('\n' + '='.repeat(60));
        // console.log('📊 LEVEL INCOME CLEANUP SUMMARY');
        // console.log('='.repeat(60));
        // console.log(`🗑️  Records deleted: ${totalDeleted}`);
        // console.log(`💰 Amount reversed: $${totalReversed.toFixed(2)}`);
        // console.log(`👥 Users affected: ${Object.keys(userIncomeMap).length}`);
        // console.log('='.repeat(60) + '\n');

        await mongoose.connection.close();
        // console.log('✅ Cleanup completed!\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        await mongoose.connection.close();
        process.exit(1);
    }
}

deleteAllLevelIncome();
