const express = require('express');
// eslint-disable-next-line new-cap
const router = express.Router();
const appraiserController = require('../controllers/appraiserController');
router.post('/put-offer', appraiserController.putOffer);
router.post('/estimation', appraiserController.putEstimation);
router.post('/register', appraiserController.register);
router.get('/pendingRequests', appraiserController.pullPendingRequests);
module.exports = router;
