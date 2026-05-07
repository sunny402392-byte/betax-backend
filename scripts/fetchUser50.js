// Script to fetch User50 complete details
require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1", "1.0.0.1"]);

const { UserModel } = require('../models/user.model');
const { TransactionModel } = require('../models/transaction.model');
const { CommissionIncome } = require('../models/commission.model');
const { getDownlineArray } = require('../utils/getteams.downline');

// Connect to MongoDB
async function connectDB() {
  try {
    const mongoUri = process.env.DATABASE_URL || process.env.MONGO_URI || 'mongodb://localhost:27017/avifx';
    // console.log('🔌 Connecting to MongoDB...');
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    });
    // console.log('✅ MongoDB Connected\n');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    console.error('💡 Make sure MongoDB is running and DATABASE_URL is set in .env file');
    process.exit(1);
  }
}

async function fetchUser50Details() {
  try {
    // console.log('🔍 Fetching User50 details...\n');

    // Try multiple ways to find User50
    let user = await UserModel.findOne({ id: 'BSG3560296' })
      .populate('sponsor', 'username id')
      .populate('incomeDetails');
    
    if (!user) {
      user = await UserModel.findOne({ username: 'user50' })
        .populate('sponsor', 'username id')
        .populate('incomeDetails');
    }
    
    if (!user) {
      user = await UserModel.findOne({ email: 'user50@test.com' })
        .populate('sponsor', 'username id')
        .populate('incomeDetails');
    }

    if (!user) {
      // console.log('❌ User50 not found!');
      // console.log('💡 Tried searching by:');
      // console.log('   - ID: BSG3560296');
      // console.log('   - Username: user50');
      // console.log('   - Email: user50@test.com');
      return null;
    }

    // console.log('✅ User50 Found!\n');
    // console.log('═══════════════════════════════════════════════════════');
    // console.log('📋 BASIC INFORMATION');
    // console.log('═══════════════════════════════════════════════════════');
    // console.log(`User ID: ${user.id}`);
    // console.log(`Username: ${user.username}`);
    // console.log(`Wallet Address: ${user.account}`);
    // console.log(`Email: ${user.email || 'N/A'}`);
    // console.log(`Sponsor: ${user.sponsor?.username || 'N/A'} (${user.sponsor?.id || 'N/A'})`);
    // console.log(`Referral Link: ${user.referralLink}`);
    // console.log(`Investment: $${user.investment || 0}`);
    // console.log(`Active Status: ${user.active?.isActive ? '✅ Active' : '❌ Inactive'}`);
    // console.log(`Capital Locked: ${user.active?.isCapitalLocked ? '🔒 Yes' : '🔓 No'}`);
    // console.log(`Created At: ${user.createdAt}`);

    const userId = user._id;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Direct partners
    const partners = await UserModel.countDocuments({ sponsor: userId });
    const partnerActive = await UserModel.countDocuments({ sponsor: userId, "active.isActive": true });
    const partnerInactive = await UserModel.countDocuments({ sponsor: userId, "active.isActive": false });

    // console.log('\n═══════════════════════════════════════════════════════');
    // console.log('👥 TEAM STATISTICS');
    // console.log('═══════════════════════════════════════════════════════');
    // console.log(`Direct Partners: ${partners}`);
    // console.log(`  ├─ Active: ${partnerActive}`);
    // console.log(`  └─ Inactive: ${partnerInactive}`);

    // Get downline
    const { downlineUserIds } = await getDownlineArray({ userId, listShow: false });
    // console.log(`Total Downline Users: ${downlineUserIds.length - 1}`);

    // Transactions
    const deposits = await TransactionModel.find({ user: userId, type: 'Deposit' }).sort({ createdAt: -1 });
    const withdrawals = await TransactionModel.find({ user: userId, type: 'Withdrawal' }).sort({ createdAt: -1 });

    const totalDeposits = deposits.reduce((sum, t) => sum + (t.investment || 0), 0);
    const completedDeposits = deposits.filter(t => t.status === 'Completed');
    const totalCompletedDeposits = completedDeposits.reduce((sum, t) => sum + (t.investment || 0), 0);

    const totalWithdrawals = withdrawals.reduce((sum, t) => sum + (t.investment || 0), 0);
    const completedWithdrawals = withdrawals.filter(t => t.status === 'Completed');
    const totalCompletedWithdrawals = completedWithdrawals.reduce((sum, t) => sum + (t.investment || 0), 0);

    // console.log('\n═══════════════════════════════════════════════════════');
    // console.log('💰 TRANSACTIONS');
    // console.log('═══════════════════════════════════════════════════════');
    // console.log(`Total Deposits: ${deposits.length}`);
    // console.log(`  ├─ Completed: ${completedDeposits.length} ($${totalCompletedDeposits})`);
    // console.log(`  └─ Total Amount: $${totalDeposits}`);
    // console.log(`Total Withdrawals: ${withdrawals.length}`);
    // console.log(`  ├─ Completed: ${completedWithdrawals.length} ($${totalCompletedWithdrawals})`);
    // console.log(`  └─ Total Amount: $${totalWithdrawals}`);

    // Income breakdown
    const incomeTypes = [
      { type: 'Trading Profit Income', label: 'Trade ROI (4-7%)' },
      { type: 'Referral Income', label: 'Sponsor Income (5%)' },
      { type: 'Level Income', label: 'Level Income (27%)' },
      { type: 'Rank Reward', label: 'Rank Rewards' },
      { type: 'Global Archive Reward', label: 'Royalty Club' }
    ];

    // console.log('\n═══════════════════════════════════════════════════════');
    // console.log('📊 INCOME BREAKDOWN');
    // console.log('═══════════════════════════════════════════════════════');

    let totalIncome = 0;
    let todayIncome = 0;

    for (const { type, label } of incomeTypes) {
      const incomes = await CommissionIncome.find({ user: userId, type });
      const total = incomes.reduce((sum, i) => sum + (i.income || 0), 0);
      const todayIncomes = incomes.filter(i => i.createdAt >= todayStart && i.createdAt <= todayEnd);
      const today = todayIncomes.reduce((sum, i) => sum + (i.income || 0), 0);

      // console.log(`\n${label}:`);
      // console.log(`  ├─ Total: $${total.toFixed(2)} (${incomes.length} entries)`);
      // console.log(`  └─ Today: $${today.toFixed(2)} (${todayIncomes.length} entries)`);

      totalIncome += total;
      todayIncome += today;
    }

    // console.log('\n───────────────────────────────────────────────────────');
    // console.log(`💵 TOTAL INCOME: $${totalIncome.toFixed(2)}`);
    // console.log(`📅 TODAY'S INCOME: $${todayIncome.toFixed(2)}`);

    // Team business
    const teamDeposits = await TransactionModel.aggregate([
      { $match: { user: { $in: downlineUserIds }, type: 'Deposit', status: 'Completed' } },
      { $group: { _id: null, total: { $sum: '$investment' } } }
    ]);
    const totalTeamBusiness = teamDeposits[0]?.total || 0;

    // console.log('\n═══════════════════════════════════════════════════════');
    // console.log('🏆 TEAM BUSINESS (For Rank Qualification)');
    // console.log('═══════════════════════════════════════════════════════');
    // console.log(`Total Team Business: $${totalTeamBusiness.toFixed(2)}`);

    // Rank qualification check
    const ranks = [
      { name: 'Flight Officer', target: 20000, reward: 500 },
      { name: 'Senior Pilot', target: 40000, reward: 1000 },
      { name: 'Squadron Leader', target: 100000, reward: 5000 },
      { name: 'Chief Pilot', target: 200000, reward: 10000 },
      { name: 'Aviation Commander', target: 500000, reward: 25000 },
      { name: 'Global Captain', target: 1000000, reward: 50000 },
      { name: 'Fleet Director', target: 1600000, reward: 100000 },
      { name: 'Sky Marshal', target: 3600000, reward: 200000 },
      { name: 'Aviation Titan', target: 8000000, reward: 500000 },
      { name: 'Supreme Air Marshal', target: 16000000, reward: 1500000 }
    ];

    let qualifiedRank = null;
    for (const rank of ranks.reverse()) {
      if (totalTeamBusiness >= rank.target) {
        qualifiedRank = rank;
        break;
      }
    }

    if (qualifiedRank) {
      // console.log(`\n✈️ Qualified Rank: ${qualifiedRank.name}`);
      // console.log(`   Monthly Payout: $${qualifiedRank.reward / 10} × 10 months`);
      // console.log(`   Total Reward: $${qualifiedRank.reward}`);
    } else {
      // console.log('\n⚠️ Not qualified for any rank yet');
      // console.log(`   Next Target: $${ranks[0].target} (Flight Officer)`);
    }

    // Recent transactions
    // console.log('\n═══════════════════════════════════════════════════════');
    // console.log('📝 RECENT TRANSACTIONS (Last 5)');
    // console.log('═══════════════════════════════════════════════════════');
    
    const recentTxns = await TransactionModel.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(5);

    if (recentTxns.length === 0) {
      // console.log('No transactions found');
    } else {
      recentTxns.forEach((txn, i) => {
        // console.log(`\n${i + 1}. ${txn.type} - $${txn.investment}`);
        // console.log(`   Status: ${txn.status}`);
        // console.log(`   Date: ${txn.createdAt}`);
        if (txn.hash) // console.log(`   Hash: ${txn.hash}`);
      });
    }

    // console.log('\n═══════════════════════════════════════════════════════');
    // console.log('✅ User50 Details Fetched Successfully!');
    // console.log('═══════════════════════════════════════════════════════\n');

    // Summary JSON
    const summary = {
      user: {
        id: user.id,
        username: user.username,
        walletAddress: user.account,
        investment: user.investment || 0,
        isActive: user.active?.isActive || false
      },
      team: {
        directPartners: partners,
        activePartners: partnerActive,
        inactivePartners: partnerInactive,
        totalDownline: downlineUserIds.length - 1,
        teamBusiness: totalTeamBusiness
      },
      transactions: {
        totalDeposits: totalCompletedDeposits,
        totalWithdrawals: totalCompletedWithdrawals,
        depositCount: completedDeposits.length,
        withdrawalCount: completedWithdrawals.length
      },
      income: {
        totalIncome: totalIncome,
        todayIncome: todayIncome
      },
      rank: qualifiedRank ? qualifiedRank.name : 'Not Qualified'
    };

    // console.log('\n📋 SUMMARY JSON:');
    // console.log(JSON.stringify(summary, null, 2));

    return summary;

  } catch (error) {
    console.error('❌ Error fetching User50 details:', error.message);
    return null;
  }
}

// Main function
async function main() {
  try {
    await connectDB();
    const result = await fetchUser50Details();
    
    if (result) {
      // console.log('\n✅ Script completed successfully!');
    } else {
      // console.log('\n⚠️ Script completed with warnings');
    }
  } catch (error) {
    console.error('\n❌ Script failed:', error);
  } finally {
    await mongoose.connection.close();
    // console.log('🔒 Database connection closed');
    process.exit(0);
  }
}

// Run the script
main()


