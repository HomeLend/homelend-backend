const express = require('express');
// eslint-disable-next-line new-cap
const router = express.Router();
const insuranceController = require('../controllers/sellerController');

router.post('/confirmed-requests', insuranceController.advertise);

module.exports = router;
