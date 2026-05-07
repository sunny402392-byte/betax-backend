const router = require("express").Router();
const EnquiryController = require("../controllers/enquiry.controller");

router.post("/ticket-raise",EnquiryController.EnquiryCreate)
router.put("/ticket-response/:id",EnquiryController.EnquiryRespond);
router.get('/get-history',EnquiryController.EnquiryAdminReports);

module.exports = router;