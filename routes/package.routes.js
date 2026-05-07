const router = require('express').Router();
const PackageController = require('../controllers/package.controller');
const { isLoggedIn, isAdminLoggedIn } = require('../middleware/authenticate.middleware');

router.post('/create',isAdminLoggedIn,PackageController.PackageCreate);
router.put('/update/:id',isAdminLoggedIn,PackageController.PackageUpdate);
router.delete('/delete/:id',isAdminLoggedIn,PackageController.PackageDelete);
router.get('/status/:id',isAdminLoggedIn,PackageController.PackageStatusUpdate);

router.get('/get-admin-reports',isAdminLoggedIn,PackageController.PackagesAdminReports);
router.get('/get-package-buyers',isAdminLoggedIn,PackageController.getPackageBuyers);
router.get('/get-packages',isLoggedIn,PackageController.PackagesClientReports);
router.get('/get-all-packages',PackageController.PackagesAllReports);


module.exports = router;