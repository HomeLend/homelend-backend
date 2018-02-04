const db = require('../lib/db');
const userModel = db.model('Users');
const propertyModel = db.model('Properties');
const httpStatus = require('http-status-codes');
const invokeChaincode = require('./hl/invoke-transaction');
const queryChaincode = require('./hl/query');
const logger = require('../lib/logger');
const config = require('config');
const helper = require('./hl/helper');
const UsersCacheModel = db.model('UsersCache');
const chaincodeName = config.get('lending_chaincode');
const org_name = 'org_pocbuyer';
const uniqueString = require('unique-string');
const hyplerHelper = require('./../hyplerHelper');
const { last, filter } = require('lodash');
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

/**
 * Function registers the request for the buyer
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @return {undefined}
 *
 * @param {String} req.body.PropertyHash
 * @param {String} req.body.AppraiserHash
 * @param {String} req.body.SellerHash
 * @param {String} req.body.BuyerHash
 * @param {String} req.body.InsuranceHash
 * @param {string} req.body.CreditScore
 * @param {String} req.body.AppraiserPrice
 * @param {Number} req.body.AppraiserAmount
 * @param {String} req.body.InsuranceAmount
 * @param {String} req.body.GovernmentResult1
 * @param {String} req.body.GovernmentResult2
 * @param {String} req.body.GovernmentResult3
 * @param {String} req.body.InsuranceOffers
 * @param {Number} req.body.Salary
 * @param {Number} req.body.LoanAmount
 * @param {String} req.body.Status
 */


module.exports.buy = async (req, res) => {

    const { email, idNumber, idBase64, fullName, propertyHash, sellerHash, salary, loanAmount, duration } = req.body
    const putBuyerPersonalInfoData = {
        FullName: fullName,
        Email: email,
        IDNumber: idNumber + ``,
        IDBase64: idBase64
    };


    const buyData = {
        Hash: uniqueString(),
        PropertyHash: propertyHash,
        SellerHash: sellerHash,
        Duration: parseInt(duration),
        Salary: parseInt(salary, 10),
        LoanAmount: parseInt(loanAmount, 10)
    };

    const result = await hyplerHelper.runMethodAndRegister('buy', 'putBuyerPersonalInfo', [JSON.stringify(buyData)], [JSON.stringify(putBuyerPersonalInfoData)], email, org_name, 'buyer', attrs, dept);
    return res.status(result.status).send(result);
};

module.exports.getMyRequests = async (req, res) => {

    const email = req.query.email.toLowerCase();

    const result = await hyplerHelper.runQueryWithIdentity(email, 'buyerGetMyRequests', 'buyer', org_name);
    return result.status == 200 ? res.status(200).send(result.data) : res.status(result.status).send(result.err);
};

module.exports.selectBankOffer = async (req, res) => {
    const { email, requestHash, selectedBankOfferHash } = req.body
    const data = [
        requestHash, selectedBankOfferHash
    ];

    const result = await hyplerHelper.runMethodWithIdentity('buyerSelectBankOffer', data, email, 'buyer', org_name);
    return res.status(result.status).send(result);
};

// list of appraiser
module.exports.listOfAppraisers = async (req, res) => {
    const result = await hyplerHelper.runQueryWithCredentials('buyerGetAllAppraisers', 'buyer', org_name, adminUsername, adminPassword);
    return result.status == 200 ? res.status(200).send(result.data) : res.status(result.status).send(result.err);
};

module.exports.selectAppraiser = async (req, res) => {
    const { email, appraiserHash, requestHash } = req.body
    const data = [
        requestHash, appraiserHash
    ];

    const result = await hyplerHelper.runMethodWithIdentity('buyerSelectAppraiser', data, email, 'buyer', org_name);
    return res.status(result.status).send(result);
};

module.exports.selectInsuranceOffer = async (req, res) => {
    const { email, insuranceOfferHash, requestHash } = req.body
    const data = [
        requestHash, insuranceOfferHash
    ];

    var result = await hyplerHelper.runMethodWithIdentity('buyerSelectInsuranceOffer', data, email, 'buyer', org_name);
    return res.status(result.status).send(result);
};

module.exports.getProperties = async (req, res) => {
    const email = req.query.email.toLowerCase();

    const result = await hyplerHelper.runQueryWithIdentity(email, 'getMyInfo', 'buyer', org_name);
    return result.status == 200 ? res.status(200).send(result.data) : res.status(result.status).send(result.err);
};

module.exports.getProperties4Sale = async (req, res) => {
    var result = await hyplerHelper.runQueryWithCredentials('getProperties4Sale', 'buyer', org_name, adminUsername, adminPassword);
    return result.status == 200 ? res.status(200).send(result.data) : res.status(result.status).send(result.err);
};


module.exports.query = (req, res) => {
    const query = req.query.query;
    return queryChaincode.queryChaincode(['peer0'], config.get('channelName'), chaincodeName, 'query', [JSON.stringify({ query })], org_name, adminUsername, adminPassword).then((response) => {
        if (!response)
            throw 'Not a proper response for getProperties4Sale'

        let ret = response[0].toString('utf8');

        return res.status(200).send(JSON.parse(ret));
    });
};