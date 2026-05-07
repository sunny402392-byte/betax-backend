const { RewardModel } = require("../models/reward.model");
const { generateCustomId } = require("../utils/generator.uniqueid");

/**
 * Initialize default Club Incentive Rewards
 * Run this once to create Silver, Gold, and Diamond clubs in the database
 */
const initializeClubRewards = async () => {
    try {
        // Check if clubs already exist
        const existingClubs = await RewardModel.find({
            type: { $in: ['Silver Club', 'Gold Club', 'Diamond Club'] }
        });

        if (existingClubs.length > 0) {
            // console.log('✅ Club rewards already initialized');
            return;
        }

        // Create Silver Club
        const silverClub = new RewardModel({
            id: generateCustomId({}),
            title: '🥈 Silver Club',
            investment: 200000, // $200k threshold
            percentage: 0.25,
            reward: '0.25% of Team Business Monthly',
            type: 'Silver Club',
            status: true
        });

        // Create Gold Club
        const goldClub = new RewardModel({
            id: generateCustomId({}),
            title: '🥇 Gold Club',
            investment: 500000, // $500k threshold
            percentage: 0.75,
            reward: '0.75% of Team Business Monthly',
            type: 'Gold Club',
            status: true
        });

        // Create Diamond Club
        const diamondClub = new RewardModel({
            id: generateCustomId({}),
            title: '💎 Diamond Club',
            investment: 1000000, // $1M threshold
            percentage: 2,
            reward: 'Equal Share of 2% Global Turnover',
            type: 'Diamond Club',
            status: true
        });

        await silverClub.save();
        await goldClub.save();
        await diamondClub.save();

        // console.log('✅ Club rewards initialized successfully:');
        // console.log('   - Silver Club: $200k threshold');
        // console.log('   - Gold Club: $500k threshold');
        // console.log('   - Diamond Club: $1M threshold');

        return { success: true, message: 'Clubs initialized' };
    } catch (error) {
        console.error('❌ Error initializing clubs:', error);
        return { success: false, error: error.message };
    }
};

module.exports = { initializeClubRewards };

// If running this file directly (node utils/initClubs.js)
if (require.main === module) {
    require('dotenv').config();
    const connectDB = require('./config.db');

    (async () => {
        try {
            await connectDB();
            await initializeClubRewards();
            process.exit(0);
        } catch (err) {
            console.error('❌ Error:', err);
            process.exit(1);
        }
    })();
}
