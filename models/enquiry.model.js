const mongoose = require("mongoose");

const enquirySchema = new mongoose.Schema({
    id:{
        type:String,
        trim:true,
        default:null
    },
    name: {
        type: String,
        trim:true,
        default:null
    },
    email: {
        type: String,
        trim:true,
        default:null
    },
    phone: {
        type: String,
        default:null,
        trim:true
    },
    message: {
        type: String,
        trim:true,
        default:null
    },
    status: {
        type: String,
        enum: ["Processing", "Accepted", "Rejected"],
        default: "Processing"
    },
    responseDate: {
        type: Date,
        default: null
    }
}, { timestamps: true, versionKey: false });

exports.EnquiryModel = mongoose.model('Enquiry', enquirySchema);
