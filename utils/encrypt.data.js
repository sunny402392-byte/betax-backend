const CryptoJS = require("crypto-js");
const SECRET_KEY = process.env.ENCRYPT_DATA_SECRET;

// 1.ENCRYPT FUN
exports.encryptData = async (data) => {
    const encrypted = await CryptoJS.AES.encrypt(JSON.stringify(data), SECRET_KEY).toString();
    return encrypted;
};

// 2.Decrypt function
exports.decryptData = async (encryptedData) => {
    const bytes = await CryptoJS.AES.decrypt(encryptedData, SECRET_KEY);
    const decrypted = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    return decrypted;
};



exports.decryptedWalletData = async (encryptedData, password)=>{
    const decryptedBytes = await CryptoJS.AES.decrypt(encryptedData, password);
    return JSON.parse(decryptedBytes.toString(CryptoJS.enc.Utf8));
}