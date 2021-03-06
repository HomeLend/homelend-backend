const express = require('express');
// eslint-disable-next-line new-cap
const router = express.Router();
const fiController = require('../controllers/fiController');
const bankController = require('../controllers/bankController');

router.post('/pendingForOffer', bankController.pull);
router.post('/calculate', bankController.calculateRating);
router.post('/approve', bankController.bankApprove);
router.post('/runChaincode', bankController.bankRunChaincode);
router.get('/pendingForFinalApproval', bankController.pullPending4Final);
router.get('/pendingForChainCodeExecute', bankController.PullForChainCodeExecute);

module.exports = router;