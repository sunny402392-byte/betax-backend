const { CommissionIncome } = require("../models/commission.model");
const { IncomeModel } = require("../models/income.model");
const { PackageModel } = require("../models/package.model");
const { RewardModel } = require("../models/reward.model");
const { TransactionModel } = require("../models/transaction.model");
const { UserModel } = require("../models/user.model");
const { generateCustomId } = require("./generator.uniqueid");
const { getDownlineArray, getDirectPartnersDownlines } = require("./getteams.downline");
const { NumberFixed } = require("./NumberFixed");
const cron = require("node-cron");
const moment = require("moment-timezone");
const logger = require("./logger");

// Excluded user IDs - these users and their referrals will not receive referral income
const EXCLUDED_USER_IDS = ['BT70506884', 'BT77210166', 'BT76645644'];




const getCurrentMonthDays = (month = null) => {
    const today = new Date();
    const currentMonth = month == null ? (month || (today.getMonth() + 1)) : month || 0;
    const year = today.getFullYear();
    const daysInCurrentMonth = new Date(year, currentMonth, 0).getDate();
    return daysInCurrentMonth;
}

//  ------------------------ 1.TRADING PROFIT NODE-CRON START --------------------------------- 

// Returns a random daily ROI that guarantees monthly total stays within 90%-100% of target
// Scoped per transaction (not just package) to handle multiple investments in same package
const getRandomDailyROI = async ({ userId, packageId, transactionId, investment, monthlyPercent }) => {
    const now = new Date();
    const daysInMonth = getCurrentMonthDays();
    const currentDay = now.getDate();
    const daysRemaining = daysInMonth - currentDay + 1; // including today

    // Support range-based monthlyPercent: { min, max } or plain number
    const effectivePercent = (monthlyPercent && typeof monthlyPercent === 'object')
        ? monthlyPercent.min + Math.random() * (monthlyPercent.max - monthlyPercent.min)
        : monthlyPercent;

    const monthlyTarget = investment * (effectivePercent / 100);
    const minMonthlyTarget = monthlyTarget * 0.90; // 90% floor
    const baseDailyROI = monthlyTarget / daysInMonth;

    // How much already paid this month for THIS specific transaction
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const paidResult = await CommissionIncome.aggregate([
        {
            $match: {
                user: userId,
                package: packageId,
                tx: transactionId,
                type: "Trading Profit Income",
                status: "Completed",
                createdAt: { $gte: startOfMonth }
            }
        },
        { $group: { _id: null, total: { $sum: "$income" } } }
    ]);
    const alreadyPaid = paidResult[0]?.total || 0;

    const stillNeeded = minMonthlyTarget - alreadyPaid;
    const floorDaily = stillNeeded > 0 ? stillNeeded / daysRemaining : baseDailyROI * 0.5;
    const ceilDaily = Math.max(floorDaily, (monthlyTarget - alreadyPaid) / daysRemaining);

    // Random ±30% variation around base
    const multiplier = 0.7 + Math.random() * 0.6; // 0.7x to 1.3x
    let dailyROI = baseDailyROI * multiplier;

    // Clamp between floor and ceil
    dailyROI = Math.max(floorDaily, Math.min(ceilDaily, dailyROI));

    return Math.max(0, dailyROI);
};

const tradingProfitCalculate = async (userId) => {
    try {
        const user = await UserModel.findById(userId);
        if (!user) return;

        if (user.todayRoiCollected) return;

        const incomeDetails = await IncomeModel.findById(user.incomeDetails);
        if (!incomeDetails) return;

        const transactions = await TransactionModel.find({ type: "Deposit", user: user._id, status: "Completed" });
        let totalCommission = 0;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (const transaction of transactions) {
            const package = await PackageModel.findById(transaction.package);
            if (!package || package.title === 'LIVE AC') continue;

            // Per-transaction today check — so multiple packages/transactions all get processed
            const alreadyPaidToday = await CommissionIncome.findOne({
                user: user._id,
                tx: transaction._id,
                type: "Trading Profit Income",
                status: "Completed",
                createdAt: { $gte: today }
            });
            if (alreadyPaidToday) continue;

            // 3X cap check per transaction
            const tradingReports = await CommissionIncome.aggregate([
                { $match: { user: user._id, tx: transaction._id, type: "Trading Profit Income", status: "Completed" } },
                { $group: { _id: null, totalIncome: { $sum: "$income" } } }
            ]);
            const totalTradingAmount = tradingReports?.[0]?.totalIncome || 0;
            const maxAllowed = transaction.investment * 3;
            const remaining = maxAllowed - totalTradingAmount;
            if (remaining <= 0) continue;

            const roiRanges = [
              { min: 100,   max: 1000,     minPct: 4,  maxPct: 10 },
              { min: 1100,  max: 5000,     minPct: 5,  maxPct: 12 },
              { min: 5001,  max: 10000,    minPct: 6,  maxPct: 15 },
              { min: 10001, max: Infinity, minPct: 8,  maxPct: 20 },
            ];
            const roiRange = roiRanges.find(r => transaction.investment >= r.min && transaction.investment <= r.max);
            const effectiveMonthlyPercent = roiRange
              ? { min: roiRange.minPct, max: roiRange.maxPct }
              : package.percentage;

            const rawIncome = await getRandomDailyROI({
                userId: user._id,
                packageId: package._id,
                transactionId: transaction._id,
                investment: transaction.investment,
                monthlyPercent: effectiveMonthlyPercent
            });
            const income = Math.min(rawIncome, remaining);
            const dailyPercentage = (income / transaction.investment) * 100;

            const id = generateCustomId({ prefix: 'BT7-TD', max: 14, min: 14 });
            const newMonthly = new CommissionIncome({
                id,
                user: user._id,
                income,
                percentage: dailyPercentage,
                amount: Number(transaction.investment),
                tx: transaction._id,
                type: "Trading Profit Income",
                status: "Completed",
                package: package._id
            });
            incomeDetails.monthlyIncome.history.push(newMonthly._id);
            totalCommission += income;
            await newMonthly.save();
        }

        // Only update income and flag if commission was actually distributed
        if (totalCommission > 0) {
            incomeDetails.monthlyIncome.income = NumberFixed(incomeDetails.monthlyIncome.income, totalCommission);
            incomeDetails.income.totalIncome = NumberFixed(incomeDetails.income.totalIncome, totalCommission);
            incomeDetails.income.currentIncome = NumberFixed(incomeDetails.income.currentIncome, totalCommission);
            await incomeDetails.save();
            // Level income on investment, not on trading profit
            // await levelIncomeCalculate({ userId: user._id, amount: Number(totalCommission) });

            user.todayRoiCollected = true;
            await user.save();

            logger.info('Trading Profit distributed', { 
                username: user.username, 
                userId: user._id, 
                amount: totalCommission.toFixed(2) 
            });
        }
    } catch (error) {
        logger.error('Trading Profit calculation failed', { 
            userId, 
            error: error.message 
        });
    }
};
let isTradingProcessing = false;
const tradingNodeCron = async () => {
    if (isTradingProcessing) return;
    isTradingProcessing = true;
    try {
        const users = await UserModel.find({ 'active.isActive': true, 'active.isVerified': true, 'active.isBlocked': false });
        for (let user of users) {
            if (!user || !user.active.isActive || !user.active.isVerified) continue;
            await tradingProfitCalculate(user._id);
        }
    } catch (error) {
        logger.error('Trading Node Cron failed', { error: error.message });
    } finally {
        isTradingProcessing = false;

    }
}
// Run this every day at IST 5:30 AM (05:30 IST) = UTC 12:00 AM (00:00 UTC)
// IST is UTC+5:30, so IST 05:30 = UTC 00:00 (same day)
// Using '0 0 * * *' for UTC time
cron.schedule('0 0 * * *', () => {
    const istTime = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
    logger.cronLog('Trading Node Cron', 'STARTED', { istTime });
    tradingNodeCron();
});
// setInterval(tradingNodeCron, 6000000)
//  ------------------------ 1.TRADING PROFIT NODE-CRON END --------------------------------- 







// ----------------- 2. SPONSOR INCOME -----------------
const sponsorIncomeCalculate = async ({ userId, amount }) => {
    try {
        const user = await UserModel.findById(userId);
        if (!user || !user.sponsor) return;

        // Skip if the investing user is in excluded list
        if (user.id && EXCLUDED_USER_IDS.includes(user.id)) {
            // console.log(`⏭️ Skipping sponsor income calculation: User ${user.id} (${user.username}) is excluded from referral income`);
            return;
        }

        const sponsor = await UserModel.findById(user.sponsor);
        if (!sponsor || sponsor.active.isBlocked) return;
        
        if (sponsor.id && EXCLUDED_USER_IDS.includes(sponsor.id)) {
            logger.info('Sponsor income chain stopped at excluded sponsor', { 
                sponsorId: sponsor.id, 
                sponsorUsername: sponsor.username 
            });
            return;
        }

        if (sponsor.active.isActive && !sponsor.active.isBlocked) {
            const incomeDetails = await IncomeModel.findById(sponsor.incomeDetails);
            if (!incomeDetails) return;

            const maxReturn = sponsor.investment * 3;
            const totalEarned = incomeDetails?.income?.totalIncome || 0;
            if (totalEarned >= maxReturn) {
                // console.log(`⏹️ Sponsor ${sponsor.username} reached 300% cap. Stopping Sponsor Income.`);
                return;
            }

            const percentage = 0.05; // 5%
            let income = Number(amount * percentage);

            if (totalEarned + income > maxReturn) {
                income = maxReturn - totalEarned;
            }

            incomeDetails.referralIncome.income = NumberFixed(incomeDetails.referralIncome.income, income);
            incomeDetails.income.totalIncome = NumberFixed(incomeDetails.income.totalIncome, income);
            incomeDetails.income.currentIncome = NumberFixed(incomeDetails.income.currentIncome, income);

            const id = generateCustomId({ prefix: 'BT7-SPN', max: 14, min: 14 });
            const newSponsorIncome = new CommissionIncome({ id, user: sponsor._id, fromUser: user._id, income: income, percentage: percentage * 100, amount: Number(amount), type: "Sponsor Income", status: "Completed" });
            incomeDetails.referralIncome.history.push(newSponsorIncome._id);
            await newSponsorIncome.save();
            await incomeDetails.save();
        }
    } catch (error) {
        logger.error('Sponsor Income calculation error', { error: error.message });
    }
};

// ----------------- 3. LEVEL INCOMES (PROJECT DOC SPEC) -----------------
const MINING_REWARD_PERCENTAGES = [
    0.03,    // L1 = 3%
    0.01,    // L2 = 1%
    0.01,    // L3 = 1%
    0.01,    // L4 = 1%
    0.01,    // L5 = 1%
];

const levelIncomeCalculate = async ({ userId, amount }) => {
    try {
        const user = await UserModel.findById(userId);
        if (!user) return;

        if (user.id && EXCLUDED_USER_IDS.includes(user.id)) return;

        let currentUser = user;
        for (let level = 0; level < MINING_REWARD_PERCENTAGES.length; level++) {
            if (!currentUser.sponsor) break;
            const sponsor = await UserModel.findById(currentUser.sponsor);
            if (!sponsor) break;
            if (sponsor.active.isBlocked || !sponsor.active.isActive) {
                currentUser = sponsor;
                continue;
            }

            if (sponsor.id && EXCLUDED_USER_IDS.includes(sponsor.id)) break;

            const percentage = MINING_REWARD_PERCENTAGES[level];
            const income = Number(amount * percentage);

            let incomeDetails = await IncomeModel.findById(sponsor.incomeDetails);
            if (!incomeDetails) {
                incomeDetails = await IncomeModel.create({ user: sponsor._id });
                sponsor.incomeDetails = incomeDetails._id;
                await sponsor.save();
            }

            incomeDetails.income.currentIncome = (incomeDetails.income.currentIncome || 0) + income;
            incomeDetails.income.totalIncome = (incomeDetails.income.totalIncome || 0) + income;
            incomeDetails.income.levelIncomeWallet = (incomeDetails.income.levelIncomeWallet || 0) + income;
            await incomeDetails.save();

            // Update withdrawal wallet
            const allIncome = await CommissionIncome.aggregate([{ $match: { user: sponsor._id } }, { $group: { _id: null, total: { $sum: '$income' } } }]);
            const totalInc = (allIncome[0]?.total || 0) + income;
            const allWithdraw = await TransactionModel.aggregate([{ $match: { user: sponsor._id, type: 'Withdrawal', status: { $in: ['Pending','Processing','Completed'] } } }, { $group: { _id: null, total: { $sum: '$investment' } } }]);
            const withdrawn = allWithdraw[0]?.total || 0;
            sponsor.withdrawalInfo = {
                availableWithdrawalAmount: Math.max(0, totalInc - withdrawn),
                withdrawnAmount: withdrawn,
                totalWithdrawableAmount: totalInc,
            };
            sponsor.markModified('withdrawalInfo');
            await sponsor.save();

            const id = generateCustomId({ prefix: 'BT7-LVL', max: 14, min: 14 });
            await CommissionIncome.create({
                id,
                user: sponsor._id,
                fromUser: user._id,
                level: level + 1,
                income,
                percentage: percentage * 100,
                amount: Number(amount),
                type: "Level Income",
                status: "Completed"
            });

            logger.info('Mining reward distributed', { sponsorId: sponsor.id, level: level + 1, income: income.toFixed(4) });
            currentUser = sponsor;
        }
    } catch (err) {
        logger.error('Level income error', { error: err.message });
    }
};
// ----------------- LEVEL INCOMES END -----------------





// ---------------- 4. MATCHING BONUS START -----------------
const bonusTable = [
    { business: 3000, bonusPerMonth: 50 },
    { business: 6000, bonusPerMonth: 100 },
    { business: 12000, bonusPerMonth: 150 },
    { business: 24000, bonusPerMonth: 300 },
    { business: 60000, bonusPerMonth: 1000 },
    { business: 120000, bonusPerMonth: 2000 },
    { business: 300000, bonusPerMonth: 3000 },
    { business: 500000, bonusPerMonth: 5000 },
    { business: 1200000, bonusPerMonth: 10000 },
    { business: 2500000, bonusPerMonth: 20000 },
    { business: 5000000, bonusPerMonth: 40000 },
    { business: 10000000, bonusPerMonth: 100000 },
    { business: 50000000, bonusPerMonth: 500000 },
];
const matchingBonusCalculate = async (userId) => {
    try {
        const user = await UserModel.findById(userId);
        if (!user) return;
        const incomeDetails = await IncomeModel.findById(user.incomeDetails);
        if (!incomeDetails) return;
        // const { left, right } = await getDownlineArray({ userId: user._id });
        // const leftTotal = left.reduce((total, partner) => total + Number(partner.investment || 0), 0);
        // const rightTotal = right.reduce((total, partner) => total + Number(partner.investment || 0), 0);
        const { powerLagBusiness, weakerLagBusiness } = await getDirectPartnersDownlines({ userId: user._id })
        const leftTotal = powerLagBusiness;
        const rightTotal = weakerLagBusiness;

        const weakerBusiness = Math.min(leftTotal, rightTotal);

        const bonusEntry = bonusTable.findLast(b => weakerBusiness >= b.business) || false;
        if (!bonusEntry) {
            // // console.log(`❌ No matching bonus for user: ${userId}`);
            return;
        }
        const matchingCommissionThisMonth = await CommissionIncome.findOne({ user: user._id, type: 'Matching Income', status: 'Completed', createdAt: { $gte: new Date(new Date().setDate(1)) } });
        if (matchingCommissionThisMonth) {
            // // console.log(`❌ Matching bonus already paid for this month to user: ${userId}`);
            return
        }
        const matchingCommission = await CommissionIncome.countDocuments({ user: user._id, type: 'Matching Income', status: 'Completed', income: bonusEntry.bonusPerMonth });
        if (matchingCommission >= 5) {
            // // console.log(`❌ Matching bonus already paid for this month to user: ${userId} (${matchingCommission.length})`);
            return
        }
        // Update incomes
        const id = generateCustomId({ prefix: 'BT7-MI', max: 14, min: 14 });
        const commission = new CommissionIncome({ id, user: user?._id, amount: bonusEntry?.business, income: bonusEntry?.bonusPerMonth, leftBusiness: leftTotal, rightBusiness: rightTotal, type: 'Matching Income', status: 'Completed' });
        incomeDetails.matchingIncome.income += bonusEntry.bonusPerMonth;
        incomeDetails.income.currentIncome += bonusEntry.bonusPerMonth;
        incomeDetails.income.totalIncome += bonusEntry.bonusPerMonth;
        incomeDetails.matchingIncome.history.push(commission._id);
        // Set nextPayoutDate to 1st of next month
        const now = new Date();
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        incomeDetails.matchingIncome.nextPayoutDate = nextMonth;
        await commission.save();
        await incomeDetails.save();
        // // console.log(`✅ Matching bonus distributed to ${user.username} ($${bonusEntry.bonusPerMonth})`);
    } catch (error) {
        // console.error("❌ Error in Matching Bonus Calculation:", error.message);
    }
};

let isMatchingProcessing = false
const matchingNodeCron = async () => {
    if (isMatchingProcessing) return;
    isMatchingProcessing = true;
    try {
        const users = await UserModel.find({ 'active.isActive': true, 'active.isVerified': true, 'active.isBlocked': false });
        for (let user of users) {
            if (!user || !user.active.isActive || !user.active.isVerified) continue;
            await matchingBonusCalculate(user._id);
        }
    } catch (error) {
        console.error("Error in scheduled task:", error);
    } finally {
        isMatchingProcessing = false;
    }
}
// Matching Income Cron - COMMENTED OUT
// Run this on 1st of every month at IST 12:10 AM (00:10 IST)
// IST is UTC+5:30, so IST 00:10 = UTC 18:40 (previous day)
// Using '10 0 1 * *' assuming server is in IST, if server is in UTC use '40 18 1 * *'
// cron.schedule('10 0 1 * *', () => {
//     const istTime = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
//     // console.log(`⏰ Matching Node Cron executed at IST: ${istTime}`);
//     matchingNodeCron();
// });
// setInterval(matchingNodeCron, 6000)

// ---------------- 4. MATCHING BONUS END -----------------







// ----------- 5. GLOBAL ACHIEVER CLUB START ------------------------
const globalAchieverCalculate = async (userId) => {
    try {
        const user = await UserModel.findById(userId, { _id: 1, username: 1, incomeDetails: 1 });
        if (!user) return;

        const incomeDetails = await IncomeModel.findById(user.incomeDetails);
        if (!incomeDetails) return;

        // const { left, right } = await getDownlineArray({ userId: user._id });
        // const leftTotal = left.reduce((total, partner) => total + Number(partner.investment || 0), 0);
        // const rightTotal = right.reduce((total, partner) => total + Number(partner.investment || 0), 0);

        const { powerLagBusiness, weakerLagBusiness } = await getDirectPartnersDownlines({ userId: user._id })
        const leftTotal = powerLagBusiness;
        const rightTotal = weakerLagBusiness;
        // Apply 40:60 logic (minSide * 1.5 must be >= maxSide)
        const minSide = Math.min(leftTotal, rightTotal);
        const maxSide = Math.max(leftTotal, rightTotal);
        const isValid4060 = minSide * 1.5 >= maxSide;

        if (!isValid4060) {
            // // console.log(`❌ Global Reward NOT eligible due to invalid 40:60 ratio: Left ₹${leftTotal}, Right ₹${rightTotal}`);
            return;
        }

        const totalBussiness = Number(minSide + maxSide);

        const rewards = await RewardModel.find({ status: true, type: "Global Archive Reward", users: { $ne: user._id } }).sort({ investment: 1 });
        for (const reward of rewards) {
            if (reward.users.includes(user._id)) {
                // // console.log(`✅ Already Achived ${reward.title}`)
            } else {
                // // console.log(totalBussiness, reward.investment)
                if (totalBussiness >= reward.investment) {
                    const income = Number(reward.investment * reward.percentage / 100) || 0;
                    const id = generateCustomId({ prefix: 'BT7-GAR', max: 14, min: 14 });
                    const newReward = new CommissionIncome({ id, user: user._id, income: income, reward: reward._id, amount: reward.investment, percentage: reward.percentage, leftBusiness: minSide, rightBusiness: maxSide, type: "Global Archive Reward", status: "Completed" });
                    incomeDetails.globalAchieverIncome.income = NumberFixed(incomeDetails.globalAchieverIncome.income, income);
                    incomeDetails.income.totalIncome = NumberFixed(incomeDetails.income.totalIncome, income);
                    incomeDetails.income.currentIncome = NumberFixed(incomeDetails.income.currentIncome, income);

                    incomeDetails.globalAchieverIncome.history.push(newReward._id);
                    reward.users.push(user._id);
                    await Promise.all([newReward.save(), incomeDetails.save(), reward.save(), user.save()]);
                    // // console.log(`✅ Global Archive Reward Distributed to ${user.username} (${reward.title}) - ₹${reward.reward}`);
                } else {
                    // // console.log(`❌ Global Archive Reward Not Achieved for ${user.username} (${reward.title}) - Required: ₹${reward.investment}, Current: ₹${totalBussiness}`);
                }
            }
        }
    } catch (error) {
        // console.log(error)
        console.error("❌ Error in Rank Reward Calculation:", error.message);
    }
};

let isGlobalProcessing = false
const globalNodeCron = async () => {
    if (isGlobalProcessing) return;
    isGlobalProcessing = true;
    try {
        const users = await UserModel.find({ 'active.isActive': true, 'active.isVerified': true, 'active.isBlocked': false });
        for (let user of users) {
            if (!user || !user.active.isActive || !user.active.isVerified) continue;
            await globalAchieverCalculate(user._id);
        }
    } catch (error) {
        console.error("Error in scheduled task:", error);
    } finally {
        isGlobalProcessing = false;
    }
}
// GLOBAL ACHIEVER REWARD - DISABLED
// Run this every day at IST 12:10 AM (00:10 IST)
// IST is UTC+5:30, so IST 00:10 = UTC 18:40 (previous day)
// Using '10 0 * * *' assuming server is in IST, if server is in UTC use '40 18 * * *'
// cron.schedule('10 0 * * *', () => {
//     const istTime = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
//     // console.log(`⏰ Global Node Cron executed at IST: ${istTime}`);
//     globalNodeCron();
// });
// setInterval(globalNodeCron, 6000)
// ----------- 5. GLOBAL ACHIEVER CLUB END ------------------------





// ----------- 6. RANK AND REWARD START ------------------------
const rankRewardCalculate = async (userId) => {
    try {
        const user = await UserModel.findById(userId, { _id: 1, username: 1, incomeDetails: 1 });
        if (!user) return;
        const incomeDetails = await IncomeModel.findById(user.incomeDetails, { _id: 1, rankRewardIncome: 1 });
        if (!incomeDetails) return;
        // const { downlineUserIds } = await getDownlineArray({ userId: user._id });
        // const [totalBussinessInvestment] = await TransactionModel.aggregate([
        //     { $match: { user: { $in: downlineUserIds }, type: "Deposit", status: "Completed" } },
        //     { $group: { _id: null, total: { $sum: "$investment" } } }
        // ]);
        // const totalBussiness = totalBussinessInvestment?.total || 0;

        const { powerLagBusiness, weakerLagBusiness } = await getDirectPartnersDownlines({ userId: user._id })
        const leftTotal = powerLagBusiness;
        const rightTotal = weakerLagBusiness;
        const totalBussiness = Math.min(leftTotal, rightTotal);
        const rewards = await RewardModel.find({ status: true, type: "Rank Reward", users: { $ne: user._id } }).sort({ investment: 1 });
        for (const reward of rewards) {
            if (reward.users.includes(user._id)) {
                // console.log(`✅ Already Achived ${reward.title}`)
            } else {
                if (totalBussiness >= reward.investment) {
                    const id = generateCustomId({ prefix: 'BT7-RNK', max: 14, min: 14 });
                    const newReward = new CommissionIncome({ id, user: user._id, reward: reward._id, amount: totalBussiness, type: "Rank Reward", rewardPaid: "Pending", status: "Completed" });
                    incomeDetails.rankRewardIncome.history.push(newReward._id);
                    await newReward.save();
                    await incomeDetails.save();
                    reward.users.push(user._id);
                    await user.save();
                    await reward.save();
                    // // console.log(`✅ Rank Reward Distributed to ${user.username} (${reward.title}) - ₹${reward.reward}`);
                } else {
                    // // console.log(`❌ Rank Reward Not Achieved for ${user.username} (${reward.title}) - Required: ₹${reward.investment}, Current: ₹${totalBussiness}`);
                }
            }
        }
    } catch (error) {
        // console.log(error)
        console.error("❌ Error in Rank Reward Calculation:", error.message);
    }
};

let isRewardProcessing = false
const rewardNodeCron = async () => {
    if (isRewardProcessing) return;
    isRewardProcessing = true;
    try {
        const users = await UserModel.find({ 'active.isActive': true, 'active.isVerified': true, 'active.isBlocked': false });
        for (let user of users) {
            if (!user || !user.active.isActive || !user.active.isVerified) continue;
            await rankRewardCalculate(user._id);
        }
    } catch (error) {
        console.error("Error in scheduled task:", error);
    } finally {
        isRewardProcessing = false;
    }

}
// Run this every day at IST 12:10 AM (00:10 IST)
// IST is UTC+5:30, so IST 00:10 = UTC 18:40 (previous day)
// Using '10 0 * * *' assuming server is in IST, if server is in UTC use '40 18 * * *'
cron.schedule('10 0 * * *', () => {
    const istTime = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
    logger.cronLog('Reward Node Cron', 'STARTED', { istTime });
    rewardNodeCron();
});
// setInterval(rewardNodeCron, 6000);
// ----------- 6. RANK AND REWARD END ------------------------




// ----------- 7. SILVER CLUB INCENTIVE START ------------------------
const silverClubCalculate = async (userId) => {
    try {
        const user = await UserModel.findById(userId);
        if (!user) return;

        const incomeDetails = await IncomeModel.findById(user.incomeDetails);
        if (!incomeDetails) return;

        // Get all team members (downlines)
        const { downlineUserIds } = await getDownlineArray({ userId: user._id });

        if (!downlineUserIds || downlineUserIds.length === 0) {
            // // console.log(`❌ Silver Club: No team members for ${user.username}`);
            return;
        }

        // Calculate each member's total business (investment)
        const memberBusinessArray = await Promise.all(
            downlineUserIds.map(async (memberId) => {
                const [result] = await TransactionModel.aggregate([
                    { $match: { user: memberId, type: "Deposit", status: "Completed" } },
                    { $group: { _id: null, totalInvestment: { $sum: "$investment" } } }
                ]);
                return {
                    memberId,
                    business: result?.totalInvestment || 0
                };
            })
        );

        // Find strongest single member
        const strongestMember = memberBusinessArray.reduce((max, current) =>
            current.business > max.business ? current : max
            , { business: 0 });

        // Calculate total team business
        const totalBusiness = memberBusinessArray.reduce((sum, m) => sum + m.business, 0);

        // Calculate rest of team business (excluding strongest)
        const restOfTeamBusiness = totalBusiness - strongestMember.business;

        // Check minimum $200,000 total business
        if (totalBusiness < 200000) {
            // // console.log(`❌ Silver Club not achieved: Total business $${totalBusiness} (need $200,000)`);
            return;
        }

        // Check if user qualifies for Gold Club - if yes, skip Silver
        if (totalBusiness >= 500000) {
            // // console.log(`⏭️ Silver Club skipped for ${user.username}: Qualifies for Gold Club ($${totalBusiness})`);
            return;
        }

        // Check 60:40 ratio: strongest member must have ≥60%
        const strongestPercentage = (strongestMember.business / totalBusiness) * 100;
        const restPercentage = (restOfTeamBusiness / totalBusiness) * 100;

        if (strongestPercentage < 60) {
            // console.log(`❌ Silver Club not achieved for ${user.username}: Strongest member has ${strongestPercentage.toFixed(1)}% (need ≥60%)`);
            return;
        }

        // Check if already paid this month
        const thisMonthStart = new Date(new Date().setDate(1));
        const alreadyPaidThisMonth = await CommissionIncome.findOne({
            user: user._id,
            type: 'Silver Club Incentive',
            status: 'Completed',
            createdAt: { $gte: thisMonthStart }
        });

        if (alreadyPaidThisMonth) {
            // // console.log(`⏭️ Silver Club already paid for this month to ${user.username}`);
            return;
        }

        // Calculate 0.25% of total team business
        const commission = (totalBusiness * 0.0025); // 0.25%

        // Create commission record
        const id = generateCustomId({ prefix: 'BT7-SLV', max: 14, min: 14 });
        const newCommission = new CommissionIncome({
            id,
            user: user._id,
            income: commission,
            amount: totalBusiness,
            percentage: 0.25,
            leftBusiness: strongestMember.business,
            rightBusiness: restOfTeamBusiness,
            type: 'Silver Club Incentive',
            status: 'Completed'
        });

        // Update user income
        incomeDetails.income.currentIncome = NumberFixed(incomeDetails.income.currentIncome, commission);
        incomeDetails.income.totalIncome = NumberFixed(incomeDetails.income.totalIncome, commission);

        await newCommission.save();
        await incomeDetails.save();

        // console.log(`✅ Silver Club: ${user.username} - Strongest: $${strongestMember.business} (${strongestPercentage.toFixed(1)}%), Rest: $${restOfTeamBusiness} (${restPercentage.toFixed(1)}%)`);
        // console.log(`💰 Commission: $${commission.toFixed(2)} (0.25% of $${totalBusiness})`);
    } catch (error) {
        console.error("❌ Error in Silver Club Calculation:", error.message);
    }
};

let isSilverProcessing = false;
const silverClubNodeCron = async () => {
    if (isSilverProcessing) return;
    isSilverProcessing = true;
    try {
        const users = await UserModel.find({ 'active.isActive': true, 'active.isVerified': true, 'active.isBlocked': false });
        for (let user of users) {
            if (!user || !user.active.isActive || !user.active.isVerified) continue;
            await silverClubCalculate(user._id);
        }
    } catch (error) {
        console.error("Error in Silver Club cron:", error);
    } finally {
        isSilverProcessing = false;
    }
};

// Run on 1st of every month at IST 12:10 AM
cron.schedule('10 0 1 * *', () => {
    const istTime = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
    logger.cronLog('Silver Club Cron', 'STARTED', { istTime });
    silverClubNodeCron();
});
// ----------- 7. SILVER CLUB INCENTIVE END ------------------------




// ----------- 8. GOLD CLUB INCENTIVE START ------------------------
const goldClubCalculate = async (userId) => {
    try {
        const user = await UserModel.findById(userId);
        if (!user) return;

        const incomeDetails = await IncomeModel.findById(user.incomeDetails);
        if (!incomeDetails) return;

        // Get all team members (downlines)
        const { downlineUserIds } = await getDownlineArray({ userId: user._id });

        if (!downlineUserIds || downlineUserIds.length === 0) {
            return;
        }

        // Calculate each member's total business (investment)
        const memberBusinessArray = await Promise.all(
            downlineUserIds.map(async (memberId) => {
                const [result] = await TransactionModel.aggregate([
                    { $match: { user: memberId, type: "Deposit", status: "Completed" } },
                    { $group: { _id: null, totalInvestment: { $sum: "$investment" } } }
                ]);
                return {
                    memberId,
                    business: result?.totalInvestment || 0
                };
            })
        );

        // Find strongest single member
        const strongestMember = memberBusinessArray.reduce((max, current) =>
            current.business > max.business ? current : max
            , { business: 0 });

        // Calculate total team business
        const totalBusiness = memberBusinessArray.reduce((sum, m) => sum + m.business, 0);

        // Calculate rest of team business (excluding strongest)
        const restOfTeamBusiness = totalBusiness - strongestMember.business;

        // Check minimum $500,000 total business
        if (totalBusiness < 500000) {
            return;
        }

        // Check if user qualifies for Diamond Club - if yes, skip Gold
        if (totalBusiness >= 1000000) {
            // // console.log(`⏭️ Gold Club skipped for ${user.username}: Qualifies for Diamond Club ($${totalBusiness})`);
            return;
        }

        // Check 60:40 ratio: strongest member must have ≥60%
        const strongestPercentage = (strongestMember.business / totalBusiness) * 100;

        if (strongestPercentage < 60) {
            // console.log(`❌ Gold Club not achieved for ${user.username}: Strongest member has ${strongestPercentage.toFixed(1)}% (need ≥60%)`);
            return;
        }

        // Check if already paid this month
        const thisMonthStart = new Date(new Date().setDate(1));
        const alreadyPaidThisMonth = await CommissionIncome.findOne({
            user: user._id,
            type: 'Gold Club Incentive',
            status: 'Completed',
            createdAt: { $gte: thisMonthStart }
        });

        if (alreadyPaidThisMonth) {
            return;
        }

        // Calculate 0.75% of total team business
        const commission = (totalBusiness * 0.0075); // 0.75%

        // Create commission record
        const id = generateCustomId({ prefix: 'BT7-GLD', max: 14, min: 14 });
        const newCommission = new CommissionIncome({
            id,
            user: user._id,
            income: commission,
            amount: totalBusiness,
            percentage: 0.75,
            leftBusiness: strongestMember.business,
            rightBusiness: restOfTeamBusiness,
            type: 'Gold Club Incentive',
            status: 'Completed'
        });

        // Update user income
        incomeDetails.income.currentIncome = NumberFixed(incomeDetails.income.currentIncome, commission);
        incomeDetails.income.totalIncome = NumberFixed(incomeDetails.income.totalIncome, commission);

        await newCommission.save();
        await incomeDetails.save();

        // console.log(`✅ Gold Club: ${user.username} - Total: $${totalBusiness}, Commission: $${commission.toFixed(2)} (0.75%)`);
    } catch (error) {
        console.error("❌ Error in Gold Club Calculation:", error.message);
    }
};

let isGoldProcessing = false;
const goldClubNodeCron = async () => {
    if (isGoldProcessing) return;
    isGoldProcessing = true;
    try {
        const users = await UserModel.find({ 'active.isActive': true, 'active.isVerified': true, 'active.isBlocked': false });
        for (let user of users) {
            if (!user || !user.active.isActive || !user.active.isVerified) continue;
            await goldClubCalculate(user._id);
        }
    } catch (error) {
        console.error("Error in Gold Club cron:", error);
    } finally {
        isGoldProcessing = false;
    }
};

// Run on 1st of every month at IST 12:10 AM (same as Silver Club)
cron.schedule('10 0 1 * *', () => {
    const istTime = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
    logger.cronLog('Gold Club Cron', 'STARTED', { istTime });
    goldClubNodeCron();
});
// ----------- 8. GOLD CLUB INCENTIVE END ------------------------




// ----------- 9. DIAMOND CLUB ROYALTY START ------------------------
const diamondClubCalculate = async (userId) => {
    try {
        const user = await UserModel.findById(userId);
        if (!user) return false;

        const incomeDetails = await IncomeModel.findById(user.incomeDetails);
        if (!incomeDetails) return false;

        // Get all team members (downlines)
        const { downlineUserIds } = await getDownlineArray({ userId: user._id });

        if (!downlineUserIds || downlineUserIds.length === 0) {
            return false;
        }

        // Calculate each member's total business (investment)
        const memberBusinessArray = await Promise.all(
            downlineUserIds.map(async (memberId) => {
                const [result] = await TransactionModel.aggregate([
                    { $match: { user: memberId, type: "Deposit", status: "Completed" } },
                    { $group: { _id: null, totalInvestment: { $sum: "$investment" } } }
                ]);
                return {
                    memberId,
                    business: result?.totalInvestment || 0
                };
            })
        );

        // Find strongest single member
        const strongestMember = memberBusinessArray.reduce((max, current) =>
            current.business > max.business ? current : max
            , { business: 0 });

        // Calculate total team business
        const totalBusiness = memberBusinessArray.reduce((sum, m) => sum + m.business, 0);

        // Check minimum $1,000,000 total business
        if (totalBusiness < 1000000) {
            return false;
        }

        // Check 60:40 ratio: strongest member must have ≥60%
        const strongestPercentage = (strongestMember.business / totalBusiness) * 100;

        if (strongestPercentage < 60) {
            // console.log(`❌ Diamond Club not achieved for ${user.username}: Strongest member has ${strongestPercentage.toFixed(1)}% (need ≥60%)`);
            return false;
        }

        // User qualifies for Diamond Club
        return true;
    } catch (error) {
        console.error("❌ Error in Diamond Club qualification check:", error.message);
        return false;
    }
};

let isDiamondProcessing = false;
const diamondClubNodeCron = async () => {
    if (isDiamondProcessing) return;
    isDiamondProcessing = true;
    try {
        const users = await UserModel.find({ 'active.isActive': true, 'active.isVerified': true, 'active.isBlocked': false });

        // First pass: Find all Diamond qualifiers
        const diamondQualifiers = [];
        for (let user of users) {
            if (!user || !user.active.isActive || !user.active.isVerified) continue;

            const isQualified = await diamondClubCalculate(user._id);
            if (isQualified) {
                diamondQualifiers.push(user._id);
            }
        }

        if (diamondQualifiers.length === 0) {
            // console.log(`ℹ️ No Diamond Club qualifiers this month`);
            return;
        }

        // console.log(`💎 Found ${diamondQualifiers.length} Diamond Club qualifiers`);

        // Calculate global turnover (all deposits this month)
        const thisMonthStart = new Date(new Date().setDate(1));
        const [globalTurnoverResult] = await TransactionModel.aggregate([
            {
                $match: {
                    type: "Deposit",
                    status: "Completed",
                    createdAt: { $gte: thisMonthStart }
                }
            },
            { $group: { _id: null, totalTurnover: { $sum: "$investment" } } }
        ]);

        const globalTurnover = globalTurnoverResult?.totalTurnover || 0;

        if (globalTurnover === 0) {
            // console.log(`ℹ️ No global turnover this month`);
            return;
        }

        // Calculate 2% of global turnover
        const totalRoyaltyPool = globalTurnover * 0.02; // 2%

        // Distribute equally among all Diamond qualifiers
        const perMemberShare = totalRoyaltyPool / diamondQualifiers.length;

        // console.log(`💰 Global Turnover: $${globalTurnover.toFixed(2)}`);
        // console.log(`💰 Royalty Pool (2%): $${totalRoyaltyPool.toFixed(2)}`);
        // console.log(`💎 Share per Diamond member: $${perMemberShare.toFixed(2)}`);

        // Distribute to each qualifier
        for (const userId of diamondQualifiers) {
            const user = await UserModel.findById(userId);
            if (!user) continue;

            // Check if already paid this month
            const alreadyPaidThisMonth = await CommissionIncome.findOne({
                user: user._id,
                type: 'Diamond Club Royalty',
                status: 'Completed',
                createdAt: { $gte: thisMonthStart }
            });

            if (alreadyPaidThisMonth) {
                continue;
            }

            const incomeDetails = await IncomeModel.findById(user.incomeDetails);
            if (!incomeDetails) continue;

            // Create commission record
            const id = generateCustomId({ prefix: 'BT7-DMD', max: 14, min: 14 });
            const newCommission = new CommissionIncome({
                id,
                user: user._id,
                income: perMemberShare,
                amount: globalTurnover,
                percentage: 2, // 2% of global
                type: 'Diamond Club Royalty',
                status: 'Completed'
            });

            // Update user income
            incomeDetails.income.currentIncome = NumberFixed(incomeDetails.income.currentIncome, perMemberShare);
            incomeDetails.income.totalIncome = NumberFixed(incomeDetails.income.totalIncome, perMemberShare);

            await newCommission.save();
            await incomeDetails.save();

            // console.log(`✅ Diamond Royalty: ${user.username} - Share: $${perMemberShare.toFixed(2)}`);
        }
    } catch (error) {
        console.error("Error in Diamond Club cron:", error);
    } finally {
        isDiamondProcessing = false;
    }
};

// Run on 1st of every month at IST 12:10 AM
cron.schedule('10 0 1 * *', () => {
    const istTime = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
    logger.cronLog('Diamond Club Cron', 'STARTED', { istTime });
    diamondClubNodeCron();
});
// ----------- 9. DIAMOND CLUB ROYALTY END ------------------------


module.exports = { levelIncomeCalculate, rewardNodeCron, globalNodeCron, matchingNodeCron,  sponsorIncomeCalculate,tradingNodeCron, silverClubNodeCron, goldClubNodeCron, diamondClubNodeCron };