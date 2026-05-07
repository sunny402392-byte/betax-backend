const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    question:{
        type:String,
        default:null
    },
    status: {
        type: Boolean,
        default: true
    }
},{timestamps: true, versionKey: false});

exports.NotificationModel = mongoose.model('Notification', notificationSchema);