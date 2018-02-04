const db = require('../lib/db');
const httpStatus = require('http-status-codes');
const invokeChaincode = require('./hl/invoke-transaction');
const logger = require('../lib/logger');
const config = require('config');
const helper = require('./hl/helper');
const UsersCacheModel = db.model('UsersCache');
const chaincodeName = config.get('lending_chaincode');
const org_name = 'org_pocappraiser';
const queryChaincode = require('./hl/query');
const uniqueString = require('unique-string');
const hyplerHelper = require('./../hyplerHelper');

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
const [adminUsername, adminPassword] = [config.admins[0].username, config.admins[0].secret];


module.exports.register = async (req, res) => {

    const { email, idNumber, firstName, lastName } = req.body
    const userData = {
        FirstName: firstName,
        LastName: lastName,
        Email: email,
        IDNumber: idNumber + ``
    };

    result = await hyplerHelper.register(email,'appraiserputPersonalInfo',userData,org_name,'appraiser',attrs,dept);
    return res.status(result.status).send(result);
};


module.exports.pullPendingRequests = async (req, res) => {
    const email = req.query.email;
    const result = await hyplerHelper.runQueryWithIdentity(email, 'appraiserPullPendingRequests','appraiser',org_name);
    return result.status == 200 ? res.status(200).send(result.data) : res.status(result.status).send(result.err);  
};


module.exports.putEstimation = async  (req, res) => {
    const { email, buyerHash, requestHash, amount } = req.body;
    var result = await hyplerHelper.runMethodWithIdentity("appraiserProvideAmount", [buyerHash, requestHash, amount + ``], email,'appraiser',org_name);
    return res.status(result.status).send(result);
};

