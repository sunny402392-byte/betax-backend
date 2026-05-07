const mongoose = require("mongoose");

const planSchema = new mongoose.Schema({
    id: {
        type: String,
        default: null,
        trim: true
    },
    planType: {
        type: String,
        enum: ['BASIC', 'ECONOMIC', 'DIAMOND'],
        required: [true, "Plan type is required."]
    },
    title: {
        type: String,
        trim: true,
        required: [true, "Plan title is required."]
    },
    duration: {
        type: Number,
        required: [true, "Duration is required."]
    },
    minAmount: {
        type: Number,
        default: 0
    },
    maxAmount: {
        type: Number,
        default: 0
    },
    dailyRoi: {
        type: Number,
        required: [true, "Daily ROI is required."]
    },
    totalRoi: {
        type: Number,
        default: 0
    },
    status: {
        type: Boolean,
        default: true
    }
}, { timestamps: true, versionKey: false });

exports.PlanModel = mongoose.model('Plan', planSchema);
