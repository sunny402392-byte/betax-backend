// const { CommissionIncome } = require('./models/commission.model');
// const { IncomeModel } = require('./models/income.model');
// const { UserModel} = require('./models/user.model');
// const { levelIncomeCalculate } = require('./utils/levelIncome.calculation');

// const ReferralDistribute = async (userId, amount) => {
//     try {
//         const user = await UserModel.findById(userId);
//         await levelIncomeCalculate({userId:user._id,amount:Number(amount),levelPercentages:[0.05,0.03,0.02],levelActive:false,activeDate:user.active.activeDate});
//         // console.log(`Referral income distributed for user ${userId}. Amount: ${amount}`);
//     } catch (error) {
//         console.error('Error in ReferralDistribute:', error);
//     }
// }

// // const ReferralDistribute = async (userId, amount) => {
// //     try {
// //         const user = await UserModel.findById(userId);
// //         const incomeDetails = await IncomeModel.findById(user.incomeDetails);
// //         // const totalRef = await CommissionIncome.aggregate([
// //         //     { $match: { user: user._id,type:'Referral Income' } },
// //         //     { $group: { _id: null, totalAmount: { $sum: '$income' } } }
// //         // ]);
// //         // const totalAmount =  totalRef[0]?.totalAmount || 0;
// //         // // console.log({totalAmount})

// //         // console.log(incomeDetails.referralIncome.income)
// //         incomeDetails.income.currentIncome -= Number(incomeDetails.referralIncome.income);
// //         incomeDetails.income.totalIncome -= Number(incomeDetails.referralIncome.income);
// //         incomeDetails.referralIncome.income = 0;
// //         incomeDetails.referralIncome.history = [];

// //         await incomeDetails.save();
// //         // console.log(`Referral income reset for user ${userId}. Current Income: ${incomeDetails.income.currentIncome}, Total Income: ${incomeDetails.income.totalIncome}`);
// //     } catch (error) {
// //         console.error('Error in ReferralDistribute:', error);
// //     }
// // }

// let isReferralProcessing = false;
// const referralDistributeCron = async () => {
//     if (isReferralProcessing) return;
//     isReferralProcessing = true;
//     try {
//         const users = await UserModel.find({ 'active.isVerified': true,'active.isBlocked': false });
//         for (let user of users) {
//             if (!user || !user.active.isVerified) continue;
//             await ReferralDistribute(user._id,user.investment);
//         }
//     } catch (error) {
//         console.error("Error in scheduled task:", error);
//     } finally {
//         isReferralProcessing = false;
//     }
// }
// // Run this every month on the 1st at 12:00 AM ( `0 0 1 * *` )
// // cron.schedule('0 0 * * *', referralDistributeCron);
// setTimeout(referralDistributeCron, 10000)
