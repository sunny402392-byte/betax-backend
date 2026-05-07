const { checkClubQualification, promoteToNextClub } = require("../controllers/clubManagement.controller");

/**
 * Middleware to check and auto-promote users to appropriate club after investment changes
 * This should be called after any transaction that changes user or team investment
 */
exports.clubQualificationCheck = async (req, res, next) => {
    try {
        // Get user ID from request
        const userId = req.user?._id;

        if (!userId) {
            return next(); // Skip if no user context
        }

        // Check club qualification
        const qualification = await checkClubQualification(userId);

        if (qualification.qualified) {
            const currentClubId = qualification.previousClub?._id?.toString();
            const qualifiedClubId = qualification.club._id.toString();

            // If user qualifies for a different (higher) club, promote them
            if (!currentClubId || currentClubId !== qualifiedClubId) {
                // console.log(`🎯 Auto-promoting user to ${qualification.club.title}`);
                await promoteToNextClub(userId, qualification.club._id);
            }
        }

        // Continue to next middleware/route handler
        next();
    } catch (error) {
        console.error("❌ Error in club qualification middleware:", error);
        // Don't block the request, just log the error
        next();
    }
};

/**
 * Validate target maintenance before club incentive distribution
 * This middleware ensures users maintain their qualification targets
 */
exports.validateClubTargets = async (req, res, next) => {
    try {
        const userId = req.user?._id;

        if (!userId) {
            return next();
        }

        const qualification = await checkClubQualification(userId);

        // Attach qualification info to request for use in controllers
        req.clubQualification = qualification;

        next();
    } catch (error) {
        console.error("❌ Error validating club targets:", error);
        next();
    }
};

module.exports = exports;
