const mongoose = require('mongoose');
const { UserModel } = require('../models/user.model');
const { TeamDivisionModel } = require('../models/teamDivision.model');

/**
 * Get all downline members of a user recursively using $graphLookup
 * @param {ObjectId} userId - The user ID to get downlines for
 * @returns {Object} - Object with members array and total business
 */
const getDownlineWithBusiness = async (userId) => {
    try {
        const result = await UserModel.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(userId) } },
            {
                $graphLookup: {
                    from: UserModel.collection.name,
                    startWith: "$_id",
                    connectFromField: "_id",
                    connectToField: "sponsor",
                    as: "downline",
                    depthField: "level"
                }
            },
            {
                $project: {
                    _id: 1,
                    investment: 1,
                    downline: {
                        $map: {
                            input: "$downline",
                            as: "d",
                            in: {
                                _id: "$$d._id",
                                id: "$$d.id",
                                username: "$$d.username",
                                account: "$$d.account",
                                email: "$$d.email",
                                investment: "$$d.investment",
                                active: "$$d.active",
                                createdAt: "$$d.createdAt",
                                level: "$$d.level"
                            }
                        }
                    }
                }
            }
        ]);

        if (!result || result.length === 0) {
            return { members: [], totalBusiness: 0 };
        }

        const rootUser = result[0];
        const downlineMembers = rootUser.downline || [];
        
        // Calculate total business (including root user's investment)
        const rootInvestment = rootUser.investment || 0;
        const downlineBusiness = downlineMembers.reduce((sum, m) => sum + (m.investment || 0), 0);
        const totalBusiness = rootInvestment + downlineBusiness;

        return {
            members: downlineMembers,
            memberIds: downlineMembers.map(m => m._id),
            totalBusiness,
            rootInvestment
        };
    } catch (error) {
        console.error("Error in getDownlineWithBusiness:", error);
        return { members: [], memberIds: [], totalBusiness: 0, rootInvestment: 0 };
    }
};

/**
 * Calculate team division for a user based on business volume
 * @param {ObjectId} userId - The user ID to calculate team division for
 * @returns {Object} - Team division data
 */
const calculateTeamDivision = async (userId) => {
    try {
        // Get all direct referrals (partners)
        const directReferrals = await UserModel.find(
            { sponsor: new mongoose.Types.ObjectId(userId) },
            { _id: 1, id: 1, username: 1, account: 1, email: 1, investment: 1, active: 1, createdAt: 1 }
        ).lean();

        if (directReferrals.length === 0) {
            return {
                teamA: { directReferral: null, members: [], totalBusiness: 0 },
                teamB: { directReferral: null, members: [], totalBusiness: 0 },
                teamC: { directReferrals: [], members: [], totalBusiness: 0 },
                allTeamMembers: []
            };
        }

        // Calculate business for each direct referral's branch
        const branchData = await Promise.all(
            directReferrals.map(async (ref) => {
                const downlineData = await getDownlineWithBusiness(ref._id);
                return {
                    directReferral: ref,
                    members: downlineData.members,
                    memberIds: downlineData.memberIds,
                    totalBusiness: downlineData.totalBusiness,
                    rootInvestment: downlineData.rootInvestment
                };
            })
        );

        // Sort by total business (descending)
        branchData.sort((a, b) => b.totalBusiness - a.totalBusiness);

        // Assign teams based on business volume
        let teamA = { directReferral: null, members: [], totalBusiness: 0 };
        let teamB = { directReferral: null, members: [], totalBusiness: 0 };
        let teamC = { directReferrals: [], members: [], totalBusiness: 0 };

        branchData.forEach((branch, index) => {
            // Include direct referral + all their downlines as team members
            const allBranchMembers = [branch.directReferral, ...branch.members];
            const allBranchMemberIds = [branch.directReferral._id, ...branch.memberIds];

            if (index === 0) {
                // Highest business → Team A
                teamA = {
                    directReferral: branch.directReferral,
                    members: allBranchMembers,
                    memberIds: allBranchMemberIds,
                    totalBusiness: branch.totalBusiness
                };
            } else if (index === 1) {
                // Second highest → Team B
                teamB = {
                    directReferral: branch.directReferral,
                    members: allBranchMembers,
                    memberIds: allBranchMemberIds,
                    totalBusiness: branch.totalBusiness
                };
            } else {
                // All others → Team C
                teamC.directReferrals.push(branch.directReferral);
                teamC.members.push(...allBranchMembers);
                if (!teamC.memberIds) teamC.memberIds = [];
                teamC.memberIds.push(...allBranchMemberIds);
                teamC.totalBusiness += branch.totalBusiness;
            }
        });

        // Collect all team members for summary
        const allTeamMembers = [
            ...teamA.members,
            ...teamB.members,
            ...teamC.members
        ];

        return {
            teamA,
            teamB,
            teamC,
            allTeamMembers,
            totalDirectReferrals: directReferrals.length,
            totalTeamMembers: allTeamMembers.length
        };
    } catch (error) {
        console.error("Error in calculateTeamDivision:", error);
        throw error;
    }
};

/**
 * Save/Update team division in database
 * @param {ObjectId} userId - The user ID
 * @param {Object} teamData - Team division data
 */
const saveTeamDivision = async (userId, teamData) => {
    try {
        const updateData = {
            user: userId,
            teamA: {
                directReferral: teamData.teamA.directReferral?._id || null,
                members: teamData.teamA.memberIds || [],
                totalBusiness: teamData.teamA.totalBusiness || 0
            },
            teamB: {
                directReferral: teamData.teamB.directReferral?._id || null,
                members: teamData.teamB.memberIds || [],
                totalBusiness: teamData.teamB.totalBusiness || 0
            },
            teamC: {
                directReferrals: teamData.teamC.directReferrals?.map(r => r._id) || [],
                members: teamData.teamC.memberIds || [],
                totalBusiness: teamData.teamC.totalBusiness || 0
            },
            lastShuffledAt: new Date()
        };

        await TeamDivisionModel.findOneAndUpdate(
            { user: userId },
            updateData,
            { upsert: true, new: true }
        );

        return true;
    } catch (error) {
        console.error("Error saving team division:", error);
        return false;
    }
};

/**
 * Shuffle teams for all users - Called by cron job
 */
const shuffleAllTeams = async () => {
    try {
        // console.log("🔄 Starting team shuffling for all users...");
        
        // Get all verified users
        const users = await UserModel.find(
            { 'active.isVerified': true, 'active.isBlocked': false },
            { _id: 1, username: 1 }
        );

        let successCount = 0;
        let failCount = 0;

        for (const user of users) {
            try {
                const teamData = await calculateTeamDivision(user._id);
                await saveTeamDivision(user._id, teamData);
                successCount++;
                // console.log(`✅ Team shuffled for user: ${user.username}`);
            } catch (err) {
                failCount++;
                console.error(`❌ Failed to shuffle team for user: ${user.username}`, err.message);
            }
        }

        // console.log(`🎉 Team shuffling completed! Success: ${successCount}, Failed: ${failCount}`);
        return { successCount, failCount };
    } catch (error) {
        console.error("❌ Error in shuffleAllTeams:", error);
        throw error;
    }
};

module.exports = {
    getDownlineWithBusiness,
    calculateTeamDivision,
    saveTeamDivision,
    shuffleAllTeams
};

