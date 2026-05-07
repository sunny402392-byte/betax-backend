const router = require("express").Router();
const NotificationController = require("../controllers/notification.controller");
const { isAdminLoggedIn } = require("../middleware/authenticate.middleware");

// ------------------------------ SURVEY ROUTE START ---------------------------------------
router.post('/create', isAdminLoggedIn, NotificationController.createNotification);
router.put('/update/:id', isAdminLoggedIn, NotificationController.updateNotification);
router.delete('/delete/:id', isAdminLoggedIn, NotificationController.deleteNotification);
router.patch('/status/:id', isAdminLoggedIn, NotificationController.toggleNotificationStatus);
router.get('/get-admin-history', isAdminLoggedIn, NotificationController.getNotificationAdminHistory);
router.get('/get-user-history', NotificationController.getNotificationQuestionsHistory);
// ------------------------------ SURVEY ROUTE END ---------------------------------------

module.exports = router