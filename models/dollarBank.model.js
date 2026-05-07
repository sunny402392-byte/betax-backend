const mongoose = require('mongoose');

const dollarBankSchema = new mongoose.Schema({
    id: {
        type: String,
        default: null
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    investment: {
        type: Number,
        required: true,
        default: 0
    },
    profit: {
        type: Number,
        default: 0  // 15% of investment
    },
    totalAmount: {
        type: Number,
        default: 0  // investment + profit
    },
    investmentDate: {
        type: Date,
        default: Date.now
    },
    maturityDate: {
        type: Date,
        required: true  // investmentDate + 1 year
    },
    status: {
        type: String,
        enum: ['Active', 'Matured', 'Withdrawn'],
        default: 'Active'
    },
    withdrawalDate: {
        type: Date,
        default: null
    },
    transaction: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction',
        default: null
    }
}, { timestamps: true, versionKey: false });

// Index for faster queries
dollarBankSchema.index({ user: 1, status: 1 });
dollarBankSchema.index({ maturityDate: 1, status: 1 });

exports.DollarBankModel = mongoose.model('DollarBank', dollarBankSchema);

