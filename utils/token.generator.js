const jwt = require('jsonwebtoken');
// Compare password
exports.getToken = async function (user) {
    return await jwt.sign({_id:user?._id,account:user?.account,email:user?.email,role:user?.role}, process.env.JWT_SECRET, {expiresIn: '1d' });
};
// Compare password
exports.verifyToken = async function (token) {
    return await jwt.verify(token, process.env.JWT_SECRET);
};

