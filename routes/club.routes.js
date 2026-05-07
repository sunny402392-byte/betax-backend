const { isLoggedIn, isAdminLoggedIn } = require("../middleware/authenticate.middleware");
const clubController = require("../controllers/clubManagement.controller");
const router = require("express").Router();

// ----- USER CLUB ROUTES -----
// Get current club status for the logged-in user
router.get("/my-club", isLoggedIn, clubController.getActiveClubForUser);

// ----- ADMIN CLUB ROUTES -----
// Manually trigger auto-promotion check for all users
router.post("/auto-promote-members", isAdminLoggedIn, async (req, res) => {
    try {
        const result = await clubController.autoPromoteClubMembers();
        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

// Manually trigger club incentive distribution
router.post("/distribute-incentives", isAdminLoggedIn, async (req, res) => {
    try {
        const result = await clubController.distributeClubIncentives();
        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

// Check qualification for a specific user (admin only)
router.post("/check-qualification/:userId", isAdminLoggedIn, async (req, res) => {
    try {
        const { userId } = req.params;
        const qualification = await clubController.checkClubQualification(userId);
        return res.status(200).json({ success: true, data: qualification });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

// Manually promote user to specific club (admin only)
router.post("/promote-user", isAdminLoggedIn, async (req, res) => {
    try {
        const { userId, clubId } = req.body;
        if (!userId || !clubId) {
            return res.status(400).json({
                success: false,
                message: "userId and clubId are required"
            });
        }
        const result = await clubController.promoteToNextClub(userId, clubId);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
