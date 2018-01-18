const db = require('../lib/db');
const httpStatus = require('http-status-codes');
const invokeChaincode = require('./hl/invoke-transaction');
const logger = require('../lib/logger');
const Promise = require('bluebird');
const config = require('config');
const helper = require('./hl/helper');
const UsersCacheModel = db.model('UsersCache');
const chaincodeName = config.get('lending_chaincode');
const queryChaincode = require('./hl/query');
const org_name = 'org_pocgovernment';
const uniqueString = require('unique-string');

const attrs = [
  {
      'hf.Registrar.Roles': 'client,user,peer,validator,auditor',
      'hf.Registrar.DelegateRoles': 'client,user,validator,auditor',
      'hf.Revoker': true,
      'hf.IntermediateCA': true,
      //user role can be customized
      BasicRole: 'admin',
      'hf.Registrar.Attributes': '*',
  }];
const dept = 'mashreq' + '.department1';
const adminUsername = 'admin';
const adminPassword = 'adminpw';


module.exports.updateRequest = (req, res) => {
  const { buyerHash, requestHash, checkHouseOwner, checkLien, checkWarningShot } = req.body;
  const data = [buyerHash, requestHash, checkHouseOwner, checkLien, checkWarningShot];
  return runMethodAndRegister(req,res,'governmentPutData',data,null);
  invokeChaincode.invokeChaincode(['peer0'], config.get('channelName'), chaincodeName, 'governmentPutData', data, org_name, 'admin', 'adminpw').then((response) => {
    if (!response) {
      return res.status(httpStatus.BAD_REQUEST).send({ err: ' Problem executing ' + methodName });
    }
    return res.status(200).send(response);
  });
};

module.exports.pull = (req, res) => {
  return queryChaincode.queryChaincode(['peer0'], config.get('channelName'), chaincodeName, 'governmentPullPending', [JSON.stringify({})], org_name, 'admin', 'adminpw').then((response) => {
    if (!response)
      throw 'Not a proper response for getProperties4Sale'

    let ret = response[0].toString('utf8');

    return res.status(200).send(JSON.parse(ret));
    cb(JSON.parse(ret));
  });
};





const runMethodAndRegister = (req, res, methodName, data, userData) => {

  const email = 'ran5'
  UsersCacheModel.findOne({ email: email, type: 'government' }).then((currentUser) => {
    if (!currentUser) {
      return helper.register(org_name, email, attrs, dept, adminUsername, adminPassword).then((registerResult) => {
        if (!registerResult && !registerResult.secret) {
          return res.status(httpStatus.BAD_REQUEST).send({ err: ' Problem registering user' });
        }
        return UsersCacheModel({
          email: email,
          password: registerResult.secret,
          type: 'government',
          key: registerResult.key,
          certificate: registerResult.certificate,
          rootCertificate: registerResult.rootCertificate,
        }).save().then((user) => {
          if (!user) {
            return res.status(httpStatus.BAD_REQUEST).send({ err: ' Problem saving the user' });
          }
          return invokeChaincode.invokeChaincode(['peer0'], config.get('channelName'), chaincodeName, methodName, data, org_name, user.email, user.password).then((response) => {
            if (!response) {
              return res.status(httpStatus.BAD_REQUEST).send({ err: ' Problem putting government\'s request' });
            }
            return res.status(200).send(response);

          });
        });
      });
    }
    else {
      return invokeChaincode.invokeChaincode(['peer0'], config.get('channelName'), chaincodeName, methodName, data, org_name, email, currentUser.password).then((response) => {
        if (!response) {
          return res.status(httpStatus.BAD_REQUEST).send({ err: ' Problem executing ' + methodName });
        }
        return res.status(200).send(response);
      });
    }
  }).catch((err) => {
    return res.status(httpStatus.BAD_REQUEST).send({ err: err });
  });
};