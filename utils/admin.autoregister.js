const { AdminModel } = require('../models/admin.model');
const { getHashPassword } = require('./getpassword.password');
const logger = require('./logger');

exports.AdminRegisterAuto = async () => {
    try {
        const { ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD} = process.env;
        
        if (!ADMIN_USERNAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
            logger.error('Admin auto-registration requires ADMIN_USERNAME, ADMIN_EMAIL, and ADMIN_PASSWORD in .env');
            return;
        }
        
        const admin = await AdminModel.findOne({ email: ADMIN_EMAIL });
        if (admin) {
            logger.info('Admin already registered');
            return;
        }
        
        const password = await getHashPassword(ADMIN_PASSWORD);
        if (!password) {
            logger.error('Hash Password generation failed');
            return;
        }
        
        const newAdmin = new AdminModel({email:ADMIN_EMAIL,password,username:ADMIN_USERNAME,role:'ADMIN' });
        await newAdmin.save();
        logger.info('Admin registered successfully', { username: ADMIN_USERNAME, email: ADMIN_EMAIL });
    } catch (error) {
        logger.error('Admin auto-registration failed', { error: error.message });
    }
}