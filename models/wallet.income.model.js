const mongoose = require('mongoose');

const incomeSchema = new mongoose.Schema({
  walletAddress: { type: String, required: true, lowercase: true },
  type: { type: String, enum: ['ROI', 'Sponsor', 'Level', 'Reward', 'Royalty'], required: true },
  amount: { type: Number, required: true },
  fromAddress: { type: String, lowercase: true },
  level: { type: Number },
  txHash: { type: String },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Income', incomeSchema);
