// Test API with User Token
const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2OWE2YWEzMDkxMDVhODcwY2VlNTA5YjAiLCJhY2NvdW50IjoiMHhmZUMwMGQ4NDQxNjQ2ZDM0ZWQ3MjMyNzFlOWNDMUNhOGJmMjEzMjhhIiwiZW1haWwiOm51bGwsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzcyNjkwMzkyLCJleHAiOjE3NzI3NzY3OTJ9.80eSMk4ki9JJY36cmmMl0aK1GEwF_L_IqZKrqvfukoA';

async function testAPIWithToken() {
  try {
    // console.log('🧪 Testing API with User Token...\n');
    // console.log('Token:', TOKEN.substring(0, 30) + '...');
    // console.log('API Base:', API_BASE);
    
    // Test 1: Get User Profile
    // console.log('\n1️⃣ Testing GET /user/get-user...');
    try {
      const profileResponse = await axios.get(`${API_BASE}/user/get-user`, {
        headers: {
          'Authorization': `Bearer ${TOKEN}`
        }
      });
      
      if (profileResponse.data.success) {
        // console.log('✅ Profile fetched successfully!');
        // console.log('User:', profileResponse.data.data.username);
        // console.log('ID:', profileResponse.data.data.id);
        // console.log('Investment:', profileResponse.data.data.investment);
      }
    } catch (error) {
      // console.log('❌ Profile fetch failed:', error.response?.data?.message || error.message);
    }
    
    // Test 2: Get Income Summary (Dashboard Data)
    // console.log('\n2️⃣ Testing GET /user/get-income-summary...');
    try {
      const dashboardResponse = await axios.get(`${API_BASE}/user/get-income-summary`, {
        headers: {
          'Authorization': `Bearer ${TOKEN}`
        }
      });
      
      if (dashboardResponse.data.success) {
        // console.log('✅ Dashboard data fetched successfully!\n');
        
        const data = dashboardResponse.data.data;
        
        // console.log('═══════════════════════════════════════════════════════');
        // console.log('📊 DASHBOARD DATA (What Frontend Receives)');
        // console.log('═══════════════════════════════════════════════════════');
        
        // console.log('\n💰 INVESTMENT & WITHDRAWALS:');
        // console.log(`My Investment: $${data.totalTransaction || 0}`);
        // console.log(`Today Investment: $${data.todayTransaction || 0}`);
        // console.log(`Total Withdrawals: $${data.totalWithdraw || 0}`);
        // console.log(`Today Withdrawals: $${data.todayWithdraw || 0}`);
        
        // console.log('\n📈 INCOME BREAKDOWN:');
        // console.log(`Trade ROI: $${data.totalTrading || 0} (Today: $${data.todayTrading || 0})`);
        // console.log(`Sponsor Income (5%): $${data.totalReferral || 0} (Today: $${data.todayReferral || 0})`);
        // console.log(`Level Income: $${data.totalLevel || 0} (Today: $${data.todayLevel || 0})`);
        // console.log(`Rank Rewards: $${data.totalRankReward || 0} (Today: $${data.todayRankReward || 0})`);
        // console.log(`Royalty Income: $${data.totalGlobalAchiever || 0} (Today: $${data.todayGlobalAchiever || 0})`);
        // console.log(`TOTAL INCOME: $${data.totalIncome || 0} (Today: $${data.todayIncome || 0})`);
        
        // console.log('\n👥 TEAM STATISTICS:');
        // console.log(`Direct Partners: ${data.partners || 0}`);
        // console.log(`Active Partners: ${data.partnerActive || 0}`);
        // console.log(`Inactive Partners: ${data.partnerInactive || 0}`);
        // console.log(`Total Downline: ${data.totalDownlineUsers || 0}`);
        // console.log(`Team Business: $${data.totalTeamTransaction || 0}`);
        // console.log(`Today Team Business: $${data.todayTeamTransaction || 0}`);
        
        // Check for issues
        // console.log('\n═══════════════════════════════════════════════════════');
        // console.log('🔍 DATA VERIFICATION');
        // console.log('═══════════════════════════════════════════════════════');
        
        const issues = [];
        
        if (data.totalTransaction === 0 || data.totalTransaction === undefined) {
          issues.push('⚠️  Investment showing $0');
          issues.push('   → Check if deposits exist with status "Completed"');
        } else {
          // console.log('✅ Investment: $' + data.totalTransaction);
        }
        
        if (data.totalIncome === 0 && data.totalTransaction > 0) {
          issues.push('⚠️  No income despite having investment');
          issues.push('   → ROI might not be calculated yet');
        } else if (data.totalIncome > 0) {
          // console.log('✅ Total Income: $' + data.totalIncome);
        }
        
        if (data.partners === 0) {
          // console.log('ℹ️  No direct partners yet');
        } else {
          // console.log('✅ Direct Partners: ' + data.partners);
        }
        
        if (issues.length > 0) {
          // console.log('\n⚠️  Issues found:');
          issues.forEach(issue => // console.log(issue));
        }
        
        // Complete Response
        // console.log('\n═══════════════════════════════════════════════════════');
        // console.log('📋 COMPLETE API RESPONSE');
        // console.log('═══════════════════════════════════════════════════════');
        // console.log(JSON.stringify(dashboardResponse.data, null, 2));
        
      }
    } catch (error) {
      // console.log('❌ Dashboard fetch failed:', error.response?.data?.message || error.message);
      if (error.response) {
        // console.log('Status:', error.response.status);
        // console.log('Response:', JSON.stringify(error.response.data, null, 2));
      }
    }
    
    // Test 3: Get Transaction History
    // console.log('\n3️⃣ Testing GET /user/get-transaction-history...');
    try {
      const txnResponse = await axios.get(`${API_BASE}/user/get-transaction-history`, {
        headers: {
          'Authorization': `Bearer ${TOKEN}`
        }
      });
      
      if (txnResponse.data.success) {
        // console.log('✅ Transaction history fetched!');
        // console.log('Recent transactions:', txnResponse.data.data?.length || 0);
        
        if (txnResponse.data.data && txnResponse.data.data.length > 0) {
          // console.log('\nRecent 3 transactions:');
          txnResponse.data.data.slice(0, 3).forEach((txn, i) => {
            // console.log(`${i + 1}. ${txn.type} - $${txn.investment} - ${txn.status}`);
          });
        }
      }
    } catch (error) {
      // console.log('❌ Transaction history failed:', error.response?.data?.message || error.message);
    }
    
    // console.log('\n═══════════════════════════════════════════════════════');
    // console.log('✅ API Testing Completed!');
    // console.log('═══════════════════════════════════════════════════════');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      // console.log('\n💡 Backend server is not running!');
      // console.log('   Start backend: cd Avi-x-backend && npm start');
    }
  }
}

// Run test
testAPIWithToken();
