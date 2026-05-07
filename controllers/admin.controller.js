const { AdminModel } = require("../models/admin.model");
const { CommissionIncome } = require("../models/commission.model");
const { PackageModel } = require("../models/package.model");
const { TransactionModel } = require("../models/transaction.model");
const { UserModel } = require("../models/user.model");
const { generateCustomId } = require("../utils/generator.uniqueid");
const { getComparePassword, getHashPassword } = require("../utils/getpassword.password");
const { getDirectPartnersDownlines } = require("../utils/getteams.downline");
const { getToken } = require("../utils/token.generator");
const { RewardModel } = require("../models/reward.model");
const { IncomeModel } = require("../models/income.model");
const { encryptData } = require("../utils/encrypt.data");
const { DollarBankModel } = require("../models/dollarBank.model");
const logger = require("../utils/logger");

exports.AdminProfile = async (req, res) => {
    try {
        const user = await AdminModel.findById(req.admin._id);
        return res.status(201).json({ success: true, message: "Admin Dashboard", data: user, role: user.role, token: user.token });

    } catch (error) {

        return res.status(500).json({ success: false, message: error.message });
    }
}

exports.AdminLogin = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: "Email and password are required." });
    
    try {
        const admin = await AdminModel.findOne({ email });
        if (!admin) {
            logger.warn('Admin login failed - Invalid email', { email, ip: req.ip });
            return res.status(400).json({ success: false, message: "Invalid email or password." });
        }

        const isMatch = await getComparePassword(admin, password);
        if (!isMatch) {
            logger.warn('Admin login failed - Invalid password', { email, ip: req.ip });
            return res.status(400).json({ success: false, message: "Invalid email or password." });
        }
        
        const token = await getToken(admin);
        admin.token = token;
        await admin.save();
        
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000
        };
        
        res.cookie('bsg_admin', token, cookieOptions);
        
        logger.info('Admin login successful', { adminId: admin._id, email: admin.email, ip: req.ip });
        
        return res.status(200).json({ 
            success: true, 
            message: "Logged in successfully.", 
            data: admin, 
            role: admin.role, 
            token 
        });
    } catch (error) {
        logger.error('Admin login error', { email, error: error.message, ip: req.ip });
        return res.status(500).json({ success: false, message: error.message });
    }
}

exports.ChangePassword = async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return res.status(400).json({ success: false, message: 'Both old and new passwords are required.' });
    try {
        const user = await AdminModel.findById(req.admin._id);
        if (!user) return res.status(404).json({ success: false, message: 'Admin not found' });
        const isMatch = await getComparePassword(user, oldPassword);
        if (!isMatch) return res.status(400).json({ success: false, message: 'Old password is incorrect' });
        const hashPassword = await getHashPassword(newPassword)
        user.password = hashPassword;
        await user.save();
        res.status(200).json({ success: true, message: 'Password changed successfully' });
    } catch (error) {

        res.status(500).json({ success: false, message: 'Server error' });
    }
}

exports.AdminLogout = async (req, res) => {
    try {
        const token = req.cookies?.bsg_admin;
        const admin = await AdminModel.findById(req.admin._id);
        
        if (admin && token) {
            admin.token = null;
            if (!admin.tokenBlock) admin.tokenBlock = [];
            admin.tokenBlock.push(token);
            await admin.save();
            
            logger.info('Admin logout successful', { adminId: admin._id, email: admin.email });
        }
        
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
        };
        
        res.clearCookie('bsg_admin', cookieOptions);
        
        return res.status(200).json({ success: true, message: 'Admin Logout successful' });
    } catch (error) {
        logger.error('Admin logout error', { error: error.message });
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
}

exports.AdminCreate = async (req, res) => {
    try {
        const { email, mobile, password, role } = req.body;
        if (!email || !mobile || !password || !role) return res.status(500).json({ success: false, message: "All field are required." });
        const adminFind = await AdminModel.findOne({ email });
        if (adminFind) return res.status(500).json({ success: false, message: "Admin already exist." });
        const newPassword = await getHashPassword(password);
        const id = await generateCustomId({ prefix: "XIO-ADMIN", min: 5, max: 5 })
        const newAdmin = new AdminModel({ id, email, mobile, password: newPassword, role });
        await newAdmin.save();
        return res.status(201).json({ success: true, message: "Admin created successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}
exports.AdminUpdate = async (req, res) => {
    try {
        const { email, mobile, password, role } = req.body;
        const adminFind = await AdminModel.findOne(req.params.id);
        if (!adminFind) return res.status(500).json({ success: false, message: "Admin already exist." });
        const newPassword = await getHashPassword(password);
        if (password) adminFind.password = newPassword;
        if (email) adminFind.email = email;
        if (mobile) adminFind.mobile = mobile;
        if (role) adminFind.role = role;
        await adminFind.save()
        return res.status(201).json({ success: true, message: "Admin updated successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}
exports.AdminDelete = async (req, res) => {
    try {
        const adminFind = await AdminModel.findByIdAndDelete(req.params.id);
        if (!adminFind) return res.status(500).json({ success: false, message: "Admin already exist." });
        return res.status(201).json({ success: true, message: "Admin deleted successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}


exports.getAllPartners = async (req, res) => {
    try {
        const history = await UserModel.find({}, { sponsor: 1, account: 1, username: 1, createdAt: 1, active: 1, id: 1, referralLink: 1, investment: 1, partners: 1 })
        .populate("username email mobile country countryCode")
        .populate([{ path: "sponsor", select: "id username email mobile country countryCode -_id" }])
        .sort({ createdAt: 1 });
        res.status(200).json({ success: true, data: history, message: "Get All Partners successfully." })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}

exports.getUser = async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) res.status(500).json({ success: false, message: "username is required." });
        const user = await UserModel.findOne({ id: username });
        if (!user) res.status(500).json({ success: false, data: user, message: "User not found." });
        const packageFind = await PackageModel.findOne({ title: "LIVE AC" });
        if (!packageFind) return res.status(500).json({ success: false, message: "Package not found." });
        const tx = await TransactionModel.aggregate([
            { $match: { user: user._id, package: packageFind._id, type: "Deposit" } },
            { $group: { _id: null, totalInvestment: { $sum: "$investment" }, transactions: { $push: "$$ROOT" } } }
        ]);
        const totalInvestment = tx[0]?.totalInvestment || 0;
        res.status(200).json({ success: true, data: { ...user._doc, totalLivetrade: totalInvestment }, message: "Get User successfully." })
    } catch (error) {
        // console.log(error);
        res.status(500).json({ success: false, message: error.message })
    }
}

//  ----------------- USER BLOCK START --------------------------------
exports.UserBlock = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) res.status(500).json({ success: false, message: "ID is required." });
        const history = await UserModel.findById(id);
        if (!history) res.status(500).json({ success: true, data: history, message: "User not found." });
        history.active.isBlocked = !history.active.isBlocked;
        await history.save();
        const message = history.active.isBlocked ? 'block' : 'unblock';
        res.status(200).json({ success: true, data: history, message: `User ${message}ed successfully.` })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}
//  ----------------- USER BLOCK END --------------------------------

exports.UserROIBlock = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) res.status(500).json({ success: false, message: "ID is required." });
        const history = await UserModel.findById(id);
        if (!history) res.status(500).json({ success: true, data: history, message: "User not found." });
        history.active.isRoiBlocked = !history.active.isRoiBlocked;
        await history.save();
        const message = history.active.isRoiBlocked ? 'block' : 'unblock';
        res.status(200).json({ success: true, data: history, message: `User Roi ${message}ed successfully.` })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}

exports.UserCurrentIncomeHold = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) res.status(500).json({ success: false, message: "ID is required." });
        const history = await UserModel.findById(id);
        if (!history) res.status(500).json({ success: true, data: history, message: "User not found." });
        history.active.isCurrentIncomeHold = !history.active.isCurrentIncomeHold;
        await history.save();
        const message = history.active.isCurrentIncomeHold ? 'block' : 'unblock';
        res.status(200).json({ success: true, data: history, message: `User Current Income ${message}ed successfully.` })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}

//  ----------------- CAPITAL LOCK/UNLOCK START --------------------------------
exports.UserCapitalLock = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return res.status(500).json({ success: false, message: "ID is required." });
        const user = await UserModel.findById(id);
        if (!user) return res.status(500).json({ success: false, message: "User not found." });
        
        // Toggle capital lock status
        user.active.isCapitalLocked = !user.active.isCapitalLocked;
        await user.save();
        
        const message = user.active.isCapitalLocked ? 'locked' : 'unlocked';
        const capitalAmount = user.investment || 0;
        
        res.status(200).json({ 
            success: true, 
            data: {
                user: user,
                capitalAmount: capitalAmount,
                isCapitalLocked: user.active.isCapitalLocked
            }, 
            message: `User capital amount ($${capitalAmount}) has been ${message} successfully.` 
        })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}
//  ----------------- CAPITAL LOCK/UNLOCK END --------------------------------

exports.updateUserInfo = async (req, res) => {
    try {
        const { id } = req.params;
        const { account, username, email, mobile, country, countryCode, password } = req.body;

        if (!id)
            return res.status(400).json({ success: false, message: "User ID is required." });

        const user = await UserModel.findById(id);
        if (!user)
            return res.status(404).json({ success: false, message: "User not found." });

        // Update only provided fields
        if (account) user.account = account;
        if (username) user.username = username;
        if (email) user.email = email;
        if (mobile) user.mobile = mobile;
        if (country) user.country = country;
        if (countryCode) user.countryCode = countryCode;

        // Encrypt password only if non-empty string is provided
        if (typeof password === 'string' && password.trim() !== '') {
            user.password = await encryptData(password.trim());
        }

        await user.save();

        // Don't return password in response
        const userObj = user.toObject();
        delete userObj.password;

        res.status(200).json({
            success: true,
            data: userObj,
            message: password ? "User info and password updated successfully." : "User info updated successfully.",
        });
    } catch (error) {
        console.error("Error in updateUserInfo:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getTradingProfitIncomes = async (req, res) => {
    try {
        const history = await CommissionIncome.find({ type: "Trading Profit Income" }).populate([{ path: "user", select: 'id username -_id' }, { path: "package", select: "title -_id" }])
        const totalIncome = history.reduce((sum, investment) => sum + investment.income, 0);
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const todayLevelIncome = history.filter(investment => investment.createdAt >= startOfToday);
        const todayTotal = todayLevelIncome.reduce((sum, investment) => sum + investment.income, 0);
        res.status(200).json({ success: true, message: "Trading Profit Incomes Reports", data: { history, totalIncome, todayTotal } })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}
exports.getLevelIncomes = async (req, res) => {
    try {
        const history = await CommissionIncome.find({ type: "Level Income" }).populate({ path: "user fromUser", select: 'id username -_id' })
        const totalIncome = history.reduce((sum, investment) => sum + investment.income, 0);
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const todayLevelIncome = history.filter(investment => investment.createdAt >= startOfToday);
        const todayTotal = todayLevelIncome.reduce((sum, investment) => sum + investment.income, 0);
        res.status(200).json({ success: true, message: "Level Incomes Reports", data: { history, totalIncome, todayTotal } })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}
exports.getMatchingIncomes = async (req, res) => {
    try {
        const history = await CommissionIncome.find({ type: "Matching Income" }).populate({ path: "user", select: 'id username -_id' })
        const totalIncome = history.reduce((sum, investment) => sum + investment.income, 0);
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const todayLevelIncome = history.filter(investment => investment.createdAt >= startOfToday);
        const todayTotal = todayLevelIncome.reduce((sum, investment) => sum + investment.income, 0);
        res.status(200).json({ success: true, message: "Matching Income Reports", data: { history, totalIncome, todayTotal } })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}
exports.getGlobalAchieverIncomes = async (req, res) => {
    try {
        const history = await CommissionIncome.find({ type: "Global Archive Reward" }).populate([{ path: "user", select: 'id username -_id' }, { path: "reward", select: '-users' }])
        const totalIncome = history.reduce((sum, investment) => sum + investment.income, 0);
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const todayLevelIncome = history.filter(investment => investment.createdAt >= startOfToday);
        const todayTotal = todayLevelIncome.reduce((sum, investment) => sum + investment.income, 0);
        res.status(200).json({ success: true, message: "Global Archive Reward Reports", data: { history, totalIncome, todayTotal } })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}
exports.getRankRewardIncomes = async (req, res) => {
    try {
        const history = await CommissionIncome.find({ type: "Rank Reward" }).populate([{ path: "user", select: 'id username -_id' }, { path: "reward", select: '-users' }])
        res.status(200).json({ success: true, message: "Monthly Incomes Reports", data: { history } })
    } catch (error) {
        // console.log(error)
        res.status(500).json({ success: false, message: error.message })
    }
};
exports.getLiveTradingIncomes = async (req, res) => {
    try {
        const history = await CommissionIncome.find({ type: "Live Trading Income" }).populate([{ path: "user", select: 'id username -_id' }, { path: "reward", select: '-users' }])
        res.status(200).json({ success: true, message: "Monthly Incomes Reports", data: { history } })
    } catch (error) {
        // console.log(error)
        res.status(500).json({ success: false, message: error.message })
    }
};

exports.getReferralIncomes = async (req, res) => {
    try {
        const history = await CommissionIncome.find({ type: "Referral Income" }).populate([{ path: "user fromUser", select: "id username -_id" }])
        const totalIncome = history.reduce((sum, investment) => sum + investment.income, 0);
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const todayReferralIncome = history.filter(investment => investment.createdAt >= startOfToday);
        const todayTotal = todayReferralIncome.reduce((sum, investment) => sum + investment.income, 0);
        res.status(200).json({ success: true, message: "Referral Incomes Reports", data: { history, totalIncome, todayTotal } })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}
exports.getInvestmentReports = async (req, res) => {
    try {
        const history = await TransactionModel.find({ type: "Deposit" }).populate({ path: "user", select: 'id username -_id' })
        const total = history.reduce((total, investment) => total + investment.investment, 0);
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const todayInvestments = history.filter(txn => txn.createdAt >= startOfToday);
        const todayTotal = todayInvestments.reduce((sum, txn) => sum + txn.investment, 0);
        res.status(200).json({ success: true, message: "Deposit Reports", data: { history, total, today: todayTotal } })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
};

exports.getWithdrawReports = async (req, res) => {
    try {
        const history = await TransactionModel.find({ type: "Withdrawal" }).populate({ path: "user", select: 'id username -_id' }).sort({ createdAt: -1 });
        
        // Calculate totals
        const total = history.reduce((total, investment) => total + (investment.investment || 0), 0);
        const totalGasFee = history.reduce((total, txn) => total + (txn.gasFee || 0), 0);
        const totalNetAmount = history.reduce((total, txn) => total + (txn.netAmount || 0), 0);
        
        // Today's calculations
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const todayInvestments = history.filter(txn => txn.createdAt >= startOfToday);
        const todayTotal = todayInvestments.reduce((sum, txn) => sum + (txn.investment || 0), 0);
        const todayGasFee = todayInvestments.reduce((sum, txn) => sum + (txn.gasFee || 0), 0);
        const todayNetAmount = todayInvestments.reduce((sum, txn) => sum + (txn.netAmount || 0), 0);
        
        res.status(200).json({ 
            success: true, 
            message: "Withdrawal Reports", 
            data: { 
                history, 
                summary: {
                    total: total, // Total withdrawal requests
                    totalGasFee: totalGasFee, // Total gas fees collected
                    totalNetAmount: totalNetAmount, // Total amount to be paid to users
                    today: todayTotal,
                    todayGasFee: todayGasFee,
                    todayNetAmount: todayNetAmount
                }
            } 
        })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
};

exports.getIncomeSummary = async (req, res) => {
    try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const users = await UserModel.countDocuments();
        const userActive = await UserModel.countDocuments({ 'active.isActive': true });
        const userInactive = await UserModel.countDocuments({ 'active.isActive': false });

        const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

        const incomeSources = {
            liveTrading: { model: CommissionIncome, field: "income", match: { type: "Live Trading Income" } },
            trading: { model: CommissionIncome, field: "income", match: { type: "Trading Profit Income" } },
            level: { model: CommissionIncome, field: "income", match: { type: "Level Income" } },
            globalAchiever: { model: CommissionIncome, field: "income", match: { type: "Global Archive Reward" } },
            matching: { model: CommissionIncome, field: "income", match: { type: "Matching Income" } },
            referral: { model: CommissionIncome, field: "income", match: { type: "Referral Income" } },
            transaction: { model: TransactionModel, field: "investment", match: { type: "Deposit" } },
            withdraw: { model: TransactionModel, field: "investment", match: { type: "Withdrawal" } },
        };

        const results = {};
        let totalIncome = 0;
        let todayIncome = 0;

        const promises = [];

        for (const key in incomeSources) {
            const { model, field, match = {} } = incomeSources[key];

            // Total income
            promises.push(
                model.aggregate([
                    { $match: match },
                    { $group: { _id: null, total: { $sum: `$${field}` } } },
                ])
            );

            // Today's income
            promises.push(
                model.aggregate([
                    { $match: { ...match, createdAt: { $gte: todayStart, $lte: todayEnd } } },
                    { $group: { _id: null, total: { $sum: `$${field}` } } },
                ])
            );
        }

        const allResults = await Promise.all(promises);

        Object.keys(incomeSources).forEach((key, i) => {
            const total = allResults[i * 2]?.[0]?.total || 0;
            const today = allResults[i * 2 + 1]?.[0]?.total || 0;

            results[`total${capitalize(key)}`] = total;
            results[`today${capitalize(key)}`] = today;

            if (["liveTrading", "trading", "level", "matching", "globalAchiever", "referral"].includes(key)) {
                totalIncome += total;
                todayIncome += today;
            }
        });
        return res.status(200).json({ success: true, message: "Income Summary", data: { ...results, totalIncome, todayIncome, users, userActive, userInactive } });
    } catch (error) {
        console.error("Income Summary Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};


exports.getDirectDownline = async (req, res) => {
    try {
        const downline = await getDirectPartnersDownlines({ userId: req.params.id });
        res.status(200).json({ success: true, data: downline })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}

exports.getAdminToDashboardUser = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) return res.status(500).json({ success: false, message: "username is required." });
        const [userDoc, adminDoc] = await Promise.all([
            UserModel.findById(id).populate('incomeDetails', 'income').populate("sponsor"),
            AdminModel.findById(id)
        ]);

        const account = userDoc || adminDoc;
        const accountType = userDoc ? 'user' : adminDoc ? 'admin' : null;

        if (!account) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        //     if (account.active.isBlocked) return res.status(400).json({ success: false, message: 'Your account has been blocked. Please contact the admin.' });
        const token = await getToken(account);
        if (!token) return res.status(500).json({
            success: false, message:
                "Token generation failed."
        });
        account.token.token = token;
        await account.save();
        res.cookie('hts', token, { httpOnly: true, secure: true, sameSite: 'Strict', path: '/', maxAge: 30 * 24 * 60 * 60 * 1000 });
        return res.status(200).json({ success: true, message: `Login successfully.`, token, data: account, role: account.role, admin: 'back' });
    } catch (error) {
        // console.log(error);
        return res.status(500).json({ success: false, message: error.message });
    }
}
exports.getAdminStats = async (req, res) => {
    try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        // Users
        const users = await UserModel.countDocuments();
        const userActive = await UserModel.countDocuments({ 'active.isActive': true });
        const userInactive = await UserModel.countDocuments({ 'active.isActive': false });

        // Incomes (today + total) from Commission table
        const todayIncomeAgg = await CommissionIncome.aggregate([
            { $match: { createdAt: { $gte: startOfDay } } },
            { $group: { _id: null, total: { $sum: "$income" } } }
        ]);
        const totalIncomeAgg = await CommissionIncome.aggregate([
            { $group: { _id: null, total: { $sum: "$income" } } }
        ]);

        // Referral Income
        const todayReferralAgg = await CommissionIncome.aggregate([
            { $match: { type: "Referral Income", createdAt: { $gte: startOfDay } } },
            { $group: { _id: null, total: { $sum: "$income" } } }
        ]);
        const totalReferralAgg = await CommissionIncome.aggregate([
            { $match: { type: "Referral Income" } },
            { $group: { _id: null, total: { $sum: "$income" } } }
        ]);

        // Level Income
        const todayLevelAgg = await CommissionIncome.aggregate([
            { $match: { type: "Level Income", createdAt: { $gte: startOfDay } } },
            { $group: { _id: null, total: { $sum: "$income" } } }
        ]);
        const totalLevelAgg = await CommissionIncome.aggregate([
            { $match: { type: "Level Income" } },
            { $group: { _id: null, total: { $sum: "$income" } } }
        ]);

        // Matching Income
        const todayMatchingAgg = await CommissionIncome.aggregate([
            { $match: { type: "Matching Income", createdAt: { $gte: startOfDay } } },
            { $group: { _id: null, total: { $sum: "$income" } } }
        ]);
        const totalMatchingAgg = await CommissionIncome.aggregate([
            { $match: { type: "Matching Income" } },
            { $group: { _id: null, total: { $sum: "$income" } } }
        ]);

        //Rank Reward Income
        const totalRankAgg = await CommissionIncome.aggregate([
            { $match: { type: "Rank Reward", } },
            { $group: { _id: null, total: { $sum: "$income" } } }
        ]);

        // Withdrawals
        const todayWithdrawAgg = await TransactionModel.aggregate([
            { $match: { type: "Withdrawal", createdAt: { $gte: startOfDay }, status: "Completed" } },
            { $group: { _id: null, total: { $sum: "$investment" } } }
        ]);
        const totalWithdrawAgg = await TransactionModel.aggregate([
            { $match: { type: "Withdrawal", status: "Completed" } },
            { $group: { _id: null, total: { $sum: "$investment" } } }
        ]);

        // Global Achievers (Reward model)
        const todayGlobalAchiever = await RewardModel.countDocuments({
            createdAt: { $gte: startOfDay }
        });
        const totalGlobalAchiever = await RewardModel.countDocuments();

        // Trading (Transaction type = Deposit with role=USER maybe)
        const todayTradingAgg = await TransactionModel.aggregate([
            { $match: { type: "Deposit", createdAt: { $gte: startOfDay } } },
            { $group: { _id: null, total: { $sum: "$investment" } } }
        ]);
        const totalTradingAgg = await TransactionModel.aggregate([
            { $match: { type: "Deposit" } },
            { $group: { _id: null, total: { $sum: "$investment" } } }
        ]);

        // Transaction (all)
        const todayTransactionAgg = await TransactionModel.aggregate([
            { $match: { createdAt: { $gte: startOfDay } } },
            { $group: { _id: null, total: { $sum: "$investment" } } }
        ]);
        const totalTransactionAgg = await TransactionModel.aggregate([
            { $group: { _id: null, total: { $sum: "$investment" } } }
        ]);


        return res.json({
            users,
            userActive,
            userInactive,
            todayIncome: todayIncomeAgg[0]?.total || 0,
            totalIncome: totalIncomeAgg[0]?.total || 0,
            todayReferral: todayReferralAgg[0]?.total || 0,
            totalReferral: totalReferralAgg[0]?.total || 0,
            todayLevel: todayLevelAgg[0]?.total || 0,
            totalLevel: totalLevelAgg[0]?.total || 0,
            todayMatching: todayMatchingAgg[0]?.total || 0,
            totalMatching: totalMatchingAgg[0]?.total || 0,
            todayWithdraw: todayWithdrawAgg[0]?.total || 0,
            totalWithdraw: totalWithdrawAgg[0]?.total || 0,
            todayGlobalAchiever,
            totalGlobalAchiever,
            totalRankReward: totalRankAgg[0]?.total || 0,
            todayTransaction: todayTransactionAgg[0]?.total || 0,
            totalTransaction: totalTransactionAgg[0]?.total || 0,
            todayTrading: todayTradingAgg[0]?.total || 0,
            totalTrading: totalTradingAgg[0]?.total || 0,
            success: true,
            message: "Admin stats fetched successfully"
        });
    } catch (err) {
        console.error("❌ Admin stats error:", err.message);
        res.status(500).json({ error: "Server error", success: false, message: err.message });
    }
};


exports.getRecentTransactions = async (req, res) => {
    try {
        const transactions = await TransactionModel.find()
            .populate("user", "username email")
            .populate("package", "title")
            .sort({ createdAt: -1 })
            .limit(10);

        return res.status(200).json({
            success: true,
            message: "Recent transactions fetched successfully",
            data: transactions
        });
    } catch (error) {
        console.error("❌ Error fetching recent transactions:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching transactions",
            error: error.message,
        });
    }
};

exports.getAllTransactions = async (req, res) => {
    try {
        const transactions = await TransactionModel.find()
            .populate("user", "username email") // populate user details
            .populate("package", "title")       // populate package details
            .sort({ createdAt: -1 });           // latest first

        return res.status(200).json({
            success: true,
            message: "All transactions fetched successfully",
            data: transactions
        });
    } catch (error) {
        console.error("❌ Error fetching all transactions:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching transactions",
            error: error.message,
        });
    }
};

exports.getIncomeHistory = async (req, res) => {
    try {

        const history = await CommissionIncome.find()
            .populate('user', 'username email')
            .populate('fromUser', 'username email')
            .populate('package', 'title')
            .populate('reward', 'title')
            .sort({ createdAt: -1 })

        return res.status(200).json({
            success: true,
            message: 'Admin Income History',
            data: history,
        });
    } catch (error) {
        console.error('Admin Income History Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error'
        });
    }
};

// ==================== DOLLAR BANK ADMIN APIs START ====================

// Get Total Dollar Bank Investment Summary
exports.getDollarBankSummary = async (req, res) => {
    try {
        const allInvestments = await DollarBankModel.find({})
            .populate({ path: "user", select: 'id username email -_id' })
            .sort({ investmentDate: -1 });

        // Calculate totals
        const totalInvestment = allInvestments.reduce(
            (sum, inv) => sum + (inv.investment || 0),
            0
        );
        const totalProfit = allInvestments.reduce(
            (sum, inv) => sum + (inv.profit || 0),
            0
        );
        const totalAmount = allInvestments.reduce(
            (sum, inv) => sum + (inv.totalAmount || 0),
            0
        );

        // Status breakdown
        const activeInvestments = allInvestments.filter(
            (inv) => inv.status === "Active"
        );
        const maturedInvestments = allInvestments.filter(
            (inv) => inv.status === "Matured"
        );
        const withdrawnInvestments = allInvestments.filter(
            (inv) => inv.status === "Withdrawn"
        );

        // Active investments totals
        const activeTotal = activeInvestments.reduce(
            (sum, inv) => sum + (inv.totalAmount || 0),
            0
        );
        const activeInvestment = activeInvestments.reduce(
            (sum, inv) => sum + (inv.investment || 0),
            0
        );
        const activeProfit = activeInvestments.reduce(
            (sum, inv) => sum + (inv.profit || 0),
            0
        );

        // Matured but not withdrawn
        const currentDate = new Date();
        const maturedButNotWithdrawn = activeInvestments.filter(
            (inv) => currentDate >= inv.maturityDate
        );
        const maturedButNotWithdrawnTotal = maturedButNotWithdrawn.reduce(
            (sum, inv) => sum + (inv.totalAmount || 0),
            0
        );

        // Today's investments
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const todayInvestments = allInvestments.filter(
            (inv) => inv.investmentDate >= startOfToday
        );
        const todayTotal = todayInvestments.reduce(
            (sum, inv) => sum + (inv.investment || 0),
            0
        );
        const todayProfit = todayInvestments.reduce(
            (sum, inv) => sum + (inv.profit || 0),
            0
        );

        // This month's investments
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const monthInvestments = allInvestments.filter(
            (inv) => inv.investmentDate >= startOfMonth
        );
        const monthTotal = monthInvestments.reduce(
            (sum, inv) => sum + (inv.investment || 0),
            0
        );

        // Unique users count
        const uniqueUsers = new Set(
            allInvestments.map((inv) => inv.user?._id?.toString()).filter(Boolean)
        );

        res.status(200).json({
            success: true,
            message: "Dollar Bank Summary",
            data: {
                summary: {
                    totalInvestments: allInvestments.length,
                    totalUsers: uniqueUsers.size,
                    totalInvestment: totalInvestment,
                    totalProfit: totalProfit,
                    totalAmount: totalAmount,
                    activeInvestments: activeInvestments.length,
                    activeInvestment: activeInvestment,
                    activeProfit: activeProfit,
                    activeTotal: activeTotal,
                    maturedInvestments: maturedInvestments.length,
                    withdrawnInvestments: withdrawnInvestments.length,
                    maturedButNotWithdrawn: maturedButNotWithdrawn.length,
                    maturedButNotWithdrawnTotal: maturedButNotWithdrawnTotal,
                    todayInvestments: todayInvestments.length,
                    todayTotal: todayTotal,
                    todayProfit: todayProfit,
                    monthInvestments: monthInvestments.length,
                    monthTotal: monthTotal,
                },
            },
        });
    } catch (error) {
        console.error("Dollar Bank Summary Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get All Users Dollar Bank Investments (with user details)
exports.getAllUsersDollarBankInvestments = async (req, res) => {
    try {
        const allInvestments = await DollarBankModel.find({})
            .populate({
                path: "user",
                select: 'id username email mobile account investment active createdAt',
            })
            .populate({
                path: "transaction",
                select: 'id investment status createdAt',
            })
            .sort({ investmentDate: -1 });

        // Group by user
        const userInvestmentsMap = new Map();

        allInvestments.forEach((inv) => {
            const userId = inv.user?._id?.toString();
            if (!userId) return;

            if (!userInvestmentsMap.has(userId)) {
                userInvestmentsMap.set(userId, {
                    user: inv.user,
                    investments: [],
                    totalInvestment: 0,
                    totalProfit: 0,
                    totalAmount: 0,
                    activeCount: 0,
                    withdrawnCount: 0,
                });
            }

            const userData = userInvestmentsMap.get(userId);
            userData.investments.push(inv);
            userData.totalInvestment += inv.investment || 0;
            userData.totalProfit += inv.profit || 0;
            userData.totalAmount += inv.totalAmount || 0;

            if (inv.status === "Active") {
                userData.activeCount++;
            } else if (inv.status === "Withdrawn") {
                userData.withdrawnCount++;
            }
        });

        // Convert map to array
        const usersInvestments = Array.from(userInvestmentsMap.values());

        // Calculate overall totals
        const totalUsers = usersInvestments.length;
        const overallTotalInvestment = usersInvestments.reduce(
            (sum, user) => sum + user.totalInvestment,
            0
        );
        const overallTotalProfit = usersInvestments.reduce(
            (sum, user) => sum + user.totalProfit,
            0
        );
        const overallTotalAmount = usersInvestments.reduce(
            (sum, user) => sum + user.totalAmount,
            0
        );

        res.status(200).json({
            success: true,
            message: "All Users Dollar Bank Investments",
            data: {
                usersInvestments: usersInvestments,
                summary: {
                    totalUsers: totalUsers,
                    totalInvestments: allInvestments.length,
                    overallTotalInvestment: overallTotalInvestment,
                    overallTotalProfit: overallTotalProfit,
                    overallTotalAmount: overallTotalAmount,
                },
            },
        });
    } catch (error) {
        console.error("All Users Dollar Bank Investments Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get Specific User's Dollar Bank Investments
exports.getUserDollarBankInvestments = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required.",
            });
        }

        // Find user by ID or username
        const user = await UserModel.findOne({
            $or: [{ _id: userId }, { id: userId }, { username: userId }],
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        const investments = await DollarBankModel.find({ user: user._id })
            .populate({
                path: "transaction",
                select: 'id investment status createdAt',
            })
            .sort({ investmentDate: -1 });

        // Calculate totals
        const totalInvestment = investments.reduce(
            (sum, inv) => sum + (inv.investment || 0),
            0
        );
        const totalProfit = investments.reduce(
            (sum, inv) => sum + (inv.profit || 0),
            0
        );
        const totalAmount = investments.reduce(
            (sum, inv) => sum + (inv.totalAmount || 0),
            0
        );

        // Status breakdown
        const activeInvestments = investments.filter(
            (inv) => inv.status === "Active"
        );
        const withdrawnInvestments = investments.filter(
            (inv) => inv.status === "Withdrawn"
        );

        // Check matured investments
        const currentDate = new Date();
        const maturedInvestments = investments.filter(
            (inv) =>
                inv.status === "Active" && currentDate >= inv.maturityDate
        );

        res.status(200).json({
            success: true,
            message: "User Dollar Bank Investments",
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    investment: user.investment,
                },
                investments: investments,
                summary: {
                    totalInvestments: investments.length,
                    totalInvestment: totalInvestment,
                    totalProfit: totalProfit,
                    totalAmount: totalAmount,
                    activeInvestments: activeInvestments.length,
                    withdrawnInvestments: withdrawnInvestments.length,
                    maturedInvestments: maturedInvestments.length,
                },
            },
        });
    } catch (error) {
        console.error("User Dollar Bank Investments Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get Dollar Bank Withdrawal Requests (Admin)
exports.getDollarBankWithdrawalRequests = async (req, res) => {
    try {
        // Find all Dollar Bank investments that have been withdrawn (status = "Withdrawn")
        // These are the withdrawal requests
        const withdrawnInvestments = await DollarBankModel.find({
            status: "Withdrawn",
            withdrawalDate: { $exists: true, $ne: null }
        })
            .populate({
                path: "user",
                select: 'id username email mobile account investment active',
            })
            .populate({
                path: "transaction",
                select: 'id investment status createdAt gasFee netAmount clientAddress type',
            })
            .sort({ withdrawalDate: -1 });

        // Build withdrawal requests array
        const withdrawalRequests = [];
        
        for (const investment of withdrawnInvestments) {
            // Get the related withdrawal transaction
            let relatedTransaction = investment.transaction;
            
            // If transaction is not populated or doesn't exist, find it
            if (!relatedTransaction || !relatedTransaction._id) {
                // Try to find transaction by matching user and amount
                relatedTransaction = await TransactionModel.findOne({
                    user: investment.user._id,
                    type: "Withdrawal",
                    investment: investment.totalAmount,
                    status: { $in: ["Processing", "Completed", "Cancelled"] }
                })
                .sort({ createdAt: -1 })
                .select('id investment status createdAt gasFee netAmount clientAddress type');
            }

            // Calculate gas fee and net amount if not in transaction
            const gasFee = relatedTransaction?.gasFee || (investment.totalAmount * 0.04);
            const netAmount = relatedTransaction?.netAmount || (investment.totalAmount - gasFee);

            withdrawalRequests.push({
                investmentId: investment.id,
                investment: investment.investment,
                profit: investment.profit,
                totalAmount: investment.totalAmount,
                investmentDate: investment.investmentDate,
                maturityDate: investment.maturityDate,
                withdrawalDate: investment.withdrawalDate,
                user: investment.user,
                transaction: relatedTransaction,
                transactionId: relatedTransaction?._id || null,
                gasFee: gasFee,
                netAmount: netAmount,
                status: relatedTransaction?.status || "Processing",
                walletAddress: relatedTransaction?.clientAddress || null,
            });
        }

        // Calculate totals
        const totalRequests = withdrawalRequests.length;
        const totalAmount = withdrawalRequests.reduce(
            (sum, req) => sum + (req.totalAmount || 0),
            0
        );
        const totalGasFee = withdrawalRequests.reduce(
            (sum, req) => sum + (req.gasFee || 0),
            0
        );
        const totalNetAmount = withdrawalRequests.reduce(
            (sum, req) => sum + (req.netAmount || 0),
            0
        );

        // Today's withdrawal requests
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const todayRequests = withdrawalRequests.filter(
            (req) => req.withdrawalDate && new Date(req.withdrawalDate) >= startOfToday
        );
        const todayTotal = todayRequests.reduce(
            (sum, req) => sum + (req.totalAmount || 0),
            0
        );

        // Pending requests (status = "Processing")
        const pendingRequests = withdrawalRequests.filter(
            (req) => req.status === "Processing"
        );
        const pendingTotal = pendingRequests.reduce(
            (sum, req) => sum + (req.totalAmount || 0),
            0
        );

        res.status(200).json({
            success: true,
            message: "Dollar Bank withdrawal requests retrieved successfully.",
            data: {
                withdrawalRequests: withdrawalRequests,
                summary: {
                    totalRequests: totalRequests,
                    totalAmount: totalAmount,
                    totalGasFee: totalGasFee,
                    totalNetAmount: totalNetAmount,
                    pendingRequests: pendingRequests.length,
                    pendingTotal: pendingTotal,
                    todayRequests: todayRequests.length,
                    todayTotal: todayTotal,
                },
            },
        });
    } catch (error) {
        console.error("Dollar Bank Withdrawal Requests Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Approve/Reject Dollar Bank Withdrawal Request (Admin)
exports.approveRejectDollarBankWithdrawal = async (req, res) => {
    try {
        const { transactionId, status } = req.body;

        // Validate input
        if (!transactionId || !status) {
            return res.status(400).json({
                success: false,
                message: "Transaction ID and Status are required.",
            });
        }

        if (!["Completed", "Cancelled"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Status must be either 'Completed' or 'Cancelled'.",
            });
        }

        // Find the withdrawal transaction
        const withdrawalTransaction = await TransactionModel.findById(transactionId)
            .populate({
                path: "user",
                select: 'id username email mobile account investment active',
            });

        if (!withdrawalTransaction) {
            return res.status(404).json({
                success: false,
                message: "Withdrawal transaction not found.",
            });
        }

        // Check if it's a withdrawal transaction
        if (withdrawalTransaction.type !== "Withdrawal") {
            return res.status(400).json({
                success: false,
                message: "This is not a withdrawal transaction.",
            });
        }

        // Find the related Dollar Bank investment
        // Match by user and amount (totalAmount)
        const dollarBankInvestment = await DollarBankModel.findOne({
            user: withdrawalTransaction.user._id,
            totalAmount: withdrawalTransaction.investment,
            status: "Withdrawn",
        });

        if (!dollarBankInvestment) {
            return res.status(404).json({
                success: false,
                message: "Dollar Bank investment not found for this withdrawal.",
            });
        }

        const user = withdrawalTransaction.user;
        const incomeDetail = await IncomeModel.findById(user.incomeDetails, {
            "income.currentIncome": 1,
            withdrawal: 1,
        });

        if (!incomeDetail) {
            return res.status(404).json({
                success: false,
                message: "Income details not found.",
            });
        }

        if (status === "Completed") {
            // Approve withdrawal
            withdrawalTransaction.status = "Completed";
            // Dollar Bank investment remains "Withdrawn"
            // Note: Admin should transfer netAmount to user's wallet
            // The gas fee (4%) is kept by admin

        } else if (status === "Cancelled") {
            // Reject withdrawal
            withdrawalTransaction.status = "Cancelled";
            
            // Revert Dollar Bank investment status
            // Check if investment is still within maturity period
            const currentDate = new Date();
            if (currentDate >= dollarBankInvestment.maturityDate) {
                dollarBankInvestment.status = "Matured"; // Investment matured but not withdrawn
            } else {
                dollarBankInvestment.status = "Active"; // Investment still active
            }
            dollarBankInvestment.withdrawalDate = null;

            // Revert the amount from current income
            // We added totalAmount when withdrawal was requested, now remove it
            incomeDetail.income.currentIncome -= dollarBankInvestment.totalAmount;
            
            // Remove from withdrawal history
            const withdrawalIndex = incomeDetail.withdrawal.history.indexOf(withdrawalTransaction._id);
            if (withdrawalIndex > -1) {
                incomeDetail.withdrawal.history.splice(withdrawalIndex, 1);
            }
        }

        // Save everything
        await withdrawalTransaction.save();
        await dollarBankInvestment.save();
        await incomeDetail.save();

        res.status(200).json({
            success: true,
            message: `Dollar Bank withdrawal request ${status === "Completed" ? "approved" : "rejected"} successfully.`,
            data: {
                transactionId: withdrawalTransaction._id,
                investmentId: dollarBankInvestment.id,
                status: withdrawalTransaction.status,
                totalAmount: dollarBankInvestment.totalAmount,
                gasFee: withdrawalTransaction.gasFee || 0,
                netAmount: withdrawalTransaction.netAmount || 0,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                },
                note: status === "Completed" 
                    ? `Transfer net amount of $${withdrawalTransaction.netAmount || 0} to user. Gas fee of $${withdrawalTransaction.gasFee || 0} is retained by admin.`
                    : "Withdrawal rejected. Amount returned to Dollar Bank investment.",
            },
        });
    } catch (error) {
        console.error("Dollar Bank Withdrawal Approve/Reject Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ==================== DOLLAR BANK ADMIN APIs END ====================


