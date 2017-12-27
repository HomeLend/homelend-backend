const db = require('../lib/db');
const httpStatus = require('http-status-codes');

const logger = require('../lib/logger');

/**
 *
 * @param req
 * @param res
 *
 */
module.exports.buy = (req, res) => {
  const propertyHash = req.body.propertyHash;
  const buyer = req.decoded._id;
  const salary = req.body.salary;
  const idnumber = req.body.idnumber;
  const fullname = req.body.fullname;
  const loanAmount = req.body.loanAmount;
  const months = req.body.months;

  if (!hash || !buyer) {
    return res.status(httpStatus.BAD_REQUEST).
        send({err: 'Invalid input paramteres'});
  }

  return res.send({
    propertyHash: propertyHash,
    buyer: buyer,
    salary: salary,
    idnumber: idnumber,
    fullname: fullname,
    loadAmount: loanAmount,
    txHash: '12313131232132112312321',
    status: 'CREDIT_SCORE',
    months: months,
  });

};

module.exports.confirm = (req, res) => {
  const _id = req.body.propertyHash;
  const creditScore = req.body.creditScore;

  return {
    _id: _id,
    creditScore: creditScore,
    status: 'CREDIT_SCORE_CONFIRMED',
    txHash: '12321213213212321312',
  };
};

module.exports.decline = (req, res) => {
  return {
    _id: req.decoded._id,
    txHash: '12312321312213123231',
    status: 'DECLINED',
  };
};

module.exports.uploadDocuments = (req, res) => {

};

module.exports.getConfirmedRequests = (req, res) => {
  return res.send([
    {
      interestRate: 1,
      fiId: '12321321',
      months: 24,
      fiName: '123213',
    },
    {
      interestRate: 2,
      fiId: '1232132sad1',
      months: 24,
      fiName: '12321asdads3',
    },
  ]);
};

module.exports.acceptOfferFromBank = (req, res) => {
  const offerId = req.body.offerId;

  return res.send({
    offerId: 123131,
    status: 'CONFIRMED_BY_USER',
    txHash: '1232131',
    chaincodeAddress: 'asdasdasdasdasd',

  });
};

// list of appraiser
module.exports.listOfAppraisers = (req, res) => {
  return res.send([{
    name: 'asdad',
    address: 'asdada'
  }]);
};

// list of insurance offers with the price
module.exports.listOfInsuranceOffers = (req, res) => {
  return res.send([
    {
      montlyPrice: 1213,
      insuranceId: 123123
    }
  ]);
};

module.exports.chooseAppraiser = (req, res) => {
  const appraiserId = req.body.appraiserId;

  return res.send({
    name: 'adssa',
    status: 'APPRAISER_CHOSEN'
  });
};

module.exports.acceptOfferFromInsurance = (req, res) => {
  const insuranceId = req.body.insuranceId;

  return res.send({
    txHash: 'asdadad',
    status: 'INSURANCE_OFFER_ACCEPTED',
    chaincodeAddress: '1231'
  });


};