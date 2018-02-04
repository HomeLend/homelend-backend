const db = require('../lib/db');
const httpStatus = require('http-status-codes');
const invokeChaincode = require('./hl/invoke-transaction');
const logger = require('../lib/logger');
const Promise = require('bluebird');
const config = require('config');
const helper = require('./hl/helper');
const UsersCacheModel = db.model('UsersCache');
const chaincodeName = config.get('lending_chaincode');
const org_name = 'org_poccreditratingagency';
const uniqueString = require('unique-string');
const queryChaincode = require('./hl/query');
const { filter } = require('lodash');
const [adminUsername, adminPassword] = [config.admins[0].username, config.admins[0].secret];
const hyplerHelper = require('./../hyplerHelper');

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

module.exports.calculateRating = async (req, res) => {
    const { name, licenseNumber, requestHash, userHash } = req.body;
    let score = Math.random();

    const creditRatingAgencyData = {
        Name: name,
        LicenseNumber: licenseNumber
    };

    const creditScorePayload = {
        RequestHash: requestHash,
        UserHash: userHash
    }

    result = await hyplerHelper.runMethodAndRegister('creditScore', 'putCreditRatingAgencyInfo', [JSON.stringify(creditScorePayload)], [JSON.stringify(creditRatingAgencyData)], licenseNumber, org_name, 'credit-rating', attrs, dept);
    return res.status(result.status).send(result);
}

module.exports.pull = async (req, res) => {
    try {
        const { buyerHash } = req.body;

        if (!buyerHash) throw 'No buyer hash received, make sure to provide a buyer hash before fetching requests'
        response = await queryChaincode.queryChaincode(['peer0'], config.get('channelName'), chaincodeName, 'creditRatingPull', [JSON.stringify({})], org_name, adminUsername, adminPassword);
        if (!response)
            throw 'Not a proper response for creditScoreController: pull'

        let ret = response[0].toString('utf8');
        if (ret) ret = JSON.parse(ret);

        ret = filter(ret, { UserHash: buyerHash });
        if (!ret == null || ret.length < 1)
            throw 'No recent requests';

        let item = ret[ret.length - 1];

        let reqData = await queryChaincode.queryChaincode(['peer0'], config.get('channelName'), chaincodeName, 'getRequestInfo', [item.UserHash, item.RequestHash], org_name, adminUsername, adminPassword)
        reqData = reqData[0].toString();
        reqData = JSON.parse(reqData);

        return res.status(httpStatus.OK).send(reqData);
    } catch (err) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).send(err.message);
    }
};