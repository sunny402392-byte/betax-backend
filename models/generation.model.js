const mongoose = require("mongoose");

const generationROIHistorySchema = new mongoose.Schema(
  {
    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, 
    toUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },   
    level: { type: Number, required: true },
    amount: { type: Number, required: true },
    percent: { type: Number, required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("GenerationROIHistory", generationROIHistorySchema);
