const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    id: {
        type: String,
        default: null
    },
    investment: {
        type: Number,
        default: 0
    },
    gasFee: {
        type: Number,
        default: 0
    },
    netAmount: {
        type: Number,
        default: 0
    },
    percentage: {
        type: Number,
        default: 0
    },

    clientAddress: {
        type: String,
        default: null
    },
    mainAddress: {
        type: String,
        default: null
    },
    hash: {
        type: String,
        default: null
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    package: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Package",
        default: null
    },
    type: {
        type: String,
        enum: ['Deposit', 'Withdrawal', 'Transfer', 'Reward', 'Reinvestment', "Onchain USDT OTP Pending", "Onchain USDT ReadyForSigning", "Principal Withdrawal"],
        default: null
    },
    withdrawalType: {
        type: String,
        enum: ['Income', 'Principal'],
        default: null  // Only set for withdrawal transactions
    },
    expectedProcessingDays: {
        type: Number,
        default: 1  // 1 day for income withdrawals, 7 days for principal withdrawals
    },
    currency: {
        type: String,
        default: 'USDT',  // All transactions in USDT (BEP-20)
        enum: ['USDT']
    },

    role: {
        type: String,
        default: "USER",
        enum: ['ADMIN', 'USER']
    },
    otp: { type: String },             // plain OTP
    otpExpires: { type: Date },
    otpAttempts: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ['Pending', 'Processing', 'Completed', 'Cancelled', "PendingOTP", "ReadyForSigning"],
        default: 'Processing',
        required: true,
    }
}, { timestamps: true, versionKey: false });

exports.TransactionModel = mongoose.model('Transaction', transactionSchema);