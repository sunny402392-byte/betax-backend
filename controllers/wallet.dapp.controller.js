const User = require('../models/wallet.user.model');
const Package = require('../models/wallet.package.model');
const Income = require('../models/wallet.income.model');

exports.register = async (req, res) => {
  try {
    const { walletAddress, referrerAddress, signature } = req.body;
    
    const exists = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
    if (exists) return res.status(400).json({ message: 'Already registered' });
    
    const userCount = await User.countDocuments();
    const user = await User.create({
      walletAddress: walletAddress.toLowerCase(),
      referrerAddress: referrerAddress?.toLowerCase(),
      userId: userCount + 1
    });
    
    if (referrerAddress) {
      await User.findOneAndUpdate(
        { walletAddress: referrerAddress.toLowerCase() },
        { $inc: { directCount: 1 } }
      );
    }
    
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getUserInfo = async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    const packages = await Package.find({ walletAddress: walletAddress.toLowerCase() });
    const incomes = await Income.find({ walletAddress: walletAddress.toLowerCase() });
    
    res.json({ user, packages, incomes });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.syncDeposit = async (req, res) => {
  try {
    const { walletAddress, amount, roiPercent, txHash } = req.body;
    
    const pkg = await Package.create({
      walletAddress: walletAddress.toLowerCase(),
      amount,
      roiPercent,
      maxReturn: amount * 2,
      txHash
    });
    
    await User.findOneAndUpdate(
      { walletAddress: walletAddress.toLowerCase() },
      { $inc: { totalInvestment: amount } }
    );
    
    res.json({ success: true, package: pkg });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getDashboard = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalInvestment = await User.aggregate([
      { $group: { _id: null, total: { $sum: '$totalInvestment' } } }
    ]);
    const totalWithdrawn = await Income.aggregate([
      { $match: { type: 'Withdrawal' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    res.json({
      totalUsers,
      totalInvestment: totalInvestment[0]?.total || 0,
      totalWithdrawn: totalWithdrawn[0]?.total || 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
