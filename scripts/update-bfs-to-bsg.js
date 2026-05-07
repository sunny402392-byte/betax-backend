require('dotenv').config();
const mongoose = require('mongoose');
const { UserModel } = require('../models/user.model');

const updateBFStoBSG = async () => {
    try {
        // console.log('🔌 Connecting to database...');
        await mongoose.connect(process.env.DATABASE_URL);
        // console.log('✅ Database connected\n');

        // Find all users with BFS prefix in id or referralLink
        const usersWithBFS = await UserModel.find({
            $or: [
                { id: /^BFS/i },
                { referralLink: /BFS/i }
            ]
        });

        // console.log(`📊 Found ${usersWithBFS.length} users with BFS prefix\n`);

        if (usersWithBFS.length === 0) {
            // console.log('✅ No users found with BFS prefix. Nothing to update.');
            process.exit(0);
        }

        let updatedCount = 0;

        for (const user of usersWithBFS) {
            const updates = {};
            
            if (user.id && user.id.startsWith('BFS')) {
                updates.id = user.id.replace(/^BFS/i, 'BSG');
            }
            
            if (user.referralLink && user.referralLink.includes('BFS')) {
                updates.referralLink = user.referralLink.replace(/BFS/gi, 'BSG');
            }

            if (Object.keys(updates).length > 0) {
                await UserModel.updateOne({ _id: user._id }, { $set: updates });
                // console.log(`✅ Updated user: ${user.id || user._id} -> ${updates.id || 'referralLink updated'}`);
                updatedCount++;
            }
        }

        // console.log(`\n🎉 Successfully updated ${updatedCount} users`);
        // console.log('✅ Migration completed successfully');

    } catch (error) {
        console.error('❌ Error during migration:', error);
    } finally {
        await mongoose.connection.close();
        // console.log('\n🔌 Database connection closed');
        process.exit(0);
    }
};

updateBFStoBSG();
