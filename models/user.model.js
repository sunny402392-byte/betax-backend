const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    id: { type: String, default: null, },
    picture: { type: String, default: null, trim: true },
    username: { type: String, default: null, trim: true },
    email: { type: String, default: null, trim: true },
    mobile: { type: String, default: null, trim: true },
    telegram: { type: String, default: null, trim: true },
    password: { type: String, default: null, trim: true },
    account: {
        type: String,
        default: null,
        trim: true,
    },
    countryCode: {
        type: String,
        default: null
    },
    country: {
        type: String,
        default: null
    },
    token: {
        token: { type: String, default: null, trim: true },
        tokenBlock: { type: Array, default: [] },
    },
    referralLink: {
        type: String,
        default: null,
        trim: true
    },
    incomeDetails: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'IncomeDetails',
        default: null
    },
    sponsor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    partners: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: []
    }],
    totalTeam: {
        type: Number,
        default: 0
    },
    teamMembers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: []
    }],
    position: {
        type: String,
        enum: ['LEFT', 'RIGHT'],
        default: 'LEFT'
    },
    leftChild: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    rightChild: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    matchingPairs: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Matching",
        default: []
    }],
    investment: {
        type: Number,
        default: 0
    },
    transactions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction',
        default: []
    }],
    packages: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Package',
        default: []
    }],
    todayRoiCollected: {
        type: Boolean,
        default: false,
    },
    otp: { type: String, default: null, trim: true },
    otpExpiry: { type: Date, default: null },
    active: {
        isVerified: {
            type: Boolean,
            default: false
        },
        isActive: {
            type: Boolean,
            default: false
        },
        isFA: {
            type: String,
            default: null
        },
        isBlocked: {
            type: Boolean,
            default: false
        },
        isRoiBlocked: {
            type: Boolean,
            default: false
        },
        activeDate: {
            type: Date,
            default: null
        },
        isCurrentIncomeHold: {
            type: Boolean,
            default: false
        },
        isCapitalLocked: {
            type: Boolean,
            default: true  // Capital amount locked by default
        }
    },
    lastCalculation: {
        level: {
            type: Date,
            default: null
        },
        team: {
            type: Date,
            default: null
        },
    },
    role: {
        type: String,
        default: 'USER'
    },
    withdrawalInfo: {
        totalWithdrawableAmount: {
            type: Number,
            default: 0
        },
        availableWithdrawalAmount: {
            type: Number,
            default: 0
        },
        withdrawnAmount: {
            type: Number,
            default: 0
        }
    },
    supports: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Support",
        default: []
    }],
    currentClub: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Reward',
        default: null  // Current highest club user is qualified for
    },
    clubHistory: [{
        club: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Reward'
        },
        qualifiedDate: {
            type: Date
        },
        closedDate: {
            type: Date,
            default: null
        }
    }],
    clubQualificationDate: {
        type: Date,
        default: null  // Date when user qualified for current club
    },
    currentRank: {
        rank: { type: String, default: null },
        achievedAt: { type: Date, default: null },
        payoutMonth: { type: Number, default: 1 },
        lastPayout: { type: Date, default: null }
    },
    royaltyClub: {
        tier: { type: String, default: null },
        monthlyBusiness: { type: Number, default: 0 },
        lastCalculated: { type: Date, default: null }
    }
}, { timestamps: true, versionKey: false })


// // // Exclude the password field by default when converting documents to JSON or objects
userSchema.set('toJSON', {
    transform: (doc, ret) => {
        delete ret.token;
        delete ret.password;
        delete ret.sessionStart;
        // if (ret.multiWallets && Array.isArray(ret.multiWallets)) {
        //     ret.multiWallets = ret.multiWallets.map(wallet => {
        //         if (wallet && typeof wallet === 'object') {
        //             delete wallet.privateKey;
        //             delete wallet.phaseKey;
        //         }
        //         return wallet;
        //     });
        // }
        return ret;
    }
});
userSchema.set('toObject', {
    transform: (doc, ret) => {
        delete ret.sessionStart;
        delete ret.token;
        return ret;
    }
});


// Add to binary tree recursively
userSchema.methods.addToBinaryTree = async function (newUser, position, UserModel) {
    try {
        if (!this.leftChild && position == 'LEFT') {
            this.leftChild = newUser._id;
            await this.save();
            return this.leftChild;
        } else if (this.leftChild && position == 'LEFT') {
            this.leftChild = newUser._id;
            await this.save();
            return this.leftChild;
        }

        if (!this.rightChild && position == 'RIGHT') {
            this.rightChild = newUser._id;
            await this.save();
            return this.rightChild;
        } else if (this.rightChild && position == 'RIGHT') {
            this.rightChild = newUser._id;
            await this.save();
            return this.rightChild;
        }
        if (this.leftChild && position == 'LEFT') {
            const leftChild = await UserModel.findById(this.leftChild);
            if (leftChild) {
                const result = await leftChild.addToBinaryTree(newUser, position, UserModel);
                if (result) return result;
            }
        }
        if (this.rightChild && position == 'RIGHT') {
            const rightChild = await UserModel.findById(this.rightChild);
            if (rightChild) {
                const result = await rightChild.addToBinaryTree(newUser, position, UserModel); // Recursively add to the right child
                if (result) return result;
            }
        }
        if (this.sponsor) {
            // // console.log(this.sponsor)
            const sponsor = await UserModel.findOne({ sponsor: this.sponsor });
            if (sponsor) {
                return sponsor.addToBinaryTree(newUser, position, UserModel); // Recursively check sponsor
            }
        }
        throw new Error('Unable to add user. Both left and right are filled.');
    } catch (error) {
        console.error('Error adding to binary tree:', error);
        throw error;
    }
};



exports.UserModel = mongoose.model('User', userSchema);