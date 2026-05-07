const dns = require('dns');
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1", "1.0.0.1"]);

const mongoose = require('mongoose');
const { UserModel } = require('../models/user.model');
const { IncomeModel } = require('../models/income.model');
const { CommissionIncome } = require('../models/commission.model');
const { generateCustomId } = require('../utils/generator.uniqueid');
const { NumberFixed } = require('../utils/NumberFixed');
require('dotenv').config();

// EXACT SAME AS YOUR CODE (Line 156-162)
const levelIncomePercentages = [
    0.03,    // 1st = 3%
    0.02,    // 2nd = 2%
    0.01,    // 3rd = 1%
    0.0075,  // 4th = 0.75%
    0.0075,  // 5th = 0.75% 
    0.005,   // 6th = 0.50%
    0.005,   // 7th = 0.50%
    0.0025,  // 8th = 0.25%
    0.0025   // 9th = 0.25%
];

const EXCLUDED_USER_IDS = ['BSG0506884', 'BSG7210166', 'BSG6645644'];

async function generateAllLevelIncome() {
    try {
        // console.log('🚀 Starting Level Income Generation (EXACT ALGO)...\n');
        await mongoose.connect(process.env.DATABASE_URL);

        const allUsers = await UserModel.find({
            'active.isActive': true,
            'active.isBlocked': false,
            investment: { $gt: 0 }
        });

        // console.log(`📊 Total Users: ${allUsers.length}\n`);

        let totalDistributed = 0;
        let recordsCreated = 0;

        for (const user of allUsers) {
            // Skip excluded users (Line 168-171)
            if (user.id && EXCLUDED_USER_IDS.includes(user.id)) {
                // console.log(`⏭️ Skipping excluded: ${user.username}`);
                continue;
            }

            // console.log(`\n🔄 ${user.username} - $${user.investment}`);

            // EXACT ALGO FROM LINE 173-193
            let currentUser = user;
            for (let level = 0; level < levelIncomePercentages.length; level++) {
                if (!currentUser.sponsor) break;
                
                const sponsor = await UserModel.findById(currentUser.sponsor);
                if (!sponsor) break;
                if (sponsor.active.isBlocked) break;

                // Stop if sponsor excluded (Line 177-181)
                if (sponsor.id && EXCLUDED_USER_IDS.includes(sponsor.id)) {
                    // console.log(`  ⏹️ Chain stopped at excluded sponsor: ${sponsor.username}`);
                    break;
                }

                // Check active directs (Line 183-185)
                const activeDirects = await UserModel.countDocuments({ 
                    _id: { $in: sponsor.partners }, 
                    'active.isActive': true 
                });
                
                const unlockedDirects = Math.min(activeDirects, 9);
                const maxUnlockedLevel = unlockedDirects - 1; // 0-indexed

                // Level unlock check (Line 186)
                if (level <= maxUnlockedLevel) {
                    if (sponsor.active.isActive && !sponsor.active.isBlocked) {
                        let incomeDetails = await IncomeModel.findById(sponsor.incomeDetails);
                        
                        // Create if missing
                        if (!incomeDetails) {
                            incomeDetails = await IncomeModel.create({ user: sponsor._id });
                            sponsor.incomeDetails = incomeDetails._id;
                            await sponsor.save();
                        }

                        const percentage = levelIncomePercentages[level];
                        if (!percentage) break;
                        
                        const income = Number(user.investment * percentage);

                        // Update income (Line 190-193)
                        incomeDetails.levelIncome.income = NumberFixed(incomeDetails.levelIncome.income, income);
                        incomeDetails.income.totalIncome = NumberFixed(incomeDetails.income.totalIncome, income);
                        incomeDetails.income.levelIncomeWallet = NumberFixed(incomeDetails.income.levelIncomeWallet || 0, income);

                        // Create commission (Line 195-197)
                        const id = generateCustomId({ prefix: 'BSG-LVL', max: 14, min: 14 });
                        const days = await CommissionIncome.find({ 
                            user: sponsor._id, 
                            fromUser: user._id, 
                            type: "Level Income", 
                            status: "Completed" 
                        });
                        
                        const newLevel = new CommissionIncome({ 
                            id, 
                            user: sponsor._id, 
                            fromUser: user._id, 
                            level: level + 1, 
                            income: income, 
                            percentage: percentage * 100, 
                            amount: Number(user.investment), 
                            days: Number(days.length + 1), 
                            type: "Level Income", 
                            status: "Completed" 
                        });

                        incomeDetails.levelIncome.history.push(newLevel._id);
                        await newLevel.save();
                        await incomeDetails.save();
                        
                        totalDistributed += income;
                        recordsCreated++;
                        
                        // console.log(`  ✅ L${level + 1} → ${sponsor.username}: $${income.toFixed(2)} (${(percentage * 100)}%)`);
                    }
                }
                
                currentUser = sponsor;
            }
        }

        // console.log('\n' + '='.repeat(70));
        // console.log('📈 SUMMARY');
        // console.log('='.repeat(70));
        // console.log(`📝 Records: ${recordsCreated}`);
        // console.log(`💰 Total: $${totalDistributed.toFixed(2)}`);
        // console.log('='.repeat(70));

        await mongoose.connection.close();
        // console.log('\n✅ Completed!\n');

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

generateAllLevelIncome();
