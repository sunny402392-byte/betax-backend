const dns = require('dns');
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1", "1.0.0.1"]);

const mongoose = require('mongoose');
const { UserModel } = require('../models/user.model');
const { TransactionModel } = require('../models/transaction.model');
require('dotenv').config();

const LEVEL_PERCENTAGES = [0.03, 0.02, 0.01, 0.0075, 0.0075, 0.005, 0.005, 0.0025, 0.0025];

async function calculateADA1LevelIncome() {
    try {
        // console.log('🚀 Calculating Real Level Income for ADA1...\n');
        await mongoose.connect(process.env.DATABASE_URL);

        // Find ADA1
        const ada1 = await UserModel.findOne({ 
            $or: [{ username: 'ADA1' }, { id: 'BT75011940' }] 
        });

        if (!ada1) {
            // console.log('❌ User ADA1 not found');
            await mongoose.connection.close();
            return;
        }

        // console.log(`✅ Found: ${ada1.username} (${ada1.id})`);
        // console.log(`📊 Direct Referrals: ${ada1.partners?.length || 0}`);
        // console.log(`💰 Investment: $${ada1.investment || 0}\n`);

        // Count active directs
        const activeDirects = await UserModel.countDocuments({
            _id: { $in: ada1.partners || [] },
            'active.isActive': true
        });

        const maxUnlockedLevel = Math.min(activeDirects, 9);
        // console.log(`🔓 Unlocked Levels: ${maxUnlockedLevel} (${activeDirects} active directs)\n`);

        // Get all downline users (recursive)
        async function getDownline(userId, level = 1, visited = new Set()) {
            if (level > 9 || visited.has(userId.toString())) return [];
            visited.add(userId.toString());

            const directReferrals = await UserModel.find({ 
                sponsor: userId,
                'active.isActive': true 
            });

            let downline = directReferrals.map(u => ({ user: u, level }));

            for (const ref of directReferrals) {
                const subDownline = await getDownline(ref._id, level + 1, visited);
                downline = downline.concat(subDownline);
            }

            return downline;
        }

        const downlineUsers = await getDownline(ada1._id);
        // console.log(`👥 Total Downline: ${downlineUsers.length} users\n`);

        // Calculate Level Income for each downline investment
        let totalLevelIncome = 0;
        const levelBreakdown = Array(9).fill(0);

        // console.log('📈 LEVEL INCOME BREAKDOWN:\n');

        for (const { user, level } of downlineUsers) {
            if (level > maxUnlockedLevel) continue;

            const investment = user.investment || 0;
            if (investment === 0) continue;

            const percentage = LEVEL_PERCENTAGES[level - 1];
            const income = (investment * percentage);

            levelBreakdown[level - 1] += income;
            totalLevelIncome += income;

            // console.log(`  L${level} - ${user.username || user.id}: $${investment} × ${(percentage * 100).toFixed(2)}% = $${income.toFixed(2)}`);
        }

        // console.log('\n' + '='.repeat(70));
        // console.log('💰 LEVEL INCOME SUMMARY FOR ADA1');
        // console.log('='.repeat(70));

        for (let i = 0; i < maxUnlockedLevel; i++) {
            // console.log(`Level ${i + 1} (${(LEVEL_PERCENTAGES[i] * 100).toFixed(2)}%): $${levelBreakdown[i].toFixed(2)}`);
        }

        // console.log('='.repeat(70));
        // console.log(`🎯 TOTAL LEVEL INCOME: $${totalLevelIncome.toFixed(2)}`);
        // console.log('='.repeat(70) + '\n');

        await mongoose.connection.close();

    } catch (error) {
        console.error('❌ Error:', error.message);
        await mongoose.connection.close();
        process.exit(1);
    }
}

calculateADA1LevelIncome();
