const dns = require('dns');
dns.setServers([
  "8.8.8.8",
  "8.8.4.4",
  "1.1.1.1",
  "1.0.0.1"
]);

// Quick Fix: Add Investment Transaction for User
require('dotenv').config();
const mongoose = require('mongoose');

async function quickFixUserInvestment() {
  try {
    // console.log('🔧 Quick Fix: Adding Investment Transaction...\n');
    
    await mongoose.connect(process.env.DATABASE_URL || 'mongodb://localhost:27017/avifx');
    
    const { UserModel } = require('../models/user.model');
    const { TransactionModel } = require('../models/transaction.model');
    
    // Find user by custom ID
    const user = await UserModel.findOne({ id: 'BSG3560296' });
    
    if (!user) {
      // console.log('❌ User not found with ID BSG3560296!');
      return;
    }

    // console.log('✅ User found:', user.username || user.id);
    await fixUser(user);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

async function fixUser(user) {
  const { TransactionModel } = require('../models/transaction.model');
  
  // console.log('\n📊 User Details:');
  // console.log('Username:', user.username);
  // console.log('ID:', user.id);
  // console.log('Investment in DB:', user.investment || 0);
  // console.log('Wallet:', user.account);
  
  // Check existing transactions
  const existingDeposits = await TransactionModel.find({
    user: user._id,
    type: 'Deposit'
  });
  
  // console.log('\n💰 Existing Deposits:', existingDeposits.length);
  
  if (existingDeposits.length > 0) {
    // console.log('Deposit details:');
    existingDeposits.forEach((d, i) => {
      // console.log(`${i + 1}. $${d.investment} - Status: ${d.status}`);
    });
    
    // Update status to Completed
    const updateResult = await TransactionModel.updateMany(
      { user: user._id, type: 'Deposit' },
      { $set: { status: 'Completed' } }
    );
    
    // console.log(`\n✅ Updated ${updateResult.modifiedCount} transactions to "Completed"`);
    
  } else {
    // console.log('\n⚠️  No deposits found! Creating one...');
    
    const investmentAmount = user.investment || 5000;
    
    // Create deposit transaction
    await TransactionModel.create({
      user: user._id,
      investment: investmentAmount,
      type: 'Deposit',
      status: 'Completed',
      clientAddress: user.account,
      mainAddress: null,
      hash: '0xfix' + Date.now(),
      role: 'USER',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // console.log(`✅ Created deposit transaction: $${investmentAmount}`);
    
    // Update user investment if needed
    if (!user.investment || user.investment === 0) {
      user.investment = investmentAmount;
      await user.save();
      // console.log(`✅ Updated user investment to: $${investmentAmount}`);
    }
  }
  
  // Verify
  // console.log('\n🧪 Verifying API Response...');
  
  const completedDeposits = await TransactionModel.aggregate([
    { $match: { user: user._id, type: 'Deposit', status: 'Completed' } },
    { $group: { _id: null, total: { $sum: '$investment' } } }
  ]);
  
  const totalTransaction = completedDeposits[0]?.total || 0;
  
  // console.log('API will return totalTransaction:', totalTransaction);
  
  if (totalTransaction > 0) {
    // console.log('\n✅ SUCCESS! Dashboard will now show: $' + totalTransaction);
    // console.log('\n💡 Next steps:');
    // console.log('   1. Restart backend server (if running)');
    // console.log('   2. Refresh frontend dashboard');
    // console.log('   3. Investment should now show: $' + totalTransaction);
  } else {
    // console.log('\n❌ Still showing 0! Manual investigation needed.');
  }
}

quickFixUserInvestment();
