const { CommissionIncome } = require("../models/commission.model");
const { IncomeModel } = require("../models/income.model");
const { PackageModel } = require("../models/package.model");
const { TransactionModel } = require("../models/transaction.model");
const { UserModel } = require("../models/user.model");
const { generateCustomId } = require("../utils/generator.uniqueid");
const { NumberFixed } = require("../utils/NumberFixed");

exports.LiveTrading = async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.params.id;
    if (!amount || !userId) return res.status(500).json({ success: false, message: "Amount & user ID are required." });
    const user = await UserModel.findById(userId);
    if (!user) return res.status(500).json({ success: false, message: "User not found." });
    const incomeDetails = await IncomeModel.findById(user.incomeDetails);
    if (!incomeDetails) return res.status(500).json({ success: false, message: "Income Details not found." });
    const packageFind = await PackageModel.findOne({ title: "LIVE AC" });
    if (!packageFind) return res.status(500).json({ success: false, message: "Package not found." });
    const tx = await TransactionModel.aggregate([
      { $match: { user: user._id, package: packageFind._id, type: "Deposit" } },
      { $group: { _id: null, totalInvestment: { $sum: "$investment" }, transactions: { $push: "$$ROOT" } } }
    ]);
    const totalInvestment = tx[0]?.totalInvestment || 0;
    const transactionIds = tx[0]?.transactions.map(t => t._id) || [];
    if (totalInvestment === 0) {
      return res.status(400).json({ success: false, message: "No deposit found for LIVE AC package." });
    }
    const id = generateCustomId({ prefix: 'BSG-LIVE', max: 14, min: 14 });
    const percentage = (amount / totalInvestment) * 100;
    const newCommission = new CommissionIncome({ id, amount: totalInvestment, percentage, tx: transactionIds?.[transactionIds?.length - 1], income:amount, user: user._id, package: packageFind._id, type: "Live Trading Income", status: "Completed" })
    incomeDetails.liveIncome.income = NumberFixed(incomeDetails.liveIncome.income, amount);
    incomeDetails.income.totalIncome = NumberFixed(incomeDetails.liveIncome.income, amount);
    incomeDetails.income.currentIncome = NumberFixed(incomeDetails.liveIncome.income, amount);
    incomeDetails.liveIncome.history.push(newCommission._id);
    await incomeDetails.save();
    await newCommission.save();
    res.status(200).json({ success: true, message: "Live trading amount transfer successfully." })
  } catch (error) {
    // console.log(error)
    res.status(500).json({ success: false, message: error.message })
  }
}