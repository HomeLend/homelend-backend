const express = require('express');
// eslint-disable-next-line new-cap
const router = express.Router();
const buyerController = require('../controllers/buyerController');

router.get('/confirmed-requets', buyerController.getConfirmedRequests);
router.get('/properties', buyerController.getProperties);
router.post('/buy', buyerController.buy);
router.post('/confirm', buyerController.confirm);
router.post('/decline', buyerController.decline);
router.post('/uploadDocuments', buyerController.uploadDocuments);

router.post('/accept-offer-bank', buyerController.acceptOfferFromBank);
router.post('/choose-appraiser', buyerController.chooseAppraiser);
router.post('/accept-pffer-insurance', buyerController.acceptOfferFromInsurance);

router.get('/list-appraisers', buyerController.listOfAppraisers);
router.get('/list-insurance', buyerController.listOfInsuranceOffers);
router.get('/properties4Sale', buyerController.getProperties4Sale);
router.get('/query', buyerController.query);

module.exports = router;
