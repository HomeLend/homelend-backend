const db = require('../lib/db');
const httpStatus = require('http-status-codes');
const invokeChaincode = require('./hl/invoke-transaction');
// const logger = require('../lib/logger');
const config = require('config');
const helper = require('./hl/helper');
const UsersCacheModel = db.model('UsersCache');
const chaincodeName = config.get('lending_chaincode');
const queryChaincode = require('./hl/query');
const org_name = 'org_pocgovernment';
// const uniqueString = require('unique-string');
const hyplerHelper = require('./../hyplerHelper');

const [adminUsername, adminPassword] = [config.admins[0].username, config.admins[0].secret];

const attrs = [
  {
    'hf.Registrar.Roles': 'client,user,peer,validator,auditor',
    'hf.Registrar.DelegateRoles': 'client,user,validator,auditor',
    'hf.Revoker': true,
    'hf.IntermediateCA': true,
    //user role can be customized
    BasicRole: adminUsername,
    'hf.Registrar.Attributes': '*',
  }];
const dept = 'mashreq' + '.department1';

module.exports.updateRequest = async (req, res) => {
  const { buyerHash, requestHash, checkHouseOwner, checkLien, checkWarningShot } = req.body;
  const data = [buyerHash, requestHash, checkHouseOwner, checkLien, checkWarningShot];

  const result = await hyplerHelper.runMethodAndRegister('governmentPutData', null, data, null, 'demo@gov.il', org_name, 'government', attrs, dept);
  return res.status(result.status).send(result);
};

module.exports.pull = async (req, res) => {

  const result = await hyplerHelper.runQueryWithCredentials('governmentPullPending', 'government', org_name, adminUsername, adminPassword);
  return result.status == 200 ? res.status(200).send(result.data) : res.status(result.status).send(result.err);
};