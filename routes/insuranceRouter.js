const express = require('express');
// eslint-disable-next-line new-cap
const router = express.Router();
const insuranceController = require('../controllers/insuranceController');

router.post('/register', insuranceController.register);
router.get('/pull', insuranceController.pull);
router.post('/putOffer', insuranceController.putOffer);

module.exports = router;
