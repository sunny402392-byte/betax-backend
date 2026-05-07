const router = require("express").Router();
const SupportController = require("../controllers/support.controller");
const { isLoggedIn, isAdminLoggedIn } = require("../middleware/authenticate.middleware");

router.post("/ticket-raise",isLoggedIn,SupportController.SupportTicketRaise)
router.put("/ticket-response/:id",SupportController.SupportTicketResponse);
router.get('/get-all-reports',isAdminLoggedIn,SupportController.SupportAdminReports);
router.get("/get-approved-support",isAdminLoggedIn,SupportController.approvedSupportAdminReports);
router.get("/get-rejected-support",isAdminLoggedIn,SupportController.rejectedSupportAdminReports);
router.get('/get-history',isLoggedIn,SupportController.SupportClientReports);

module.exports = router;