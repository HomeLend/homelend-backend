const express = require('express');
// eslint-disable-next-line new-cap
const router = express.Router();
const appraiserController = require('../controllers/appraiserController');

router.get('/confirmed-requests', appraiserController.getConfirmedRequests);
router.post('/provide-price', appraiserController.providePrice);

module.exports = router;
