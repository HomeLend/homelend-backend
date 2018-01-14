const express = require('express');
// eslint-disable-next-line new-cap
const router = express.Router();
const fiController = require('../controllers/fiController');
const bankController = require('../controllers/bankController');

router.get('/pendingForOffer', bankController.pull);
router.post('/calculate', bankController.calculateRating);
router.post('/decline-pending', fiController.declinePending);
router.post('/transfer-money', fiController.transferMoney);

module.exports = router;
