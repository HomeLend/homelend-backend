const db = require('../lib/db');
const httpStatus = require('http-status-codes');
const invokeChaincode = require('./hl/invoke-transaction');
const logger = require('../lib/logger');
const config = require('config');
const helper = require('./hl/helper');
const UsersCacheModel = db.model('UsersCache');
const chaincodeName = config.get('lending_chaincode');
const queryChaincode = require('./hl/query');
const org_name = 'org_pocinsurance';
const uniqueString = require('unique-string');
const hyplerHelper = require('./../hyplerHelper');
const { uniqueId } = require('lodash');

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
    const { name, licenseNumber = uniqueId(), address = 'doesnt matter' } = req.body
    const insCompanyData = {
        Hash: uniqueString(),
        email: licenseNumber,
        Name: name,
        Address: address,
    };

    result = await hyplerHelper.register(licenseNumber, 'putInsuranceCompanyInfo', insCompanyData, org_name, 'insurance', attrs, dept);
    if(result.err) return console.log("Err from blockchain:", result.err)
    return result.status == 200 ? res.status(200).send(result.data) : res.status(result.status).send(result.err);    
};

module.exports.pull = async (req, res) => {
    const licenseNumber = req.query.licenseNumber;
    let result = await hyplerHelper.runQueryWithIdentity(licenseNumber, 'insuranceGetOpenRequests', 'insurance', org_name);
    return result.status == 200 ? res.status(200).send(result.data) : res.status(result.status).send(result.err);
};

module.exports.putOffer = async (req, res) => {
    const { licenseNumber, userHash, requestHash, amount } = req.body
    let response = await hyplerHelper.runMethodWithIdentity('insurancePutOffer', [userHash, requestHash, amount + '', uniqueString()], licenseNumber, 'insurance', org_name);
    return res.status(response.status).send({ err: response.err });
};
