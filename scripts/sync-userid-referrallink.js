require('dotenv').config();
const mongoose = require('mongoose');
const { UserModel } = require('../models/user.model');

const syncUserIdAndReferralLink = async () => {
    try {
        // console.log('🔌 Connecting to database...');
        await mongoose.connect(process.env.DATABASE_URL);
        // console.log('✅ Database connected\n');

        // Find all users
        const users = await UserModel.find({});
        // console.log(`📊 Found ${users.length} users in database\n`);

        if (users.length === 0) {
            // console.log('✅ No users found. Nothing to update.');
            process.exit(0);
        }

        let updatedCount = 0;
        let alreadySyncedCount = 0;

        for (const user of users) {
            // Check if referralLink is already same as id
            if (user.referralLink === user.id) {
                alreadySyncedCount++;
                // console.log(`✓ User ${user.id} - Already synced`);
                continue;
            }

            // Update referralLink to match id
            const oldReferralLink = user.referralLink;
            user.referralLink = user.id;
            await user.save();

            updatedCount++;
            // console.log(`✅ Updated user: ${user.id}`);
            // console.log(`   Old referralLink: ${oldReferralLink || 'null'}`);
            // console.log(`   New referralLink: ${user.referralLink}\n`);
        }

        // console.log('\n' + '='.repeat(60));
        // console.log('📈 SYNC SUMMARY');
        // console.log('='.repeat(60));
        // console.log(`Total users: ${users.length}`);
        // console.log(`✅ Updated: ${updatedCount}`);
        // console.log(`✓ Already synced: ${alreadySyncedCount}`);
        // console.log('='.repeat(60));
        // console.log('\n🎉 Sync completed successfully!');

    } catch (error) {
        console.error('❌ Error during sync:', error);
    } finally {
        await mongoose.connection.close();
        // console.log('\n🔌 Database connection closed');
        process.exit(0);
    }
};

syncUserIdAndReferralLink();
