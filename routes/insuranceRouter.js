const express = require('express');
// eslint-disable-next-line new-cap
const router = express.Router();
const insuranceController = require('../controllers/insuranceController');

router.post('/put-offer', insuranceController.putOffer);

module.exports = router;
