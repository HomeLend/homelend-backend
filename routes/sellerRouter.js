const express = require('express');
// eslint-disable-next-line new-cap
const router = express.Router();
const insuranceController = require('../controllers/sellerController');

router.post('/advertise', insuranceController.advertise);
router.get('/properties', insuranceController.getProperties);

module.exports = router;
