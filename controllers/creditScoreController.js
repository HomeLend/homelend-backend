const db = require('../lib/db');
const httpStatus = require('http-status-codes');
const invokeChaincode = require('./hl/invoke-transaction');
const logger = require('../lib/logger');
const config = require('config');

const Promise = require('bluebird');
module.exports.CalculateRating = (req, res) => {

  return invokeChaincode.invokeChaincode(['peer0'], config.get('channelName'), config.get('lending_chaincode'), 'creditScore', "", 'admin', 'org_pocbuyer').then((response) => {
    return res.status(httpStatus.OK).send({ response: response });
  });

  return new Promise((resolve) => {
    return {
      _id: user,
      creditScore: 1
    };
  });
};
