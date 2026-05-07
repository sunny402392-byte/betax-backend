const mongoose = require("mongoose");

const roiHistorySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true },
  roiPercent: { type: Number, required: true },
  date: { type: Date, default: Date.now }
}, { timestamps: true, versionKey: false });

module.exports = mongoose.model("ROIHistory", roiHistorySchema);
