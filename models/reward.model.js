const mongoose = require("mongoose");

const rewardSchema = new mongoose.Schema({
    id: {
        type: String,
        default: null,
        trim: true,
    },
    picture: {
        type: String,
        trim: true,
        default: null
    },
    title: {
        type: String,
        trim: true,
        required: [true, "Reward name is required."]
    },
    investment: {
        type: Number,
        required: [true, "Investment is required."]
    },
    percentage: {
        type: Number,
        default: 0
    },
    reward: {
        type: String,
        trim: true,
        default: null,
    },
    status: {
        type: Boolean,
        default: true
    },
    type: {
        type: String,
        enum: ['Rank Reward', 'Global Archive Reward', 'Silver Club', 'Gold Club', 'Diamond Club'],
        default: "Rank Reward",
    },
    users: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: []
    }],
    targetRequirement: {
        teamBusiness: {
            type: Number,
            default: 0  // Minimum team business to maintain club eligibility
        },
        directTeam: {
            type: Number,
            default: 0  // Minimum direct team members required
        },
        description: {
            type: String,
            default: null  // Description of requirements to maintain club
        }
    },
    previousClubMembers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: []  // Users who were in this club but got promoted to higher tier
    }]
}, { timestamps: true, versionKey: false })

// Exclude the password field by default when converting documents to JSON or objects
rewardSchema.set('toJSON', {
    transform: (doc, ret) => {
        delete ret.users;
        return ret;
    }
});
rewardSchema.set('toObject', {
    transform: (doc, ret) => {
        delete ret.users;
        return ret;
    }
});

exports.RewardModel = mongoose.model('Reward', rewardSchema);