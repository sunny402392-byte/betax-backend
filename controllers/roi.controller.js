
// controllers/roi.controller.js
const { UserModel } = require("../models/user.model");
const ROIHistory = require("../models/roiHistory");
const GenerationROIHistory = require("../models/generation.model")
const { IncomeModel } = require("../models/income.model");
const { CommissionIncome } = require("../models/commission.model");
const { generateCustomId } = require("../utils/generator.uniqueid");
const { getUserPlan } = require("../utils/miningPlans");

// Excluded user IDs - these users and their referrals will not receive referral income
const EXCLUDED_USER_IDS = ['BT70506884', 'BT77210166', 'BT76645644'];


exports.calculateDailyROIForAllUsers = async (req, res) => {
  try {
    const users = await UserModel.find().populate("incomeDetails");

    if (!users || users.length === 0) {
      return res.status(400).json({ success: false, message: "No users found" });
    }

    // Loop through each user and calculate ROI
    for (let user of users) {
      // Skip user if today's ROI is already collected
      if (user.todayRoiCollected) {
        // console.log(`❌ Today's ROI already collected for user ${user.username}.`);
        continue; // Skip this user if ROI is already collected
      }

      // Skip if no matching mining plan
      const plan = getUserPlan(user.investment);
      if (!plan) continue;

      const roiPercent = plan.dailyPercent;
      const finalROI = (user.investment * roiPercent) / 100;

      // Ensure IncomeDetails exists, create if not
      let income = user.incomeDetails;
      if (!income) {
        income = await IncomeModel.create({ user: user._id });
        user.incomeDetails = income._id;
        await user.save();
      }

      // Store ROI in separate ROI wallet (not in currentIncome/main wallet)
      income.income.roiWallet = (income.income.roiWallet || 0) + finalROI;
      income.income.totalIncome += finalROI;
      await income.save();

      // Record ROI History
      await ROIHistory.create({
        user: user._id,
        amount: finalROI,
        roiPercent,
      });

      // Mark today's ROI as collected
      user.todayRoiCollected = true;
      await user.save();

      // console.log(`✅ User ${user.username} got ROI: ₹${finalROI}`);
    }

    // Respond with a success message
    return res.status(200).json({ success: true, message: "ROIs calculated for all users" });
  } catch (err) {
    console.error("❌ ROI Calculation Error for all users:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};





//=====================================SPONSOR INCOME=====================================//

// Distribute 5% Sponsor Income on deposit with 300% capping
// Referral Income Percentages per level
const REFERRAL_PERCENTAGES = { 1: 10, 2: 3, 3: 2, 4: 1, 5: 1 };

exports.distributeSponsorIncome = async (userId, depositAmount) => {
  try {
    // Only on first deposit (investment was 0 before this deposit)
    const user = await UserModel.findById(userId);
    if (!user) return;

    // Check karo ki yeh first deposit hai ya nahi
    // investment field already updated ho chuka hai, isliye depositAmount se check karo
    const previousDeposits = await TransactionModel.countDocuments({
      user: userId,
      type: 'Deposit',
      status: 'Completed'
    });
    // Agar 1 se zyada deposits hain matlab yeh first nahi hai
    if (previousDeposits > 1) return;

    // Minimum $13 check
    if (depositAmount < 13) return;

    let currentUser = user;

    for (let level = 1; level <= 5; level++) {
      if (!currentUser.sponsor) break;

      const sponsor = await UserModel.findById(currentUser.sponsor);
      if (!sponsor) break;
      if (sponsor.active.isBlocked || !sponsor.active.isActive) {
        currentUser = sponsor;
        continue;
      }

      const percent = REFERRAL_PERCENTAGES[level];
      const referralIncome = (depositAmount * percent) / 100;

      // Get or create income details
      let income;
      if (!sponsor.incomeDetails) {
        income = await IncomeModel.create({ user: sponsor._id });
        sponsor.incomeDetails = income._id;
        await sponsor.save();
      } else {
        income = await IncomeModel.findById(sponsor.incomeDetails);
        if (!income) {
          income = await IncomeModel.create({ user: sponsor._id });
          sponsor.incomeDetails = income._id;
          await sponsor.save();
        }
      }

      income.income.currentIncome = (income.income.currentIncome || 0) + referralIncome;
      income.income.totalIncome = (income.income.totalIncome || 0) + referralIncome;
      income.income.sponsorIncomeEarned = (income.income.sponsorIncomeEarned || 0) + referralIncome;
      await income.save();

      // Update withdrawal wallet
      const { CommissionIncome: CI } = require('../models/commission.model');
      const { TransactionModel: TM } = require('../models/transaction.model');
      const incomeAgg = await CI.aggregate([{ $match: { user: sponsor._id } }, { $group: { _id: null, total: { $sum: '$income' } } }]);
      const totalInc = incomeAgg[0]?.total || 0;
      const withdrawAgg = await TM.aggregate([{ $match: { user: sponsor._id, type: 'Withdrawal', status: { $in: ['Pending','Processing','Completed'] } } }, { $group: { _id: null, total: { $sum: '$investment' } } }]);
      const withdrawn = withdrawAgg[0]?.total || 0;
      sponsor.withdrawalInfo = {
        availableWithdrawalAmount: Math.max(0, totalInc - withdrawn),
        withdrawnAmount: withdrawn,
        totalWithdrawableAmount: totalInc,
      };
      sponsor.markModified('withdrawalInfo');
      await sponsor.save();

      const id = generateCustomId({ prefix: 'BT7-REF', max: 14, min: 14 });
      await CommissionIncome.create({
        id,
        user: sponsor._id,
        fromUser: userId,
        income: referralIncome,
        percentage: percent,
        amount: depositAmount,
        level,
        type: "Referral Income",
        status: "Completed"
      });

      currentUser = sponsor;
    }
  } catch (err) {
    console.error("❌ Referral Income Distribution Error:", err.message);
  }
};

//=====================================GENERATION ROI=====================================//

// ✅ Max levels allowed based on direct referrals
function getMaxLevels(directReferrals) {
  if (directReferrals >= 10) return 10;
  return directReferrals;
}

// ✅ Get Level Income percentage (10-level structure)
function getLevelPercent(level) {
  switch (level) {
    case 1: return 10;
    case 2: return 5;
    case 3: return 3;
    case 4: return 2;
    case 5: return 2;
    case 6: return 1;
    case 7: return 1;
    case 8: return 1;
    case 9: return 1;
    case 10: return 1;
    default: return 0;
  }
}

// ✅ Main distribution function
exports.distributeGenerationROI = async (userId, roiAmount) => {
  try {
    let currentUser = await UserModel.findById(userId).populate("sponsor");
    if (!currentUser) return;

    // Skip if the investing user is in excluded list - their ROI won't generate referral income
    if (currentUser.id && EXCLUDED_USER_IDS.includes(currentUser.id)) {
      // console.log(`⏭️ Skipping Generation ROI distribution: User ${currentUser.id} (${currentUser.username}) is excluded from referral income`);
      return;
    }

    let level = 1;

    while (currentUser && level <= 10) {
      const upline = await UserModel.findById(currentUser.sponsor);
      if (!upline) break;
      if (upline.active.isBlocked || !upline.active.isActive) {
        currentUser = upline;
        level++;
        continue;
      }

      // If upline is in excluded list - stop the chain completely
      // Their sponsors won't get Generation ROI from excluded users' ROI
      if (upline.id && EXCLUDED_USER_IDS.includes(upline.id)) {
        // console.log(`⏭️ Stopping Generation ROI chain at excluded upline ${upline.id} (${upline.username}) - no income to their sponsors`);
        break; // Stop the chain completely - don't give income to anyone above excluded user
      }

      // Count direct referrals only (users who have this upline as direct sponsor)
      const directReferrals = await UserModel.countDocuments({ sponsor: upline._id });
      const maxLevels = getMaxLevels(directReferrals);

      if (level <= maxLevels) {
        const percent = getLevelPercent(level);
        if (percent > 0) {
          // ✅ Ensure IncomeDetails exists
          let income = upline.incomeDetails;
          if (!income) {
            income = await IncomeModel.create({ user: upline._id });
            upline.incomeDetails = income._id;
            await upline.save();
          } else {
            income = await IncomeModel.findById(income);
          }

          // Check 300% capping for Level Income
          const maxLevelIncome = upline.investment * 3;
          const currentLevelIncome = income?.income?.levelIncomeEarned || 0;
          
          if (currentLevelIncome >= maxLevelIncome) {
            // console.log(`⏹️ ${upline.username} reached 300% level income cap`);
            currentUser = upline;
            level++;
            continue;
          }

          let genIncome = (roiAmount * percent) / 100;
          
          // Cap at 300%
          if (currentLevelIncome + genIncome > maxLevelIncome) {
            genIncome = maxLevelIncome - currentLevelIncome;
          }

          // ✅ Add Generation ROI (Level Income) to Level Income Wallet (not main wallet)
          income.income.levelIncomeWallet = (income.income.levelIncomeWallet || 0) + genIncome;
          income.income.totalIncome += genIncome;
          income.income.levelIncomeEarned = (income.income.levelIncomeEarned || 0) + genIncome;
          await income.save();


          const id = generateCustomId({ prefix: 'BT7-LVL', max: 14, min: 14 });
          const days = await CommissionIncome.find({ user: upline._id, fromUser: userId, type: "Level Income", status: "Completed" })
          const newLevel = new CommissionIncome({ id, user: upline._id, fromUser: userId, level: level, income: genIncome, percentage: percent * 100, amount: Number(roiAmount), days: Number(days.length + 1), type: "Level Income", status: "Completed" });

          await newLevel.save();

          // console.log(
          //   `User ${upline.username} ko Generation ROI mila $${genIncome.toFixed(
          //     2
          //   )} (Level ${level}, ${percent}%)`
          // );
        }
      }

      // Move up one level
      currentUser = upline;
      level++;
    }
  } catch (err) {
    console.error("❌ Generation ROI Distribution Error:", err.message);
  }
};

