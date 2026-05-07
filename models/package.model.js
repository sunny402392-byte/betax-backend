const mongoose = require("mongoose");

const packageSchema = new mongoose.Schema({
    id:{
        type:String,
        default:null,
        trim:true
    },
    picture: {
        type: String,
        default:null,
        trim:true
    },
    title: {
        type: String,
        trim:true,
        required: [true, "Package name is required."]
    },
    minAmount:{
        type: Number,
        trim:true,
        default:0
    },
    maxAmount:{
        type: Number,
        trim:true,
        default:0
    },
    percentage: {
        type: Number,
        trim:true,
        required: [true, "Percentage is required."]
    },
    perDayRoi:{
        type: Number,
        default:0
    },
    tags:{
        type:Array,
        default:[]
    },
    users:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default:[]
    }],
    status:{
        type: Boolean,
        default: true
    }
}, { timestamps: true, versionKey: false });


packageSchema.set('toJSON', {
    transform: (doc, ret) => {
        delete ret.users;
        return ret;
    }
});
packageSchema.set('toObject', {
    transform: (doc, ret) => {
        // delete ret.users;
        return ret;
    }
});

exports.PackageModel = mongoose.model('Package', packageSchema);