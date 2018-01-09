const express = require('express');
// eslint-disable-next-line new-cap
const router = express.Router();
const appraiserController = require('../controllers/appraiserController');
router.post('/put-offer', appraiserController.putOffer);
module.exports = router;
