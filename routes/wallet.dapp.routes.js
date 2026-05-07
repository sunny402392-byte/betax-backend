const express = require('express');
const router = express.Router();
const walletController = require('../controllers/wallet.dapp.controller');

router.post('/register', walletController.register);
router.get('/user/:walletAddress', walletController.getUserInfo);
router.post('/sync-deposit', walletController.syncDeposit);
router.get('/dashboard', walletController.getDashboard);

module.exports = router;
