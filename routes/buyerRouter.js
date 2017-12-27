const express = require('express');
// eslint-disable-next-line new-cap
const router = express.Router();
const buyerController = require('../controllers/buyerController');

router.get('/confirmed-requets', buyerController.getConfirmedRequests);

router.post('/confirmed-requests', buyerController.buy);
router.post('/confirm', buyerController.confirm);
router.post('/decline', buyerController.decline);
router.post('/uploadDocuments', buyerController.uploadDocuments);

router.post('/accept-offer-bank', buyerController.acceptOfferFromBank);
router.post('/choose-appraiser', buyerController.chooseAppraiser);
router.post('/accept-pffer-insurance', buyerController.acceptOfferFromInsurance);

router.get('/list-appraisers', buyerController.listOfAppraisers);
router.get('/list-insurance', buyerController.listOfInsuranceOffers);

module.exports = router;
