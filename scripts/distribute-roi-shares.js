// const dns = require('dns');
// dns.setServers([
//   "8.8.8.8",
//   "8.8.4.4",
//   "1.1.1.1",
//   "1.0.0.1"
// ]);

// const mongoose = require('mongoose');
// const { UserModel } = require('../models/user.model');
// const { IncomeModel } = require('../models/income.model');
// const { CommissionIncome } = require('../models/commission.model');
// const ROIHistory = require('../models/roiHistory');
// const { generateCustomId } = require('../utils/generator.uniqueid');
// const { distributeGenerationROI } = require('../controllers/roi.controller');
// require('dotenv').config();

// // ROI Configuration
// const DAILY_ROI_PERCENTAGE = 0.1667; // 5% monthly = 0.1667% daily
// const MONTHLY_ROI_PERCENTAGE = 5; // 5% monthly
// const MIN_INVESTMENT = 100; // Minimum investment required

// async function distributeROIShares(mode = 'daily') {
//   try {
//     // console.log(`🚀 Starting ${mode.toUpperCase()} ROI Distribution...\n`);
    
//     await mongoose.connect(process.env.DATABASE_URL);
//     // console.log('✅ Database connected\n');

//     const today = new Date();
//     today.setHours(0, 0, 0, 0);
    
//     const currentMonth = today.getMonth();
//     const currentYear = today.getFullYear();
//     const startOfMonth = new Date(currentYear, currentMonth, 1);

//     // Find eligible users
//     const usersWithoutROI = await UserModel.find({
//       'active.isActive': true,
//       'active.isBlocked': false,
//       'active.isRoiBlocked': false,
//       investment: { $gte: MIN_INVESTMENT }
//     }).populate('incomeDetails');

//     // console.log(`📊 Total eligible users: ${usersWithoutROI.length}\n`);

//     let successCount = 0, failCount = 0, skippedCount = 0, totalDistributed = 0;

//     for (const user of usersWithoutROI) {
//       try {
//         // DAILY ROI CHECK
//         if (mode === 'daily') {
//           if (user.todayRoiCollected) {
//             // console.log(`⏭️ ${user.username}: Already collected today`);
//             skippedCount++;
//             continue;
//           }

//           const todayROI = await CommissionIncome.findOne({
//             user: user._id,
//             type: "Trading Profit Income",
//             status: "Completed",
//             createdAt: { $gte: today }
//           });

//           if (todayROI) {
//             // console.log(`⏭️ ${user.username}: ROI record exists for today`);
//             user.todayRoiCollected = true;
//             await user.save();
//             skippedCount++;
//             continue;
//           }
//         }

//         // MONTHLY ROI CHECK
//         if (mode === 'monthly') {
//           const monthlyROI = await CommissionIncome.findOne({
//             user: user._id,
//             type: "Trading Profit Income",
//             status: "Completed",
//             createdAt: { $gte: startOfMonth }
//           });

//           if (monthlyROI) {
//             // console.log(`⏭️ ${user.username}: Already received monthly ROI`);
//             skippedCount++;
//             continue;
//           }
//         }

//         // Calculate ROI
//         const roiPercent = mode === 'daily' ? DAILY_ROI_PERCENTAGE : MONTHLY_ROI_PERCENTAGE;
//         const roiAmount = (user.investment * roiPercent) / 100;

//         // Get or create income
//         let income = user.incomeDetails;
//         if (!income) {
//           income = await IncomeModel.create({ user: user._id });
//           user.incomeDetails = income._id;
//         }

//         // Update wallets
//         income.income.roiWallet = (income.income.roiWallet || 0) + roiAmount;
//         income.income.totalIncome += roiAmount;
//         await income.save();

//         // Create commission record
//         const id = generateCustomId({ prefix: 'BSG-TD', max: 14, min: 14 });
//         await CommissionIncome.create({
//           id,
//           user: user._id,
//           income: roiAmount,
//           percentage: roiPercent,
//           amount: user.investment,
//           type: "Trading Profit Income",
//           status: "Completed"
//         });

//         // Mark as collected (daily only)
//         if (mode === 'daily') {
//           user.todayRoiCollected = true;
//           await user.save();
//         }

//         // Distribute generation ROI
//         await distributeGenerationROI(user._id, roiAmount);

//         successCount++;
//         totalDistributed += roiAmount;
//         // console.log(`✅ ${user.username} | $${user.investment} | ROI: $${roiAmount.toFixed(2)} (${roiPercent}%)`);

//       } catch (error) {
//         failCount++;
//         console.error(`❌ ${user.username}: ${error.message}`);
//       }
//     }

//     // console.log('\n' + '='.repeat(60));
//     // console.log(`📈 ${mode.toUpperCase()} ROI SUMMARY`);
//     // console.log('='.repeat(60));
//     // console.log(`✅ Success: ${successCount} users`);
//     // console.log(`⏭️ Skipped: ${skippedCount} users`);
//     // console.log(`❌ Failed: ${failCount} users`);
//     // console.log(`💰 Total distributed: $${totalDistributed.toFixed(2)}`);
//     if (successCount > 0) {
//       // console.log(`📊 Average per user: $${(totalDistributed / successCount).toFixed(2)}`);
//     }
//     // console.log('='.repeat(60) + '\n');

//     await mongoose.connection.close();
//     // console.log('✅ Completed!\n');

//   } catch (error) {
//     console.error('❌ Error:', error.message);
//     await mongoose.connection.close();
//     process.exit(1);
//   }
// }

// // Get mode from command line args
// const mode = process.argv[2] || 'daily';
// if (!['daily', 'monthly'].includes(mode)) {
//   console.error('❌ Invalid mode. Use: daily or monthly');
//   process.exit(1);
// }

// distributeROIShares(mode);


const dns = require('dns');
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1", "1.0.0.1"]);

const mongoose = require('mongoose');
const { UserModel } = require('../models/user.model');
const { IncomeModel } = require('../models/income.model');
const { CommissionIncome } = require('../models/commission.model');
const { generateCustomId } = require('../utils/generator.uniqueid');
const { distributeGenerationROI } = require('../controllers/roi.controller');
require('dotenv').config();

// ROI Configuration
const DAILY_ROI_PERCENTAGE = 0.1667;
const MONTHLY_ROI_PERCENTAGE = 5;
const MIN_INVESTMENT = 100;
const BATCH_SIZE = 20; // Process 20 users at a time in parallel

async function distributeROIShares(mode = 'daily') {
    try {
        // console.log(`🚀 Starting OPTIMIZED ${mode.toUpperCase()} ROI Distribution...\n`);
        await mongoose.connect(process.env.DATABASE_URL);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        // 1. Fetch all users eligible for ROI
        const users = await UserModel.find({
            'active.isActive': true,
            'active.isBlocked': false,
            'active.isRoiBlocked': false,
            investment: { $gte: MIN_INVESTMENT }
        });

        // 2. Pre-fetch already processed users to avoid individual DB checks
        const alreadyProcessed = await CommissionIncome.find({
            type: "Trading Profit Income",
            status: "Completed",
            createdAt: { $gte: mode === 'daily' ? today : startOfMonth }
        }).distinct('user');

        const eligibleUsers = users.filter(u => !alreadyProcessed.includes(u._id.toString()));
        // console.log(`📊 Eligible: ${eligibleUsers.length} | Skipped: ${alreadyProcessed.length}\n`);

        let successCount = 0, totalDistributed = 0;

        // 3. Process in Parallel Batches
        for (let i = 0; i < eligibleUsers.length; i += BATCH_SIZE) {
            const batch = eligibleUsers.slice(i, i + BATCH_SIZE);
            
            await Promise.all(batch.map(async (user) => {
                try {
                    const roiPercent = mode === 'daily' ? DAILY_ROI_PERCENTAGE : MONTHLY_ROI_PERCENTAGE;
                    const roiAmount = (user.investment * roiPercent) / 100;

                    // Bulk Update Logic: Combine multiple updates into one flow
                    // Update Income Table
                    await IncomeModel.findOneAndUpdate(
                        { user: user._id },
                        { 
                            $inc: { 
                                "income.roiWallet": roiAmount, 
                                "income.totalIncome": roiAmount 
                            } 
                        },
                        { upsert: true }
                    );

                    // Create Commission Record
                    const id = generateCustomId({ prefix: 'BSG-TD', max: 14, min: 14 });
                    await CommissionIncome.create({
                        id,
                        user: user._id,
                        income: roiAmount,
                        percentage: roiPercent,
                        amount: user.investment,
                        type: "Trading Profit Income",
                        status: "Completed"
                    });

                    // Update User Collection
                    if (mode === 'daily') {
                        await UserModel.findByIdAndUpdate(user._id, { todayRoiCollected: true });
                    }

                    // Generation Distribution
                    await distributeGenerationROI(user._id, roiAmount);

                    successCount++;
                    totalDistributed += roiAmount;
                    // console.log(`✅ ${user.username} - Done`);

                } catch (err) {
                    console.error(`❌ Error for ${user.username}: ${err.message}`);
                }
            }));
            
            // console.log(`--- Processed ${Math.min(i + BATCH_SIZE, eligibleUsers.length)} / ${eligibleUsers.length} ---`);
        }

        // console.log(`\n✅ Finished! Distributed $${totalDistributed.toFixed(2)} to ${successCount} users.`);
        await mongoose.connection.close();
    } catch (error) {
        console.error('❌ Global Error:', error);
        process.exit(1);
    }
}

const mode = process.argv[2] || 'daily';
distributeROIShares(mode);