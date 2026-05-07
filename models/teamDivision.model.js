const mongoose = require('mongoose');

const teamDivisionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    // Team A - Highest business direct referral's branch
    teamA: {
        directReferral: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        members: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }],
        totalBusiness: {
            type: Number,
            default: 0
        }
    },
    // Team B - Second highest business direct referral's branch
    teamB: {
        directReferral: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        members: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }],
        totalBusiness: {
            type: Number,
            default: 0
        }
    },
    // Team C - All other direct referrals' branches
    teamC: {
        directReferrals: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }],
        members: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }],
        totalBusiness: {
            type: Number,
            default: 0
        }
    },
    lastShuffledAt: {
        type: Date,
        default: null
    }
}, { timestamps: true, versionKey: false });

// Index for faster queries
teamDivisionSchema.index({ user: 1 });

exports.TeamDivisionModel = mongoose.model('TeamDivision', teamDivisionSchema);

