const mongoose = require('mongoose');
const { UserModel } = require('./models/user.model');
const { getDownlineArray, getDirectPartnersDownlines } = require('./utils/getteams.downline');

require('dotenv').config();

async function checkUser3Data() {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    // console.log('✅ Connected to MongoDB\n');

    // Find User3
    const user3 = await UserModel.findOne({ username: 'User3' })
      .populate('sponsor', 'id username')
      .populate('partners', 'id username investment');

    if (!user3) {
      // console.log('❌ User3 not found!');
      process.exit(1);
    }

    // console.log('='.repeat(60));
    // console.log('USER3 BASIC INFO');
    // console.log('='.repeat(60));
    // console.log('ID:', user3.id);
    // console.log('Username:', user3.username);
    // console.log('Referral Link:', user3.referralLink);
    // console.log('Investment:', user3.investment);
    // console.log('Sponsor:', user3.sponsor ? `${user3.sponsor.username} (${user3.sponsor.id})` : 'None');
    // console.log('Total Team:', user3.totalTeam);
    // console.log('\n');

    // Check Direct Partners
    // console.log('='.repeat(60));
    // console.log('DIRECT PARTNERS (from partners array)');
    // console.log('='.repeat(60));
    // console.log('Partners Array Length:', user3.partners.length);
    if (user3.partners.length > 0) {
      user3.partners.forEach((partner, i) => {
        // console.log(`${i + 1}. ${partner.username} (${partner.id}) - Investment: $${partner.investment}`);
      });
    } else {
      // console.log('❌ No partners in array!');
    }
    // console.log('\n');

    // Check Direct Partners from DB query
    // console.log('='.repeat(60));
    // console.log('DIRECT PARTNERS (from sponsor query)');
    // console.log('='.repeat(60));
    const directPartners = await UserModel.find({ sponsor: user3._id })
      .select('id username investment active');
    // console.log('Direct Partners Count:', directPartners.length);
    if (directPartners.length > 0) {
      directPartners.forEach((partner, i) => {
        // console.log(`${i + 1}. ${partner.username} (${partner.id}) - Investment: $${partner.investment} - Active: ${partner.active.isActive}`);
      });
    } else {
      // console.log('❌ No direct partners found!');
    }
    // console.log('\n');

    // Check Downline using getDownlineArray
    // console.log('='.repeat(60));
    // console.log('DOWNLINE (using getDownlineArray)');
    // console.log('='.repeat(60));
    const downlineData = await getDownlineArray({
      userId: user3._id,
      listShow: true,
    });
    // console.log('Total Downline:', downlineData.total);
    // console.log('Total Active:', downlineData.totalActive);
    // console.log('Total Inactive:', downlineData.totalInactive);
    // console.log('Downline User IDs Count:', downlineData.downlineUserIds.length);
    
    if (downlineData.downline.length > 0) {
      // console.log('\nDownline Members:');
      downlineData.downline.forEach((member, i) => {
        // console.log(`${i + 1}. ${member.username} (${member.id}) - Investment: $${member.investment}`);
      });
    } else {
      // console.log('❌ No downline members found!');
    }
    // console.log('\n');

    // Check Team Business
    // console.log('='.repeat(60));
    // console.log('TEAM BUSINESS (using getDirectPartnersDownlines)');
    // console.log('='.repeat(60));
    const teamBusiness = await getDirectPartnersDownlines({
      userId: user3._id,
      breakdownActive: true,
      downlinesActive: true,
    });
    // console.log('Total Business:', teamBusiness.totalBusiness);
    // console.log('Power Lag Business:', teamBusiness.powerLagBusiness);
    // console.log('Weaker Lag Business:', teamBusiness.weakerLagBusiness);
    
    if (teamBusiness.breakdown.length > 0) {
      // console.log('\nBreakdown by Direct Partner:');
      teamBusiness.breakdown.forEach((item, i) => {
        // console.log(`${i + 1}. ${item.username} - Self: $${item.selfInvestment}, Team: $${item.teamInvestment}, Total: $${item.total}`);
      });
    }
    // console.log('\n');

    // Check teamMembers array
    // console.log('='.repeat(60));
    // console.log('TEAM MEMBERS ARRAY');
    // console.log('='.repeat(60));
    // console.log('Team Members Array Length:', user3.teamMembers.length);
    if (user3.teamMembers.length > 0) {
      const teamMembers = await UserModel.find({ _id: { $in: user3.teamMembers } })
        .select('id username investment');
      teamMembers.forEach((member, i) => {
        // console.log(`${i + 1}. ${member.username} (${member.id}) - Investment: $${member.investment}`);
      });
    } else {
      // console.log('❌ Team members array is empty!');
    }
    // console.log('\n');

    // Diagnosis
    // console.log('='.repeat(60));
    // console.log('DIAGNOSIS');
    // console.log('='.repeat(60));
    
    const issues = [];
    
    if (user3.partners.length === 0 && directPartners.length > 0) {
      issues.push('⚠️  Partners array is empty but direct partners exist in DB');
    }
    
    if (user3.totalTeam === 0 && downlineData.total > 0) {
      issues.push('⚠️  totalTeam is 0 but downline exists');
    }
    
    if (user3.teamMembers.length === 0 && downlineData.total > 0) {
      issues.push('⚠️  teamMembers array is empty but downline exists');
    }
    
    if (downlineData.total === 0 && directPartners.length > 0) {
      issues.push('⚠️  getDownlineArray returns 0 but direct partners exist');
    }

    if (issues.length > 0) {
      // console.log('Issues Found:');
      issues.forEach(issue => // console.log(issue));
      // console.log('\n🔧 Running fix...\n');
      
      // Fix: Update partners array
      if (directPartners.length > 0) {
        user3.partners = directPartners.map(p => p._id);
        await user3.save();
        // console.log('✅ Fixed partners array');
      }
      
      // Fix: Update totalTeam
      if (downlineData.total > 0) {
        user3.totalTeam = downlineData.total;
        await user3.save();
        // console.log('✅ Fixed totalTeam count');
      }
      
      // Fix: Update teamMembers
      if (downlineData.downline.length > 0) {
        user3.teamMembers = downlineData.downline.map(d => d._id);
        await user3.save();
        // console.log('✅ Fixed teamMembers array');
      }
      
      // console.log('\n✅ All fixes applied! Run script again to verify.\n');
    } else {
      // console.log('✅ No issues found! Everything looks good.\n');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

checkUser3Data();
