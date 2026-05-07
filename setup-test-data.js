const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers([
  "8.8.8.8",
  "8.8.4.4",
  "1.1.1.1",
  "1.0.0.1"
]);

const { UserModel } = require('./models/user.model');
const { IncomeModel } = require('./models/income.model');
const { TransactionModel } = require('./models/transaction.model');
const { CommissionIncome } = require('./models/commission.model');
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

async function createUser(username, walletAddress, sponsorUser = null) {
  const id = generateCustomId({ prefix: 'BT7', min: 7, max: 7 });
  
  const newUser = new UserModel({
    id,
    username,
    account: walletAddress,
    referralLink: id,
    sponsor: sponsorUser ? sponsorUser._id : null,
    investment: 0,
    partners: [],
    teamMembers: [],
    totalTeam: 0,
  });

  const newIncomes = new IncomeModel({ user: newUser._id });
  newUser.incomeDetails = newIncomes._id;
  
  if (sponsorUser) {
    sponsorUser.partners.push(newUser._id);
    await sponsorUser.save();
  }

  const token = await getToken(newUser);
  newUser.token.token = token;
  newUser.active.isVerified = true;
  newUser.active.isActive = false;

  await newIncomes.save();
  await newUser.save();

  if (sponsorUser) {
    await addToSponsorTeam(newUser._id, sponsorUser._id);
  }

  // console.log(`   Created: ${username} (${id}) - Sponsor: ${sponsorUser ? sponsorUser.username : 'None'}`);

  return newUser;
}

async function addInvestment(user, amount) {
  const txHash = '0x' + Math.random().toString(16).substr(2, 64);
  
  user.investment = (user.investment || 0) + amount;
  user.active.isActive = true;
  user.active.activeDate = new Date();
  await user.save();

  await TransactionModel.create({
    user: user._id,
    investment: amount,
    type: 'Deposit',
    status: 'Completed',
    clientAddress: user.account,
    mainAddress: process.env.WALLET_ADDRESS,
    hash: txHash,
    role: 'USER',
  });

  // console.log(`  💰 Investment added: $${amount} for ${user.username}`);
}

async function addReferralIncome(user, fromUser, amount) {
  await CommissionIncome.create({
    user: user._id,
    fromUser: fromUser._id,
    income: amount,
    type: 'Referral Income',
  });
  // console.log(`  💵 Referral Income: $${amount} for ${user.username} from ${fromUser.username}`);
}

async function addTradingIncome(user, amount) {
  await CommissionIncome.create({
    user: user._id,
    income: amount,
    type: 'Trading Profit Income',
  });
  // console.log(`  📈 Trading Income: $${amount} for ${user.username}`);
}

async function setupDatabase() {
  try {
    // console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.DATABASE_URL, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    // console.log('✅ Connected to MongoDB\n');

    // Clear all collections
    // console.log('🗑️  Clearing database...');
    await UserModel.deleteMany({});
    await IncomeModel.deleteMany({});
    await TransactionModel.deleteMany({});
    await CommissionIncome.deleteMany({});
    // console.log('✅ Database cleared\n');

    // console.log('👥 Creating users...\n');

    // Create Root User (User1)
    // console.log('1️⃣  Creating Root User...');
    const user1 = await createUser('RootUser', '0x1111111111111111111111111111111111111111');
    await addInvestment(user1, 10000);
    await addTradingIncome(user1, 350);
    // console.log(`   ✅ ${user1.username} (${user1.id}) - Investment: $10000\n`);

    // Create User2 (Direct under User1)
    // console.log('2️⃣  Creating User2...');
    const user2 = await createUser('User2', '0x2222222222222222222222222222222222222222', user1);
    await addInvestment(user2, 5000);
    await addReferralIncome(user1, user2, 250); // 5% of 5000
    await addTradingIncome(user2, 175);
    // console.log(`   ✅ ${user2.username} (${user2.id}) - Investment: $5000\n`);

    // Create User3 (Direct under User1)
    // console.log('3️⃣  Creating User3...');
    const user3 = await createUser('User3', '0x3333333333333333333333333333333333333333', user1);
    await addInvestment(user3, 3000);
    await addReferralIncome(user1, user3, 150); // 5% of 3000
    await addTradingIncome(user3, 105);
    // console.log(`   ✅ ${user3.username} (${user3.id}) - Investment: $3000\n`);

    // Create User4 (Under User2)
    // console.log('4️⃣  Creating User4...');
    const user4 = await createUser('User4', '0x4444444444444444444444444444444444444444', user2);
    await addInvestment(user4, 2000);
    await addReferralIncome(user2, user4, 100); // 5% of 2000
    await addTradingIncome(user4, 70);
    // console.log(`   ✅ ${user4.username} (${user4.id}) - Investment: $2000\n`);

    // Create User5 (Under User2)
    // console.log('5️⃣  Creating User5...');
    const user5 = await createUser('User5', '0x5555555555555555555555555555555555555555', user2);
    await addInvestment(user5, 1500);
    await addReferralIncome(user2, user5, 75); // 5% of 1500
    await addTradingIncome(user5, 52.5);
    // console.log(`   ✅ ${user5.username} (${user5.id}) - Investment: $1500\n`);

    // Create User6 (Under User3)
    // console.log('6️⃣  Creating User6...');
    const user6 = await createUser('User6', '0x6666666666666666666666666666666666666666', user3);
    await addInvestment(user6, 2500);
    await addReferralIncome(user3, user6, 125); // 5% of 2500
    await addTradingIncome(user6, 87.5);
    // console.log(`   ✅ ${user6.username} (${user6.id}) - Investment: $2500\n`);

    // Create User7 (Under User4)
    // console.log('7️⃣  Creating User7...');
    const user7 = await createUser('User7', '0x7777777777777777777777777777777777777777', user4);
    await addInvestment(user7, 1000);
    await addReferralIncome(user4, user7, 50); // 5% of 1000
    await addTradingIncome(user7, 35);
    // console.log(`   ✅ ${user7.username} (${user7.id}) - Investment: $1000\n`);

    // Create User8 (Under User5)
    // console.log('8️⃣  Creating User8...');
    const user8 = await createUser('User8', '0x8888888888888888888888888888888888888888', user5);
    await addInvestment(user8, 800);
    await addReferralIncome(user5, user8, 40); // 5% of 800
    await addTradingIncome(user8, 28);
    // console.log(`   ✅ ${user8.username} (${user8.id}) - Investment: $800\n`);

    // Create User9 (Under User6)
    // console.log('9️⃣  Creating User9...');
    const user9 = await createUser('User9', '0x9999999999999999999999999999999999999999', user6);
    await addInvestment(user9, 1200);
    await addReferralIncome(user6, user9, 60); // 5% of 1200
    await addTradingIncome(user9, 42);
    // console.log(`   ✅ ${user9.username} (${user9.id}) - Investment: $1200\n`);

    // Create User10 (Under User7)
    // console.log('🔟 Creating User10...');
    const user10 = await createUser('User10', '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', user7);
    await addInvestment(user10, 500);
    await addReferralIncome(user7, user10, 25); // 5% of 500
    await addTradingIncome(user10, 17.5);
    // console.log(`   ✅ ${user10.username} (${user10.id}) - Investment: $500\n`);

    // Summary
    // console.log('\n' + '='.repeat(60));
    // console.log('📊 SUMMARY');
    // console.log('='.repeat(60));
    // console.log(`Total Users Created: 10`);
    // console.log(`Total Investment: $28,500`);
    // console.log(`\nHierarchy Structure:`);
    // console.log(`${user1.username} (${user1.id}) - $10,000`);
    // console.log(`├── ${user2.username} (${user2.id}) - $5,000`);
    // console.log(`│   ├── ${user4.username} (${user4.id}) - $2,000`);
    // console.log(`│   │   └── ${user7.username} (${user7.id}) - $1,000`);
    // console.log(`│   │       └── ${user10.username} (${user10.id}) - $500`);
    // console.log(`│   └── ${user5.username} (${user5.id}) - $1,500`);
    // console.log(`│       └── ${user8.username} (${user8.id}) - $800`);
    // console.log(`└── ${user3.username} (${user3.id}) - $3,000`);
    // console.log(`    └── ${user6.username} (${user6.id}) - $2,500`);
    // console.log(`        └── ${user9.username} (${user9.id}) - $1,200`);
    // console.log('='.repeat(60));
    // console.log(`\n✅ Root User Referral Code: ${user1.referralLink}`);
    // console.log(`✅ Use this to create more users under RootUser\n`);

    await mongoose.disconnect();
    // console.log('✅ Database setup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

setupDatabase();
