const mongoose = require('mongoose');
const { UserModel } = require('./models/user.model');
const { IncomeModel } = require('./models/income.model');
const { generateCustomId } = require('./utils/generator.uniqueid');
const { getToken } = require('./utils/token.generator');

require('dotenv').config();

async function addToSponsorTeam(userId, sponsorId) {
  let sponsor = await UserModel.findById(sponsorId);
  while (sponsor !== null) {
    sponsor.totalTeam += 1;
    sponsor.teamMembers.push(userId);
    await sponsor.save();
    sponsor = sponsor.sponsor ? await UserModel.findById(sponsor.sponsor) : null;
  }
}

async function registerUser() {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    // console.log('✅ Connected to MongoDB');

    const REFERRAL_CODE = 'BT73560296';
    const walletAddress = '0x' + Math.random().toString(16).substr(2, 40);
    const username = 'TestUser' + Math.floor(Math.random() * 10000);

    // console.log('\n🔄 Creating user with referral:', REFERRAL_CODE);
    // console.log('Wallet:', walletAddress);
    // console.log('Username:', username);

    const sponsorFind = await UserModel.findOne({ referralLink: REFERRAL_CODE });
    if (!sponsorFind) {
      console.error('❌ Sponsor not found with referral:', REFERRAL_CODE);
      process.exit(1);
    }

    const id = generateCustomId({ prefix: 'BT7', min: 7, max: 7 });
    const newUser = new UserModel({
      id,
      username,
      account: walletAddress,
      referralLink: id,
      sponsor: sponsorFind._id,
    });

    const newIncomes = new IncomeModel({ user: newUser._id });
    newUser.incomeDetails = newIncomes._id;
    sponsorFind.partners.push(newUser._id);
    
    const token = await getToken(newUser);
    newUser.token.token = token;
    newUser.active.isVerified = true;
    newUser.active.isActive = false;

    await newIncomes.save();
    await newUser.save();
    await sponsorFind.save();
    await addToSponsorTeam(newUser._id, sponsorFind._id);

    // console.log('\n✅ User created successfully!');
    // console.log('User ID:', newUser.id);
    // console.log('Username:', newUser.username);
    // console.log('Wallet:', newUser.account);
    // console.log('Sponsor:', sponsorFind.username, '(' + sponsorFind.id + ')');
    // console.log('Referral Link:', newUser.referralLink);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

registerUser();
