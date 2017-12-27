const express = require('express');
// eslint-disable-next-line new-cap
const router = express.Router();
const insuranceController = require('../controllers/insuranceController');

router.post('/confirmed-requests', insuranceController.getConfirmedRequests);
router.post('/provide-offer', insuranceController.provideOffer);

module.exports = router;
