const { IncomeModel } = require("../models/income.model");
const { UserModel } = require("../models/user.model");
const { generateCustomId } = require("../utils/generator.uniqueid");
const { getToken } = require("../utils/token.generator");
const logger = require("../utils/logger");
const bcrypt = require("bcryptjs");

async function addToSponsorTeam(userId, sponsorId) {
  try {
    let sponsor = await UserModel.findById(sponsorId);
    if (!sponsor) throw new Error("Sponsor not found.");
    while (sponsor !== null) {
      sponsor.totalTeam += 1;
      sponsor.teamMembers.push(userId);
      await sponsor.save();
      sponsor = sponsor.sponsor ? await UserModel.findById(sponsor.sponsor) : null;
    }
  } catch (error) {
    console.error("Error adding user to sponsor team:", error.message);
  }
}

exports.WalletRegister = async (req, res) => {
  const { email, password, username, referral, mobile, telegram } = req.body;
  try {
    if (!username || !password)
      return res.status(400).json({ success: false, message: "Username and password required." });

    if (!referral)
      return res.status(400).json({ success: false, message: "Referral code is required." });
    // At least one contact required
    if (!email && !mobile && !telegram)
      return res.status(400).json({ success: false, message: "At least one of Email, Mobile, or Telegram ID is required." });

    // Check email uniqueness only if provided
    if (email) {
      const existing = await UserModel.findOne({ email });
      if (existing)
        return res.status(400).json({ success: false, message: "Email already registered." });
    }

    // Check telegram uniqueness only if provided
    if (telegram) {
      const existingTg = await UserModel.findOne({ telegram });
      if (existingTg)
        return res.status(400).json({ success: false, message: "Telegram ID already registered." });
    }

    // Check mobile uniqueness only if provided
    if (mobile) {
      const existingMobile = await UserModel.findOne({ mobile });
      if (existingMobile)
        return res.status(400).json({ success: false, message: "Mobile number already registered." });
    }

    const id = generateCustomId({ prefix: "BT7", min: 7, max: 7 });

    let sponsorFind = null;
    if (referral) {
      sponsorFind = await UserModel.findOne({ referralLink: referral });
      if (!sponsorFind)
        return res.status(400).json({ success: false, message: "Invalid referral code." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new UserModel({
      id,
      username,
      email,
      ...(mobile && { mobile }),
      ...(telegram && { telegram }),
      password: hashedPassword,
      referralLink: id,
      ...(sponsorFind && { sponsor: sponsorFind._id }),
    });

    const newIncomes = new IncomeModel({ user: newUser._id });
    newUser.incomeDetails = newIncomes._id;

    if (sponsorFind) {
      sponsorFind.partners.push(newUser._id);
      await sponsorFind.save();
    }

    const token = await getToken(newUser);
    newUser.token.token = token;
    newUser.active.isVerified = true;
    newUser.active.isActive = false;

    await newIncomes.save();
    await newUser.save();

    if (sponsorFind) await addToSponsorTeam(newUser._id, sponsorFind._id);

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    };
    res.cookie("BT7", token, cookieOptions);

    logger.info('Registration successful', { userId: newUser._id, email, username, ip: req.ip });

    return res.status(200).json({ success: true, message: "Registered successfully.", token, data: newUser, role: newUser.role });
  } catch (error) {
    logger.error('Registration error', { error: error.message, ip: req.ip });
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.WalletLogin = async (req, res) => {
  try {
    const { loginType, identifier, password } = req.body;
    // loginType: 'email' | 'mobile' | 'telegram'

    if (!identifier || !password)
      return res.status(400).json({ success: false, message: 'Identifier and password required.' });

    let query = {};
    if (loginType === 'mobile')   query = { mobile: identifier };
    else if (loginType === 'telegram') query = { telegram: identifier };
    else query = { email: identifier };

    const user = await UserModel.findOne(query).populate('incomeDetails sponsor');

    if (!user)
      return res.status(400).json({ success: false, message: 'Account not found. Please sign up first.' });

    if (user.active.isBlocked)
      return res.status(400).json({ success: false, message: 'Your account has been blocked. Please contact the admin.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ success: false, message: 'Incorrect password.' });

    const token = await getToken(user);
    user.token.token = token;
    await user.save();

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    };
    res.cookie('BT7', token, cookieOptions);

    logger.info('Login successful', { userId: user._id, loginType, username: user.username, ip: req.ip });

    return res.status(200).json({ success: true, message: "Login successful.", token, data: user, role: user.role });
  } catch (error) {
    logger.error('Login error', { error: error.message, ip: req.ip });
    res.status(500).json({ success: false, message: error.message });
  }
};
