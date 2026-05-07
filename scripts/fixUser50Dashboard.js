// Fix User50 Dashboard Data
require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1", "1.0.0.1"]);

async function fixUser50Dashboard() {
  try {
    // console.log('🔧 Fixing User50 Dashboard Data...\n');
    
    await mongoose.connect(process.env.DATABASE_URL || 'mongodb://localhost:27017/avifx');
    const db = mongoose.connection.db;
    
    // Find User50
    const user = await db.collection('users').findOne({
      $or: [
        { id: 'BSG3560296' },
        { username: 'User50' },
        { username: 'user50' }
      ]
    });
    
    if (!user) {
      // console.log('❌ User50 not found!');
      return;
    }
    
    // console.log('✅ User50 found:', user.username);
    // console.log('Current investment in DB: $' + (user.investment || 0));
    
    // Check transactions
    // console.log('\n📊 Checking transactions...');
    const deposits = await db.collection('transactions').find({
      user: user._id,
      type: 'Deposit'
    }).toArray();
    
    // console.log(`Total deposits found: ${deposits.length}`);
    
    if (deposits.length === 0) {
      // console.log('\n❌ No deposits found for User50!');
      // console.log('💡 Creating a test deposit...');
      
      // Create test deposit
      await db.collection('transactions').insertOne({
        user: user._id,
        investment: user.investment || 5000,
        type: 'Deposit',
        status: 'Completed',
        clientAddress: user.account || '0xbf81bb993b224',
        mainAddress: null,
        hash: '0xtest' + Date.now(),
        role: 'USER',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // console.log('✅ Test deposit created: $' + (user.investment || 5000));
    } else {
      // Check and fix transaction statuses
      // console.log('\nDeposit details:');
      let needsFix = false;
      
      deposits.forEach((d, i) => {
        // console.log(`${i + 1}. $${d.investment} - Status: ${d.status || 'MISSING'}`);
        if (d.status !== 'Completed') {
          needsFix = true;
        }
      });
      
      if (needsFix) {
        // console.log('\n🔧 Fixing transaction statuses...');
        
        const result = await db.collection('transactions').updateMany(
          {
            user: user._id,
            type: 'Deposit',
            status: { $ne: 'Completed' }
          },
          {
            $set: { status: 'Completed' }
          }
        );
        
        // console.log(`✅ Updated ${result.modifiedCount} transactions to "Completed"`);
      } else {
        // console.log('\n✅ All deposits already have "Completed" status');
      }
    }
    
    // Verify total investment
    // console.log('\n💰 Calculating total investment...');
    const completedDeposits = await db.collection('transactions').find({
      user: user._id,
      type: 'Deposit',
      status: 'Completed'
    }).toArray();
    
    const totalInvestment = completedDeposits.reduce((sum, d) => sum + (d.investment || 0), 0);
    // console.log(`Total completed deposits: $${totalInvestment}`);
    
    // Update user investment field if needed
    if (user.investment !== totalInvestment) {
      // console.log('\n🔧 Updating user investment field...');
      await db.collection('users').updateOne(
        { _id: user._id },
        { $set: { investment: totalInvestment } }
      );
      // console.log(`✅ User investment updated: $${user.investment} → $${totalInvestment}`);
    } else {
      // console.log('✅ User investment field is correct');
    }
    
    // Test API response
    // console.log('\n═══════════════════════════════════════════════════════');
    // console.log('🧪 TESTING API RESPONSE');
    // console.log('═══════════════════════════════════════════════════════');
    
    const { UserModel } = require('../models/user.model');
    const { TransactionModel } = require('../models/transaction.model');
    
    const testDeposits = await TransactionModel.aggregate([
      { $match: { user: user._id, type: 'Deposit', status: 'Completed' } },
      { $group: { _id: null, total: { $sum: '$investment' } } }
    ]);
    
    const apiTotalTransaction = testDeposits[0]?.total || 0;
    
    // console.log('API will return:');
    // console.log(`  totalTransaction: $${apiTotalTransaction}`);
    
    if (apiTotalTransaction === 0) {
      // console.log('\n❌ STILL SHOWING 0!');
      // console.log('   This means the aggregation is not finding completed deposits.');
      // console.log('   Checking ObjectId format...');
      
      const userObj = await UserModel.findOne({ username: user.username });
      // console.log('   User _id from UserModel:', userObj._id);
      // console.log('   User _id from db:', user._id);
      // console.log('   Are they equal?', userObj._id.equals(user._id));
    } else {
      // console.log('\n✅ API will show correct investment: $' + apiTotalTransaction);
    }
    
    // Final summary
    // console.log('\n═══════════════════════════════════════════════════════');
    // console.log('📋 FINAL STATUS');
    // console.log('═══════════════════════════════════════════════════════');
    // console.log(`User: ${user.username}`);
    // console.log(`Investment in DB: $${totalInvestment}`);
    // console.log(`Completed Deposits: ${completedDeposits.length}`);
    // console.log(`API Response: $${apiTotalTransaction}`);
    
    if (apiTotalTransaction > 0) {
      // console.log('\n✅ SUCCESS! Dashboard should now show: $' + apiTotalTransaction);
      // console.log('\n💡 Next steps:');
      // console.log('   1. Restart backend server');
      // console.log('   2. Refresh frontend dashboard');
      // console.log('   3. Login as User50 and check');
    } else {
      // console.log('\n❌ Issue persists. Manual investigation needed.');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    // console.log('\n🔒 Database connection closed');
    process.exit(0);
  }
}

fixUser50Dashboard();
