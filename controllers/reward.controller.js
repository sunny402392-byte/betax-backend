const { UserModel } = require("../models/user.model");
const { TransactionModel } = require("../models/transaction.model");
const { IncomeModel } = require("../models/income.model");
const { CommissionIncome } = require("../models/commission.model");
const { RewardModel } = require("../models/reward.model");
const { generateCustomId } = require("../utils/generator.uniqueid");
const { getDownlineArray } = require("../utils/getteams.downline");
const { uploadToImageKit } = require("../utils/upload.imagekit");

// CRUD Operations
exports.RewardCreate = async (req, res) => {
  const { title, investment, percentage, reward, type, picture } = req.body;
  if (!title || !investment) return res.status(400).json({ success: false, message: "Title and investment required." });
  try {
    const id = generateCustomId({ prefix: "BSG-RWD", min: 10, max: 10 });
    const pictureUrl = picture ? await uploadToImageKit(picture, 'Rewards') : null;
    const newReward = await RewardModel.create({ id, title, investment, percentage, reward, type, picture: pictureUrl });
    res.status(201).json({ success: true, message: 'Reward created successfully', data: newReward });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.RewardUpdate = async (req, res) => {
  const { id } = req.params;
  const { title, investment, percentage, reward, type, picture, status } = req.body;
  try {
    let rewardDoc = await RewardModel.findOne({ id }) || await RewardModel.findById(id);
    if (!rewardDoc) return res.status(404).json({ success: false, message: 'Reward not found' });
    if (picture && rewardDoc.picture !== picture) rewardDoc.picture = await uploadToImageKit(picture, 'Rewards');
    if (title) rewardDoc.title = title;
    if (investment) rewardDoc.investment = investment;
    if (percentage !== undefined) rewardDoc.percentage = percentage;
    if (reward) rewardDoc.reward = reward;
    if (type) rewardDoc.type = type;
    if (status !== undefined) rewardDoc.status = status;
    await rewardDoc.save();
    res.status(200).json({ success: true, message: 'Reward updated successfully', data: rewardDoc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.RewardDelete = async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await RewardModel.findOneAndDelete({ id }) || await RewardModel.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Reward not found' });
    res.status(200).json({ success: true, message: 'Reward deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.RewardStatusUpdate = async (req, res) => {
  const { id } = req.params;
  try {
    let rewardDoc = await RewardModel.findOne({ id }) || await RewardModel.findById(id);
    if (!rewardDoc) return res.status(404).json({ success: false, message: 'Reward not found' });
    rewardDoc.status = !rewardDoc.status;
    await rewardDoc.save();
    res.status(200).json({ success: true, message: `Reward ${rewardDoc.status ? 'activated' : 'deactivated'} successfully` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.RewardsAdminReports = async (req, res) => {
  try {
    const rewards = await RewardModel.find();
    res.status(200).json({ success: true, data: rewards });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.RewardsClientReports = async (req, res) => {
  try {
    const rewards = await RewardModel.find({ status: true });
    res.status(200).json({ success: true, data: rewards });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.RewardsGlobalAcheivers = async (req, res) => {
  try {
    const rewards = await RewardModel.find({ type: 'Global Archive Reward' }).populate('users', 'id username email');
    res.status(200).json({ success: true, data: rewards });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.RewardsGlobalAcheiversUpdate = async (req, res) => {
  const { id } = req.params;
  const { title, investment, reward, picture } = req.body;
  try {
    let rewardDoc = await RewardModel.findOne({ id, type: 'Global Archive Reward' }) || await RewardModel.findById(id);
    if (!rewardDoc) return res.status(404).json({ success: false, message: 'Global reward not found' });
    if (picture && rewardDoc.picture !== picture) rewardDoc.picture = await uploadToImageKit(picture, 'Rewards');
    if (title) rewardDoc.title = title;
    if (investment) rewardDoc.investment = investment;
    if (reward) rewardDoc.reward = reward;
    await rewardDoc.save();
    res.status(200).json({ success: true, message: 'Global reward updated successfully', data: rewardDoc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.RewardsGlobalAcheiversStatusUpdate = async (req, res) => {
  const { id } = req.params;
  try {
    let rewardDoc = await RewardModel.findOne({ id, type: 'Global Archive Reward' }) || await RewardModel.findById(id);
    if (!rewardDoc) return res.status(404).json({ success: false, message: 'Global reward not found' });
    rewardDoc.status = !rewardDoc.status;
    await rewardDoc.save();
    res.status(200).json({ success: true, message: `Global reward ${rewardDoc.status ? 'activated' : 'deactivated'}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Rank structure
const RANKS = [
  { name: "Reward 1", totalReward: 500, target: 20000, payout: 50 },
  { name: "Reward 2", totalReward: 1000, target: 40000, payout: 100 },
  { name: "Reward 3", totalReward: 5000, target: 100000, payout: 500 },
  { name: "Reward 4", totalReward: 10000, target: 200000, payout: 1000 },
  { name: "Reward 5", totalReward: 25000, target: 500000, payout: 2500 },
  { name: "Reward 6", totalReward: 50000, target: 1000000, payout: 5000 },
  { name: "Reward 7", totalReward: 100000, target: 1600000, payout: 10000 },
  { name: "Reward 8", totalReward: 200000, target: 3600000, payout: 20000 },
  { name: "Reward 9", totalReward: 500000, target: 8000000, payout: 50000 },
  { name: "Reward 10", totalReward: 1500000, target: 16000000, payout: 100000 }
];

// Calculate team business
async function calculateTeamBusiness(userId) {
  const { downlineUserIds } = await getDownlineArray({ userId, listShow: false, maxLength: 10 });
  
  const result = await TransactionModel.aggregate([
    { $match: { user: { $in: downlineUserIds }, type: "Deposit", status: "Completed" } },
    { $group: { _id: null, total: { $sum: "$investment" } } }
  ]);
  
  return result[0]?.total || 0;
}

// Check rank achievement
exports.checkRankAchievement = async (userId) => {
  try {
    const user = await UserModel.findById(userId);
    if (!user) return;

    const teamBusiness = await calculateTeamBusiness(userId);
    
    for (const rank of RANKS.slice().reverse()) {
      if (teamBusiness >= rank.target) {
        if (!user.currentRank || user.currentRank.rank !== rank.name) {
          user.currentRank = {
            rank: rank.name,
            achievedAt: new Date(),
            payoutMonth: 1,
            lastPayout: null
          };
          await user.save();
          
          await RewardModel.findOneAndUpdate(
            { title: rank.name, type: "Rank Reward" },
            { $addToSet: { users: userId } },
            { upsert: true }
          );
          
          // console.log(`🎉 ${user.username} achieved ${rank.name} rank!`);
        }
        break;
      }
    }
  } catch (err) {
    console.error("❌ Check rank error:", err.message);
  }
};

// Distribute monthly rank rewards (Cron)
exports.distributeMonthlyRankRewards = async () => {
  try {
    // console.log("🎁 Distributing monthly rank rewards...");
    
    const users = await UserModel.find({ "currentRank.payoutMonth": { $lte: 10 } });
    
    for (const user of users) {
      if (!user.currentRank || user.currentRank.payoutMonth > 10) continue;
      
      const rankData = RANKS.find(r => r.name === user.currentRank.rank);
      if (!rankData) continue;
      
      let income = await IncomeModel.findOne({ user: user._id });
      if (!income) {
        income = await IncomeModel.create({ user: user._id });
      }
      
      income.income.currentIncome = (income.income.currentIncome || 0) + rankData.payout;
      income.income.totalIncome += rankData.payout;
      await income.save();
      
      const id = generateCustomId({ prefix: 'BSG-RNK', max: 14, min: 14 });
      await CommissionIncome.create({
        id,
        user: user._id,
        income: rankData.payout,
        amount: rankData.payout,
        type: "Rank Reward",
        status: "Completed"
      });
      
      user.currentRank.payoutMonth += 1;
      user.currentRank.lastPayout = new Date();
      await user.save();
      
      // console.log(`✅ ${user.username} received ${user.currentRank.rank} reward: $${rankData.payout}`);
    }
    
    // console.log("🎉 Rank rewards distributed!");
  } catch (err) {
    console.error("❌ Rank reward distribution error:", err.message);
  }
};

// Royalty tiers
function getRoyaltyTier(monthlyBusiness) {
  if (monthlyBusiness >= 250000) return { name: "6%", percent: 6 };
  if (monthlyBusiness >= 100001) return { name: "5%", percent: 5 };
  if (monthlyBusiness >= 50001) return { name: "4%", percent: 4 };
  if (monthlyBusiness >= 20001) return { name: "3%", percent: 3 };
  if (monthlyBusiness >= 5000) return { name: "2%", percent: 2 };
  return null;
}

// Calculate monthly team business
async function calculateMonthlyTeamBusiness(userId) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  
  const { downlineUserIds } = await getDownlineArray({ userId, listShow: false });
  
  const result = await TransactionModel.aggregate([
    {
      $match: {
        user: { $in: downlineUserIds },
        type: "Deposit",
        status: "Completed",
        createdAt: { $gte: startOfMonth }
      }
    },
    { $group: { _id: null, total: { $sum: "$investment" } } }
  ]);
  
  return result[0]?.total || 0;
}

// Calculate royalty pool
async function calculateRoyaltyPool() {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  
  const result = await TransactionModel.aggregate([
    { $match: { type: "Deposit", status: "Completed", createdAt: { $gte: startOfMonth } } },
    { $group: { _id: null, total: { $sum: "$investment" } } }
  ]);
  
  const turnover = result[0]?.total || 0;
  return (turnover * 5) / 100; // 5% to royalty pool
}

// Distribute monthly royalty (Cron)
exports.calculateMonthlyRoyalty = async () => {
  try {
    // console.log("👑 Calculating monthly royalty...");
    
    const users = await UserModel.find();
    const royaltyPool = await calculateRoyaltyPool();
    const qualifiedUsers = [];
    
    for (const user of users) {
      const monthlyBusiness = await calculateMonthlyTeamBusiness(user._id);
      
      if (monthlyBusiness >= 5000) {
        const tier = getRoyaltyTier(monthlyBusiness);
        qualifiedUsers.push({
          user,
          monthlyBusiness,
          tier,
          percentage: tier.percent
        });
        
        user.royaltyClub = {
          tier: tier.name,
          monthlyBusiness,
          lastCalculated: new Date()
        };
        await user.save();
      }
    }
    
    if (qualifiedUsers.length === 0) {
      // console.log("⚠️ No qualified users for royalty");
      return;
    }
    
    const totalShares = qualifiedUsers.reduce((sum, u) => sum + u.percentage, 0);
    
    for (const qualified of qualifiedUsers) {
      const share = (qualified.percentage / totalShares) * royaltyPool;
      
      let income = await IncomeModel.findOne({ user: qualified.user._id });
      if (!income) {
        income = await IncomeModel.create({ user: qualified.user._id });
      }
      
      income.income.currentIncome = (income.income.currentIncome || 0) + share;
      income.income.totalIncome += share;
      await income.save();
      
      const id = generateCustomId({ prefix: 'BSG-ROY', max: 14, min: 14 });
      await CommissionIncome.create({
        id,
        user: qualified.user._id,
        income: share,
        amount: qualified.monthlyBusiness,
        percentage: qualified.percentage,
        type: "Royalty Income",
        status: "Completed"
      });
      
      // console.log(`✅ ${qualified.user.username} received royalty: $${share.toFixed(2)} (${qualified.tier.name})`);
    }
    
    // console.log("🎉 Royalty distributed!");
  } catch (err) {
    console.error("❌ Royalty calculation error:", err.message);
  }
};

// Get user rank status
exports.getUserRankStatus = async (req, res) => {
  try {
    const user = await UserModel.findById(req.user._id);
    const teamBusiness = await calculateTeamBusiness(user._id);
    
    let nextRank = null;
    for (const rank of RANKS) {
      if (teamBusiness < rank.target) {
        nextRank = rank;
        break;
      }
    }
    
    res.json({
      success: true,
      data: {
        currentRank: user.currentRank,
        teamBusiness,
        nextRank,
        progress: nextRank ? (teamBusiness / nextRank.target) * 100 : 100
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get royalty status
exports.getRoyaltyStatus = async (req, res) => {
  try {
    const user = await UserModel.findById(req.user._id);
    const monthlyBusiness = await calculateMonthlyTeamBusiness(user._id);
    const tier = getRoyaltyTier(monthlyBusiness);
    
    let nextTier = null;
    const tiers = [5000, 20001, 50001, 100001, 250000];
    for (const t of tiers) {
      if (monthlyBusiness < t) {
        nextTier = { target: t, percent: getRoyaltyTier(t).percent };
        break;
      }
    }
    
    res.json({
      success: true,
      data: {
        royaltyClub: user.royaltyClub,
        monthlyBusiness,
        currentTier: tier,
        nextTier
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get rank reward history
exports.getRankRewardHistory = async (req, res) => {
  try {
    const history = await CommissionIncome.find({
      user: req.user._id,
      type: "Rank Reward"
    }).sort({ createdAt: -1 });
    
    res.json({ success: true, data: history });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get royalty income history
exports.getRoyaltyIncomeHistory = async (req, res) => {
  try {
    const history = await CommissionIncome.find({
      user: req.user._id,
      type: "Royalty Income"
    }).sort({ createdAt: -1 });
    
    res.json({ success: true, data: history });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
