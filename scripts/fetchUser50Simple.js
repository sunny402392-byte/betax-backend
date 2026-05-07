// Simple script to fetch User50 data
require('dotenv').config();
const mongoose = require('mongoose');

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/avifx';

async function fetchUser50Simple() {
  try {
    // console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    });
    // console.log('✅ Connected!\n');

    const db = mongoose.connection.db;

    // Find User50
    // console.log('🔍 Searching for User50...');
    const user = await db.collection('users').findOne({ username: 'user50' });

    if (!user) {
      // console.log('❌ User50 not found in database!');
      return;
    }

    // console.log('✅ User50 Found!\n');
    // console.log('═══════════════════════════════════════════════════════');
    // console.log('📋 USER50 BASIC INFO');
    // console.log('═══════════════════════════════════════════════════════');
    // console.log(`ID: ${user.id || 'N/A'}`);
    // console.log(`Username: ${user.username}`);
    // console.log(`Wallet: ${user.account || 'N/A'}`);
    // console.log(`Email: ${user.email || 'N/A'}`);
    // console.log(`Investment: $${user.investment || 0}`);
    // console.log(`Active: ${user.active?.isActive ? '✅ Yes' : '❌ No'}`);
    // console.log(`Referral Link: ${user.referralLink || 'N/A'}`);
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

    // console.log(`Total Deposits: ${deposits.length}`);
    // console.log(`Completed: ${completedDeposits.length}`);
    // console.log(`Total Amount: $${totalDeposits}`);

    const withdrawals = await db.collection('transactions').find({
      user: user._id,
      type: 'Withdrawal'
    }).toArray();

    const completedWithdrawals = withdrawals.filter(w => w.status === 'Completed');
    const totalWithdrawals = completedWithdrawals.reduce((sum, w) => sum + (w.investment || 0), 0);

    // console.log(`\nTotal Withdrawals: ${withdrawals.length}`);
    // console.log(`Completed: ${completedWithdrawals.length}`);
    // console.log(`Total Amount: $${totalWithdrawals}`);

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
        // console.log(`\n${inc._id}:`);
        // console.log(`  Amount: $${inc.total.toFixed(2)}`);
        // console.log(`  Entries: ${inc.count}`);
        totalIncome += inc.total;
      });
    }

    // console.log(`\n💵 TOTAL INCOME: $${totalIncome.toFixed(2)}`);

    // Get team
    // console.log('\n═══════════════════════════════════════════════════════');
    // console.log('👥 TEAM INFO');
    // console.log('═══════════════════════════════════════════════════════');

    const directPartners = await db.collection('users').countDocuments({
      sponsor: user._id
    });

    const activePartners = await db.collection('users').countDocuments({
      sponsor: user._id,
      'active.isActive': true
    });

    // console.log(`Direct Partners: ${directPartners}`);
    // console.log(`Active Partners: ${activePartners}`);

    // Summary
    // console.log('\n═══════════════════════════════════════════════════════');
    // console.log('📋 SUMMARY');
    // console.log('═══════════════════════════════════════════════════════');

    const summary = {
      username: user.username,
      investment: user.investment || 0,
      totalDeposits: totalDeposits,
      totalWithdrawals: totalWithdrawals,
      totalIncome: totalIncome,
      directPartners: directPartners,
      activePartners: activePartners,
      isActive: user.active?.isActive || false
    };

    // console.log(JSON.stringify(summary, null, 2));

    // Check if investment field needs update
    if (user.investment !== totalDeposits && totalDeposits > 0) {
      // console.log('\n⚠️  WARNING: User investment field mismatch!');
      // console.log(`   Database shows: $${user.investment || 0}`);
      // console.log(`   Actual deposits: $${totalDeposits}`);
      // console.log('\n💡 To fix, run:');
      // console.log(`   db.users.updateOne({ username: "user50" }, { $set: { investment: ${totalDeposits} } })`);
    }

    // console.log('\n✅ Done!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    // console.log('\n🔒 Connection closed');
    process.exit(0);
  }
}

// Run
fetchUser50Simple();
