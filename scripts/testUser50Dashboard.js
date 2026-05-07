// Test User50 Dashboard API
require('dotenv').config();
const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function testUser50Dashboard() {
  try {
    // console.log('🧪 Testing User50 Dashboard API...\n');

    // Step 1: Login as User50
    // console.log('1️⃣ Attempting to login as User50...');
    
    // Try wallet login (DApp style)
    let loginResponse;
    try {
      loginResponse = await axios.post(`${API_BASE}/user/login`, {
        walletAddress: '0xbf81bb993b224',
        // Add signature if required
      });
    } catch (error) {
      // console.log('❌ Wallet login failed, trying username/password...');
      
      // Try traditional login if wallet login fails
      try {
        loginResponse = await axios.post(`${API_BASE}/user/login`, {
          username: 'user50',
          password: 'password', // Replace with actual password
        });
      } catch (err) {
        console.error('❌ Login failed:', err.response?.data?.message || err.message);
        // console.log('\n💡 Please check:');
        // console.log('   1. Backend server is running on port 3001');
        // console.log('   2. User50 exists in database');
        // console.log('   3. Login credentials are correct');
        return;
      }
    }

    if (!loginResponse?.data?.success) {
      // console.log('❌ Login failed:', loginResponse?.data?.message);
      return;
    }

    const token = loginResponse.data.token;
    // console.log('✅ Login successful!');
    // console.log(`Token: ${token.substring(0, 20)}...`);

    // Step 2: Fetch Dashboard Data
    // console.log('\n2️⃣ Fetching dashboard data...');
    
    const dashboardResponse = await axios.get(`${API_BASE}/user/get-income-summary`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!dashboardResponse?.data?.success) {
      // console.log('❌ Dashboard fetch failed:', dashboardResponse?.data?.message);
      return;
    }

    const data = dashboardResponse.data.data;
    // console.log('✅ Dashboard data fetched!\n');

    // Display Dashboard Data
    // console.log('═══════════════════════════════════════════════════════');
    // console.log('📊 USER50 DASHBOARD DATA');
    // console.log('═══════════════════════════════════════════════════════');
    
    // console.log('\n💰 INVESTMENT & WITHDRAWALS:');
    // console.log(`My Investment: $${data.totalTransaction || 0}`);
    // console.log(`Total Withdrawals: $${data.totalWithdraw || 0}`);
    
    // console.log('\n📈 INCOME BREAKDOWN:');
    // console.log(`Trade ROI: $${data.totalTrading || 0}`);
    // console.log(`Sponsor Income (5%): $${data.totalReferral || 0}`);
    // console.log(`Level Income: $${data.totalLevel || 0}`);
    // console.log(`Rank Rewards: $${data.totalRankReward || 0}`);
    // console.log(`Royalty Income: $${data.totalGlobalAchiever || 0}`);
    // console.log(`TOTAL INCOME: $${data.totalIncome || 0}`);
    
    // console.log('\n👥 TEAM STATISTICS:');
    // console.log(`Direct Partners: ${data.partners || 0}`);
    // console.log(`Active Partners: ${data.partnerActive || 0}`);
    // console.log(`Total Downline: ${data.totalDownlineUsers || 0}`);
    // console.log(`Team Business: $${data.totalTeamTransaction || 0}`);

    // Check for issues
    // console.log('\n═══════════════════════════════════════════════════════');
    // console.log('🔍 DATA VERIFICATION');
    // console.log('═══════════════════════════════════════════════════════');

    const issues = [];
    
    if (data.totalTransaction === 0 || data.totalTransaction === undefined) {
      issues.push('⚠️  Investment showing $0 - Check if deposits exist and status is "Completed"');
    }
    
    if (data.totalIncome === 0 && data.totalTransaction > 0) {
      issues.push('⚠️  No income despite having investment - Check if ROI is being calculated');
    }
    
    if (data.partners === 0) {
      issues.push('ℹ️  No direct partners yet');
    }

    if (issues.length === 0) {
      // console.log('✅ All data looks good!');
    } else {
      // console.log('Issues found:');
      issues.forEach(issue => // console.log(`   ${issue}`));
    }

    // Summary JSON
    // console.log('\n═══════════════════════════════════════════════════════');
    // console.log('📋 COMPLETE RESPONSE');
    // console.log('═══════════════════════════════════════════════════════');
    // console.log(JSON.stringify(data, null, 2));

    // console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', error.response.data);
    }
    
    // console.log('\n💡 Troubleshooting:');
    // console.log('   1. Make sure backend is running: npm start');
    // console.log('   2. Check if port 3001 is correct');
    // console.log('   3. Verify User50 exists in database');
    // console.log('   4. Check MongoDB connection');
  }
}

// Run test
testUser50Dashboard();
