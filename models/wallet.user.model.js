const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  walletAddress: { type: String, required: true, unique: true, lowercase: true },
  userId: { type: Number, unique: true },
  referrerAddress: { type: String, lowercase: true },
  totalInvestment: { type: Number, default: 0 },
  totalEarned: { type: Number, default: 0 },
  withdrawable: { type: Number, default: 0 },
  directCount: { type: Number, default: 0 },
  teamBusiness: { type: Number, default: 0 },
  rank: { type: String, default: 'None' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
