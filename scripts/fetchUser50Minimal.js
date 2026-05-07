// Minimal User50 Fetch Script
require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1", "1.0.0.1"]);

// Get MongoDB URI from environment
const MONGO_URI = process.env.DATABASE_URL || process.env.MONGO_URI || 'mongodb://localhost:27017/avifx';

// console.log('🚀 Starting User50 Fetch Script...\n');

async function main() {
  try {
    // Connect
    // console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    });
    // console.log('✅ Connected!\n');

    const db = mongoose.connection.db;

    // Search for User50
    // console.log('🔍 Searching for User50...');
    
    let user = await db.collection('users').findOne({ id: 'BT73560296' });
    if (!user) user = await db.collection('users').findOne({ username: 'user50' });
    if (!user) user = await db.collection('users').findOne({ username: 'User50' });
    if (!user) user = await db.collection('users').findOne({ email: 'user50@test.com' });

    if (!user) {
      // console.log('❌ User50 NOT FOUND in database!');
      // console.log('\n💡 Tried searching by:');
      // console.log('   - ID: BT73560296');
      // console.log('   - Username: user50 / User50');
      // console.log('   - Email: user50@test.com');
      // console.log('\n🔍 Checking if any users exist...');
      
      const userCount = await db.collection('users').countDocuments();
      // console.log(`   Total users in database: ${userCount}`);
      
      if (userCount > 0) {
        // console.log('\n📋 Sample users:');
        const sampleUsers = await db.collection('users').find({}).limit(5).toArray();
        sampleUsers.forEach(u => {
          // console.log(`   - ${u.username || 'N/A'} (ID: ${u.id || 'N/A'})`);
        });
      }
      
      return;
    }

    // User found!
    // console.log('✅ User50 FOUND!\n');
    // console.log('═══════════════════════════════════════════════════════');
    // console.log('📋 USER50 INFORMATION');
    // console.log('═══════════════════════════════════════════════════════');
    // console.log(`UID: ${user.id || 'N/A'}`);
    // console.log(`Username: ${user.username || 'N/A'}`);
    // console.log(`Email: ${user.email || 'N/A'}`);
    // console.log(`Wallet: ${user.account || 'N/A'}`);
    // console.log(`Referral Link: ${user.referralLink || 'N/A'}`);
    // console.log(`Investment: $${user.investment || 0}`);
    // console.log(`Active: ${user.active?.isActive ? '✅ Yes' : '❌ No'}`);
    // console.log(`Created: ${user.createdAt || 'N/A'}`);

    // Get transactions
    // console.log('\n═══════════════════════════════════════════════════════');
    // console.log('💰 TRANSACTIONS');
    // console.log('═══════════════════════════════════════════════════════');

    const deposits = await db.collection('transactions').find({
      user: user._id,
      type: 'Deposit'
    }).toArray();

    const completedDeposits = deposits.filter(d => d.status === 'Completed');
    const totalDeposits = completedDeposits.reduce((sum, d) => sum + (d.investment || 0), 0);

    // console.log(`Deposits: ${deposits.length} total, ${completedDeposits.length} completed`);
    // console.log(`Total Deposited: $${totalDeposits}`);

    if (deposits.length > 0) {
      // console.log('\nRecent Deposits:');
      deposits.slice(0, 3).forEach((d, i) => {
        // console.log(`  ${i + 1}. $${d.investment} - ${d.status} - ${d.createdAt}`);
      });
    }

    const withdrawals = await db.collection('transactions').find({
      user: user._id,
      type: 'Withdrawal'
    }).toArray();

    const completedWithdrawals = withdrawals.filter(w => w.status === 'Completed');
    const totalWithdrawals = completedWithdrawals.reduce((sum, w) => sum + (w.investment || 0), 0);

    // console.log(`\nWithdrawals: ${withdrawals.length} total, ${completedWithdrawals.length} completed`);
    // console.log(`Total Withdrawn: $${totalWithdrawals}`);

    // Get income
    // console.log('\n═══════════════════════════════════════════════════════');
    // console.log('📊 INCOME BREAKDOWN');
    // console.log('═══════════════════════════════════════════════════════');

    const incomes = await db.collection('commissionincomes').aggregate([
      { $match: { user: user._id } },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$income' },
          count: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ]).toArray();

    let totalIncome = 0;
    if (incomes.length === 0) {
      // console.log('No income records found');
    } else {
      incomes.forEach(inc => {
        // console.log(`${inc._id}: $${inc.total.toFixed(2)} (${inc.count} entries)`);
        totalIncome += inc.total;
      });
      // console.log(`\n💵 TOTAL INCOME: $${totalIncome.toFixed(2)}`);
    }

    // Get team
    // console.log('\n═══════════════════════════════════════════════════════');
    // console.log('👥 TEAM STATISTICS');
    // console.log('═══════════════════════════════════════════════════════');

    const directPartners = await db.collection('users').countDocuments({ sponsor: user._id });
    const activePartners = await db.collection('users').countDocuments({ 
      sponsor: user._id, 
      'active.isActive': true 
    });

    // console.log(`Direct Partners: ${directPartners}`);
    // console.log(`Active Partners: ${activePartners}`);

    // Check investment mismatch
    // console.log('\n═══════════════════════════════════════════════════════');
    // console.log('🔧 DATA VERIFICATION');
    // console.log('═══════════════════════════════════════════════════════');

    if (user.investment !== totalDeposits) {
      // console.log('⚠️  Investment Mismatch Detected!');
      // console.log(`   Database shows: $${user.investment || 0}`);
      // console.log(`   Actual deposits: $${totalDeposits}`);
      
      if (totalDeposits > 0) {
        // console.log('\n🔧 Fixing investment field...');
        await db.collection('users').updateOne(
          { _id: user._id },
          { $set: { investment: totalDeposits } }
        );
        // console.log('✅ Investment updated to: $' + totalDeposits);
      }
    } else {
      // console.log('✅ Investment field is correct: $' + user.investment);
    }

    // Summary
    // console.log('\n═══════════════════════════════════════════════════════');
    // console.log('📋 SUMMARY');
    // console.log('═══════════════════════════════════════════════════════');

    const summary = {
      uid: user.id,
      username: user.username,
      email: user.email,
      wallet: user.account,
      investment: totalDeposits,
      totalIncome: totalIncome,
      totalWithdrawals: totalWithdrawals,
      directPartners: directPartners,
      activePartners: activePartners,
      isActive: user.active?.isActive || false
    };

    // console.log(JSON.stringify(summary, null, 2));

    // console.log('\n✅ Script completed successfully!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    // console.log('\n🔒 Database connection closed');
    process.exit(0);
  }
}

// Run
main();
