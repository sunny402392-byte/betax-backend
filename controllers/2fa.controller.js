const { UserModel } = require("../models/user.model");
const { verify2FA, generate2FA } = require("../utils/2FA");

exports.generate2FAHandler = async (req, res) => {
    try {
        if (!req?.user?._id) return res.status(400).json({ error: "User Id is required" });
        const { secret, qrCode } = await generate2FA({userId:req?.user?._id});
        return res.status(200).json({ secret, qrCode, success: true });
    } catch (error) {
        return res.status(500).json({ error: "Internal Server Error" });
    }
};
exports.reset2FAHandler = async (req, res) => {
    try {
        if (!req?.user?._id) return res.status(400).json({ error: "User Id is required" });
        const user = await UserModel.findById(req.user._id);
        if(user.active.isFA) user.active.isFA = null;
        await user.save();
        return res.status(200).json({ message:"2FA reset successfully.", success: true });
    } catch (error) {
        return res.status(500).json({ error: "Internal Server Error" });
    }
};
exports.verify2FAHandler = async (req, res) => {
    try {
        const { otp,secret } = req.body;
        if (!otp) return res.status(500).json({ message: "OTP is required", success: false });
        if (!req?.user?._id) return res.status(500).json({ message: "User Id is required", success: false });
        const verified = await verify2FA({userId:req?.user?._id,secret, otp});
        if (verified) return res.status(200).json({ verified: true, success: true });
        return res.status(401).json({ verified: false, success: false, message: "Invalid Authentication Code!" });
    } catch (error) {
        console.error("2FA Verification Error:", error);
        return res.status(500).json({ message: error.message, success: false });
    }
};