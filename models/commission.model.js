const mongoose = require('mongoose');

const commissionSchema = new mongoose.Schema({
    id: {
        type: String,
        default: null
    },
    amount: {
        type: Number,
        default: 0
    },
    income: {
        type: Number,
        default: 0
    },
    reward: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Reward',
        default: null
    },
    package: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Package',
        default: null
    },
    tx: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction',
        default: null
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    fromUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    percentage: {
        type: Number,
        default: 0
    },
    leftBusiness: {
        type: Number,
        default: 0
    },
    rightBusiness: {
        type: Number,
        default: 0
    },
    level: {
        type: Number,
        default: 0
    },
    days: {
        type: Number,
        default: 0
    },
    rewardPaid: {
        type: String,
        enum: ['Pending', 'Processing', 'Completed', 'Rejected', 'Not Applied'],
        default: 'Not Applied'
    },
    type: {
        type: String,
        enum: ['Referral Income', 'Level Income', 'Matching Income', 'Trading Profit Income','Sponsor Income', 'Live Trading Income', 'Global Archive Reward', 'Rank Reward', 'Royalty Income', 'Silver Club Incentive', 'Gold Club Incentive', 'Diamond Club Royalty'],
        default: 'Referral Income'
    },
    status: {
        type: String,
        enum: ['Pending', 'Processing', 'Completed', 'Cancelled'],
        default: 'Completed'
    }
}, { timestamps: true, versionKey: false })

exports.CommissionIncome = mongoose.model('Commission', commissionSchema);