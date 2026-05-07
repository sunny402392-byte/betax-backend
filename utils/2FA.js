const speakeasy = require('speakeasy')
const qrcode = require('qrcode');
const { UserModel } = require('../models/user.model');

exports.generate2FA = async ({userId}) => {
    try {
        
        const user = await UserModel.findById(userId);
        if (user && user.active.isFA) {
            return {
                message: "2FA is already enabled for this wallet.",
                qrCode: null,
                secret: null,
            };
        }
        const secret = speakeasy.generateSecret({
            name: `Yomoko Wallet : ( ${user.username} )`,
        });
        const qrCode = await qrcode.toDataURL(secret.otpauth_url);
        // user.active.isFA = secret.base32;
        // await user.save()
        return {
            secret: secret.base32,
            qrCode:qrCode,
        };
    } catch (error) {
        // console.log(error);
    throw error;

    }
};

exports.verify2FA = async ({userId,secret, otp}) => {
    const user = await UserModel.findById(userId);
    if(!user.active.isFA) user.active.isFA = secret;
    if (!user || !user.active.isFA) return false;
    const verified = speakeasy.totp.verify({
        secret: user.active.isFA,
        encoding: "base32",
        token: otp,
        window: 1,
    });
    await user.save()
    return verified;
};
