const { RewardModel } = require("../models/reward.model");
const { UserModel } = require("../models/user.model");
const { IncomeModel } = require("../models/income.model");
const { CommissionIncome } = require("../models/commission.model");

/**
 * Check if a user qualifies for any club based on their team business
 * @param {ObjectId} userId - User's MongoDB ObjectId
 * @returns {Object} - { qualified: boolean, club: RewardModel, previousClub: RewardModel }
 */
exports.checkClubQualification = async (userId) => {
    try {
        const user = await UserModel.findById(userId);
        if (!user) {
            throw new Error("User not found");
        }

        // Calculate total team business
        const teamBusiness = await calculateTeamBusiness(userId);

        // Get all clubs sorted by investment requirement (ascending)
        const clubs = await RewardModel.find({
            type: { $in: ['Silver Club', 'Gold Club', 'Diamond Club'] },
            status: true
        }).sort({ investment: 1 });

        // Find the highest club the user qualifies for
        let qualifiedClub = null;
        for (const club of clubs) {
            if (teamBusiness >= club.investment) {
                qualifiedClub = club;
            } else {
                break; // Since clubs are sorted, no need to check further
            }
        }

        // Get user's current club
        const currentClub = user.currentClub ?
            await RewardModel.findById(user.currentClub) : null;

        return {
            qualified: qualifiedClub !== null,
            club: qualifiedClub,
            previousClub: currentClub,
            teamBusiness: teamBusiness
        };
    } catch (error) {
        console.error("Error checking club qualification:", error);
        throw error;
    }
};

/**
 * Calculate total team business for a user
 * @param {ObjectId} userId - User's MongoDB ObjectId
 * @returns {Number} - Total team business amount
 */
const calculateTeamBusiness = async (userId) => {
    try {
        const user = await UserModel.findById(userId).populate('teamMembers');
        if (!user) return 0;

        // Sum up all investments from team members (including the user)
        let totalBusiness = user.investment || 0;

        // Add team members' investments
        if (user.teamMembers && user.teamMembers.length > 0) {
            for (const member of user.teamMembers) {
                totalBusiness += member.investment || 0;
            }
        }

        return totalBusiness;
    } catch (error) {
        console.error("Error calculating team business:", error);
        return 0;
    }
};

/**
 * Promote user to next club and close previous club
 * @param {ObjectId} userId - User's MongoDB ObjectId
 * @param {ObjectId} newClubId - New club's MongoDB ObjectId
 */
exports.promoteToNextClub = async (userId, newClubId) => {
    try {
        const user = await UserModel.findById(userId);
        if (!user) {
            throw new Error("User not found");
        }

        const newClub = await RewardModel.findById(newClubId);
        if (!newClub) {
            throw new Error("New club not found");
        }

        // Remove from previous club if exists
        if (user.currentClub) {
            const previousClub = await RewardModel.findById(user.currentClub);
            if (previousClub) {
                // Remove user from previous club's users array
                previousClub.users = previousClub.users.filter(
                    u => u.toString() !== userId.toString()
                );

                // Add to previousClubMembers array
                if (!previousClub.previousClubMembers.includes(userId)) {
                    previousClub.previousClubMembers.push(userId);
                }

                // Add to user's club history
                user.clubHistory.push({
                    club: previousClub._id,
                    qualifiedDate: user.clubQualificationDate || new Date(),
                    closedDate: new Date()
                });

                await previousClub.save();
            }
        }

        // Add user to new club
        if (!newClub.users.includes(userId)) {
            newClub.users.push(userId);
        }

        // Update user's current club
        user.currentClub = newClub._id;
        user.clubQualificationDate = new Date();

        await user.save();
        await newClub.save();

        // console.log(`✅ User ${user.id || user.username} promoted from ${user.currentClub ? 'previous club' : 'no club'} to ${newClub.title}`);

        return {
            success: true,
            message: `User promoted to ${newClub.title}`,
            club: newClub
        };
    } catch (error) {
        console.error("Error promoting user to next club:", error);
        throw error;
    }
};

/**
 * Check and auto-promote users to appropriate clubs based on team business
 * This should be run periodically (e.g., daily) or when investments change
 */
exports.autoPromoteClubMembers = async () => {
    try {
        // console.log("🚀 Starting auto-promotion check for all users...");

        const users = await UserModel.find({});
        let promotedCount = 0;

        for (const user of users) {
            const qualification = await this.checkClubQualification(user._id);

            if (qualification.qualified) {
                // Check if user needs to be promoted to a higher club
                const currentClubId = user.currentClub?.toString();
                const qualifiedClubId = qualification.club._id.toString();

                if (!currentClubId || currentClubId !== qualifiedClubId) {
                    await this.promoteToNextClub(user._id, qualification.club._id);
                    promotedCount++;
                    // console.log(`   ✅ Promoted ${user.id || user.username} to ${qualification.club.title}`);
                }
            }
        }

        // console.log(`✅ Auto-promotion complete. ${promotedCount} users promoted.`);
        return { success: true, promotedCount };
    } catch (error) {
        console.error("❌ Error in auto-promotion:", error);
        return { success: false, error: error.message };
    }
};

/**
 * Distribute club incentives to qualified members who maintain targets
 */
exports.distributeClubIncentives = async () => {
    try {
        // console.log("🚀 Starting club incentive distribution...");

        const clubs = await RewardModel.find({
            type: { $in: ['Silver Club', 'Gold Club', 'Diamond Club'] },
            status: true
        }).populate('users');

        let distributedCount = 0;

        for (const club of clubs) {
            for (const user of club.users) {
                // Verify user still maintains qualification
                const qualification = await this.checkClubQualification(user._id);

                if (qualification.qualified &&
                    qualification.club._id.toString() === club._id.toString()) {

                    // Calculate club incentive (this is a placeholder - implement your actual logic)
                    const incentiveAmount = calculateClubIncentiveAmount(user, club, qualification.teamBusiness);

                    if (incentiveAmount > 0) {
                        // Add to user's income
                        const incomeDetail = await IncomeModel.findById(user.incomeDetails);
                        if (incomeDetail) {
                            incomeDetail.clubIncentiveIncome.income += incentiveAmount;
                            incomeDetail.income.totalIncome += incentiveAmount;
                            incomeDetail.income.currentIncome += incentiveAmount;
                            await incomeDetail.save();

                            distributedCount++;
                            // console.log(`   ✅ Distributed $${incentiveAmount} to ${user.id || user.username} (${club.title})`);
                        }
                    }
                } else {
                    // console.log(`   ⚠️ User ${user.id || user.username} no longer qualifies for ${club.title}`);
                }
            }
        }

        // console.log(`✅ Club incentive distribution complete. ${distributedCount} distributions made.`);
        return { success: true, distributedCount };
    } catch (error) {
        console.error("❌ Error distributing club incentives:", error);
        return { success: false, error: error.message };
    }
};

/**
 * Calculate club incentive amount for a user
 * @param {UserModel} user - User document
 * @param {RewardModel} club - Club reward document
 * @param {Number} teamBusiness - User's total team business
 * @returns {Number} - Incentive amount
 */
const calculateClubIncentiveAmount = (user, club, teamBusiness) => {
    // Implement your club incentive calculation logic here
    // This is a placeholder implementation

    // For example: percentage of team business based on club type
    const incentivePercentage = club.percentage || 0;
    return (teamBusiness * incentivePercentage) / 100;
};

/**
 * Get active club for a specific user
 */
exports.getActiveClubForUser = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await UserModel.findById(userId).populate('currentClub');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const qualification = await this.checkClubQualification(userId);

        return res.status(200).json({
            success: true,
            data: {
                currentClub: user.currentClub,
                teamBusiness: qualification.teamBusiness,
                qualified: qualification.qualified,
                qualifiedClub: qualification.club,
                clubHistory: user.clubHistory
            }
        });
    } catch (error) {
        console.error("Error getting active club:", error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = exports;
