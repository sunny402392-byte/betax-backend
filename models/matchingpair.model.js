import mongoose from 'mongoose';

const matchingPairSchema = new mongoose.Schema({
    left: {
        type: mongoose.Schema.Types.ObjectId,
        ref:'User',
        required: true,
    },
    right: {
        type: mongoose.Schema.Types.ObjectId,
        ref:'User',
        required: true,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref:'User',
        required: true,
    },
    commition:{
        type:Number,
        default:0
    },
    checked: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true, versionKey: false });

export const MatchingPairModel = mongoose.model('Matching', matchingPairSchema);
