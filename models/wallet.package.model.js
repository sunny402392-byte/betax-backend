const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema({
  walletAddress: { type: String, required: true, lowercase: true },
  amount: { type: Number, required: true },
  roiPercent: { type: Number, required: true },
  earned: { type: Number, default: 0 },
  maxReturn: { type: Number },
  active: { type: Boolean, default: true },
  txHash: { type: String },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Package', packageSchema);
