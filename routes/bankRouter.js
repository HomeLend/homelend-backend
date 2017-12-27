const express = require('express');
// eslint-disable-next-line new-cap
const router = express.Router();
const fiController = require('../controllers/fiController');

router.get('/list-pending', fiController.getListOfPendingRequests);

router.post('/confirm-pending', fiController.confirmPending);
router.post('/decline-pending', fiController.declinePending);
router.post('/transfer-money', fiController.transferMoney);

module.exports = router;
