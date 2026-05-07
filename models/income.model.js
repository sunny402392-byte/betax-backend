const mongoose = require("mongoose");

const IncomeSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    income: {
        currentIncome: {
            type: Number,
            default: 0
        },
        totalIncome: {
            type: Number,
            default: 0
        },
        depositWallet: {
            type: Number,
            default: 0
        },
        roiWallet: {
            type: Number,
            default: 0
        },
        levelIncomeWallet: {
            type: Number,
            default: 0
        }
    },
    withdrawal: {
        amount: {
            type: Number,
            default: 0
        },
        history: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Withdrawal',
            default: []
        }],
    },
    referralIncome: {
        income: {
            type: Number,
            default: 0
        },
        history: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Commission',
            default: []
        }],
    },
    levelIncome: {
        income: {
            type: Number,
            default: 0
        },
        history: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Commission',
            default: []
        }],
    },
    matchingIncome: {
        income: {
            type: Number,
            default: 0
        },
        nextPayoutDate: {
            type: Date,
            default: null
        },
        history: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Commission',
            default: []
        }],
    },
    monthlyIncome: {
        income: {
            type: Number,
            default: 0
        },
        history: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Commission',
            default: []
        }],
    },
    globalAchieverIncome: {
        income: {
            type: Number,
            default: 0
        },
        history: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Commission',
            default: []
        }],
    },
    liveIncome: {
        income: {
            type: Number,
            default: 0
        },
        history: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Commission',
            default: []
        }],
    },
    rankRewardIncome: {
        income: {
            type: Number,
            default: 0
        },
        history: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Commission',
            default: []
        }],
    },
    clubIncentiveIncome: {
        income: {
            type: Number,
            default: 0
        },
        history: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Commission',
            default: []
        }],
    },
}, { timestamps: true, versionKey: false });

exports.IncomeModel = mongoose.model('IncomeDetails', IncomeSchema);
