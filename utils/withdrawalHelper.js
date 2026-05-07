const { UserModel } = require("../models/user.model");
const { CommissionIncome } = require("../models/commission.model");
const { TransactionModel } = require("../models/transaction.model");

const calculateWithdrawalStats = async () => {
    // console.log("🚀 Starting Daily Withdrawal Stats Calculation...");
    try {
        const users = await UserModel.find({});
        const summary = [];
        // console.log(`🔍 Found ${users.length} users to process.`);

        for (const user of users) {
            const userId = user._id;

            // 1. Calculate Total Income from Commissions
            const incomeAgg = await CommissionIncome.aggregate([
                {
                    $match: {
                        user: userId,
                        // We can filter by status later, but for now let's see why it's 0
                        // status: "Completed"
                    }
                },
                { $group: { _id: null, total: { $sum: "$income" }, count: { $sum: 1 } } }
            ]);
            const totalCalculatedIncome = incomeAgg.length > 0 ? incomeAgg[0].total : 0;
            const incomeCount = incomeAgg.length > 0 ? incomeAgg[0].count : 0;

            // 2. Calculate Total Withdrawn
            // We filter by type 'Withdrawal'.
            // NOTE: We should probably count Pending + Completed as "withdrawn/locked" for available balance.
            const withdrawalAgg = await TransactionModel.aggregate([
                {
                    $match: {
                        user: userId,
                        type: "Withdrawal",
                        status: { $in: ["Pending", "Processing", "Completed"] }
                    }
                },
                { $group: { _id: null, total: { $sum: "$investment" } } }
            ]);
            const withdrawn = withdrawalAgg.length > 0 ? withdrawalAgg[0].total : 0;

            // 3. Calculate Available
            const available = totalCalculatedIncome - withdrawn;

            // 4. Update User
            if (!user.withdrawalInfo) {
                user.withdrawalInfo = {
                    availableWithdrawalAmount: 0,
                    withdrawnAmount: 0,
                    totalWithdrawableAmount: 0
                };
            }

            user.withdrawalInfo.availableWithdrawalAmount = available > 0 ? available : 0;
            user.withdrawalInfo.withdrawnAmount = withdrawn;
            user.withdrawalInfo.totalWithdrawableAmount = totalCalculatedIncome;

            // Use markModified if withdrawalInfo is a plain object in a Mixed type or similar
            user.markModified('withdrawalInfo');
            await user.save();

            if (totalCalculatedIncome > 0 || incomeCount > 0) {
                const stat = {
                    username: user.username,
                    total: totalCalculatedIncome,
                    withdrawn: withdrawn,
                    available: available
                };
                summary.push(stat);
                // console.log(`✅ User ${user.username} (${user.id}): IncomeRecords=${incomeCount}, Total=${totalCalculatedIncome}, Withdrawn=${withdrawn}, Available=${available}`);
            }
        }
        // console.log("🎉 Withdrawal Stats Calculation Completed.");
        return summary;
    } catch (error) {
        console.error("❌ Error calculating withdrawal stats:", error);
        return { error: error.message };
    }
};

module.exports = { calculateWithdrawalStats };
