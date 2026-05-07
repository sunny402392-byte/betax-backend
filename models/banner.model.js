const monoogse = require('mongoose');

const bannerSchema = new monoogse.Schema({
    id: { type: String, default: null,trim:true },
    title: { type: String, default: null },
    description: { type: String, default: null },
    file: { type: String, default: null },
    type: { type: String, default: 'LANDING',enum:['USER','LANDING'] },
    mimeType: { type: String, default: null },
    status: { type: Boolean, default: true },
}, { timestamps: true, versionKey: false });

exports.BannerModel = monoogse.model('Banner', bannerSchema);
