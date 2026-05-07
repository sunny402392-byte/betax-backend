const fs = require('fs');
const { v4: uuid } = require('uuid');
const { BannerModel } = require("../models/banner.model");
const { generateCustomId } = require('../utils/generator.uniqueid');
const { uploadToImageKit } = require('../utils/upload.imagekit');

// ------------------------------------------------ BANNER START ------------------------------------

exports.BannerCreate = async (req, res) => {
    try {
        const { title, file, description, status, mimeType, type } = req.body;
        if (!title || !file || !status || !type) return res.status({ success: false, message: "All field required." })
        // Find if a banner already exists
        const bannerFind = await BannerModel.findOne({ title });
        if (bannerFind) return res.status(500).json({ success: false, message: "Banner already exist." })
        let bannerName = await uploadToImageKit(file, 'Banners');
        // If no banner exists, create a new one
        const id = generateCustomId({ max: 15 })
        const newBanner = new BannerModel({
            id,
            title: title,
            file: bannerName,
            type,
            description,
            mimeType,
            status
        });
        await newBanner.save();
        return res.status(201).json({
            success: true,
            message: 'Banner created successfully',
            data: newBanner
        });
    } catch (error) {
        console.error("Error in BannerCreateUpdate:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};
exports.BannerUpdate = async (req, res) => {
    try {
        const { title, file, description, mimeType, type, status } = req.body;
        const {id} = req.params
        if(!id) return res.status(500).json({success:false,message:"Banner ID is required."})
        const bannerFind = await BannerModel.findById(id);
        if (!bannerFind) {
            return res.status(500).json({
                success: false,
                message: 'Banner not found.',
            });
        }
        if (mimeType) bannerFind.mimeType = mimeType;
        if (type) bannerFind.type = type;
        if (description) bannerFind.description = description;
        if (title) bannerFind.title = title;
        if (file != bannerFind.file) bannerFind.banner = await uploadToImageKit(file, 'Banners');
        bannerFind.status = status;
        await bannerFind.save();
        return res.status(200).json({
            success: true,
            message: 'Banner updated successfully',
            data: bannerFind
        });
    } catch (error) {
        console.error("Error in BannerCreateUpdate:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};
exports.getDeleteBanner = async (req, res) => {
    try {
        if (!req.params.id) return res.status(500).json({ success: false, message: "ID is required." })
        const bannerFind = await BannerModel.findByIdAndDelete(req.params.id);
        return res.status(200).json({ success: true, message: 'Banner delete successfully', data: bannerFind });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

exports.AllBanner = async (req, res) => {
    try {
        const bannerFind = await BannerModel.find();
        return res.status(200).json({ success: true, message: 'Banner Find successfully', data: bannerFind });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.getBanner = async (req, res) => {
    try {
        if (!req.params.id) return res.status(500).json({ success: false, message: "ID is required." })
        const bannerFind = await BannerModel.findById(req.params.id);
        return res.status(200).json({ success: true, message: 'Banner Find successfully', data: bannerFind });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};