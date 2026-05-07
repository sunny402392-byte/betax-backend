const { isLoggedIn } = require("../middleware/authenticate.middleware");

const router = require("express").Router();
const twoFaController = require("../controllers/2fa.controller");

router.get('/get-2fa-qr',isLoggedIn,twoFaController.generate2FAHandler)
router.post('/verify-2fa',isLoggedIn,twoFaController.verify2FAHandler)
router.post('/reset-2fa',isLoggedIn,twoFaController.reset2FAHandler)

module.exports = router;