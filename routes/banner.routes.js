const router = require("express").Router()
const BannerController = require("../controllers/banner.controller");
const { isAdminLoggedIn } = require("../middleware/authenticate.middleware");

router.post('/create',isAdminLoggedIn, BannerController.BannerCreate);
router.put('/update/:id',isAdminLoggedIn, BannerController.BannerUpdate);
router.delete('/delete/:id',isAdminLoggedIn, BannerController.getDeleteBanner);
router.get('/get-banners', BannerController.AllBanner);
router.get('/get-banner/:id', BannerController.getBanner);

module.exports = router


