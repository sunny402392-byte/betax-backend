const mongoose = require('mongoose');
require('dotenv').config();
const dns = require('dns');
dns.setServers([
  "8.8.8.8",
  "8.8.4.4",
  "1.1.1.1",
  "1.0.0.1"
]);
const { UserModel } = require('../models/user.model');
const { IncomeModel } = require('../models/income.model');
const { TransactionModel } = require('../models/transaction.model');
const { PackageModel } = require('../models/package.model');
const { generateCustomId } = require('../utils/generator.uniqueid');
const { sponsorIncomeCalculate } = require('../utils/levelIncome.calculation');

// Connect to database
mongoose.connect(process.env.DATABASE_URL)
  .then(() => // console.log('✅ Database connected'))
  .catch(err => console.error('❌ Database error:', err));

// Random packages
const PACKAGES = [
  { amount: 100, name: 'Package 1' },
  { amount: 500, name: 'Package 2' },
  { amount: 1000, name: 'Package 3' },
  { amount: 2000, name: 'Package 4' },
  { amount: 5000, name: 'Package 5' },
  { amount: 10000, name: 'Package 6' },
  { amount: 15000, name: 'Package 7' }
];

const getRandomPackage = () => PACKAGES[Math.floor(Math.random() * PACKAGES.length)];

async function create50Users() {
  try {
    // console.log('🚀 Starting to create 50 users in chain...\n');

    // Get or create package
    let packageDoc = await PackageModel.findOne({ title: 'Test Package' });
    if (!packageDoc) {
      packageDoc = await PackageModel.create({
        id: generateCustomId({ prefix: 'BT7-PKG', min: 10, max: 10 }),
        title: 'Test Package',
        minAmount: 100,
        maxAmount: 50000,
        percentage: 5,
        status: true
      });
    }

    let previousUser = null;
    const users = [];

    for (let i = 1; i <= 50; i++) {
      const pkg = getRandomPackage();
      const userId = generateCustomId({ prefix: 'BT7', min: 7, max: 7 });
      const username = `User${i.toString().padStart(2, '0')}`;
      const walletAddress = `0x${Math.random().toString(16).substr(2, 40)}`;

      // Create user
      const newUser = await UserModel.create({
        id: userId,
        username: username,
        email: `user${i}@test.com`,
        mobile: `+1234567${i.toString().padStart(4, '0')}`,
        account: walletAddress,
        password: 'test123',
        referralLink: `https://avifx.global/ref/${userId}`,
        sponsor: previousUser ? previousUser._id : null,
        investment: pkg.amount,
        active: {
          isVerified: true,
          isActive: true,
          isBlocked: false,
          activeDate: new Date()
        }
      });

      // Create income details
      const incomeDetails = await IncomeModel.create({
        user: newUser._id
      });
      newUser.incomeDetails = incomeDetails._id;

      // Add to sponsor's partners
      if (previousUser) {
        previousUser.partners.push(newUser._id);
        previousUser.totalTeam += 1;
        await previousUser.save();
      }

      // Create deposit transaction
      const txId = generateCustomId({ prefix: 'BT7-TX', min: 14, max: 14 });
      const transaction = await TransactionModel.create({
        id: txId,
        user: newUser._id,
        package: packageDoc._id,
        investment: pkg.amount,
        hash: `0x${Math.random().toString(16).substr(2, 64)}`,
        clientAddress: walletAddress,
        mainAddress: process.env.WALLET_ADDRESS,
        role: 'USER',
        type: 'Deposit',
        status: 'Completed'
      });

      newUser.transactions.push(transaction._id);
      newUser.packages.push(packageDoc._id);
      packageDoc.users.push(newUser._id);
      await newUser.save();

      // Distribute sponsor income (5%)
      if (previousUser) {
        await sponsorIncomeCalculate({
          userId: newUser._id,
          amount: pkg.amount
        });
      }

      users.push({
        username,
        id: userId,
        investment: pkg.amount,
        sponsor: previousUser ? previousUser.username : 'None'
      });

      // console.log(`✅ ${i}/50 - ${username} | $${pkg.amount} | Sponsor: ${previousUser ? previousUser.username : 'Root'}`);

      previousUser = newUser;
    }

    await packageDoc.save();

    // console.log('\n🎉 50 users created successfully!\n');
    // console.log('📊 CHAIN STRUCTURE:');
    // console.log('═'.repeat(60));
    users.forEach((u, idx) => {
      // console.log(`${idx + 1}. ${u.username} (${u.id}) - $${u.investment} - Sponsor: ${u.sponsor}`);
    });
    // console.log('═'.repeat(60));

    // console.log('\n💰 INCOME DISTRIBUTION SUMMARY:');
    // console.log('═'.repeat(60));
    
    // Get all users with income
    const allUsers = await UserModel.find({ username: /^User\d+$/ })
      .populate('incomeDetails')
      .sort({ username: 1 });

    for (const user of allUsers) {
      const income = user.incomeDetails;
      if (income) {
        const sponsorIncome = income.referralIncome?.income || 0;
        const levelIncome = income.levelIncome?.income || 0;
        const roiIncome = income.income?.roiWallet || 0;
        const totalIncome = income.income?.totalIncome || 0;

        if (totalIncome > 0) {
          // console.log(`\n${user.username} (Investment: $${user.investment}):`);
          // console.log(`  💵 Sponsor Income: $${sponsorIncome.toFixed(2)}`);
          // console.log(`  📊 Level Income: $${levelIncome.toFixed(2)}`);
          // console.log(`  📈 ROI Income: $${roiIncome.toFixed(2)}`);
          // console.log(`  💰 Total Income: $${totalIncome.toFixed(2)}`);
        }
      }
    }

    // console.log('\n═'.repeat(60));
    // console.log('\n✅ Now run monthly ROI cron to see complete income distribution!');
    // console.log('   Command: node scripts/test-monthly-roi.js\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

create50Users();
