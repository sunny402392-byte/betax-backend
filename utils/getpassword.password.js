const jwt = require('jsonwebtoken');
const {PASSWORD_SECRET} = process.env;

if (!PASSWORD_SECRET) {
    throw new Error('PASSWORD_SECRET environment variable is required. Please add it to your .env file.');
}

exports.getHashPassword = function (password) {
    if (!PASSWORD_SECRET) {
        throw new Error('PASSWORD_SECRET is not configured');
    }
    return jwt.sign({ password }, PASSWORD_SECRET, { expiresIn: '2y' });
};

exports.getComparePassword = async function (user,password) {
    try {
        const decode = await jwt.verify(user.password, PASSWORD_SECRET);
        return decode.password == password;
    } catch (err) {
        return null;
    }
};