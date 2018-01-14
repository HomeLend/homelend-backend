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
module.exports.calculateRating = (req, res) => {
    const { name, licenseNumber,requestHash,userHash,score } = req.body;
    const creditRatingAgencyData = {
        Name: name,
        LicenseNumber: licenseNumber
    };

    const creditScorePayload = {
        RequestHash: requestHash,
        UserHash : userHash
    }
    UsersCacheModel.findOne({ email: licenseNumber, type: 'credit-rating' }).then((currentUser) => {
        if (!currentUser) {
            return helper.register(org_name, licenseNumber, attrs, dept, adminUsername, adminPassword).then((registerResult) => {
                if (!registerResult && !registerResult.secret) {
                    return res.status(httpStatus.BAD_REQUEST).send({ err: ' Problem registering agency' });
                }
                return UsersCacheModel({
                    email: licenseNumber,
                    password: registerResult.secret,
                    type: 'credit-rating',
                    key: registerResult.key,
                    certificate: registerResult.certificate,
                    rootCertificate: registerResult.rootCertificate
                }).save().then((user) => {
                    if (!user) {
                        return res.status(httpStatus.BAD_REQUEST).send({ err: ' Problem saving the agency' });
                    }
                    return invokeChaincode.invokeChaincode(['peer0'], config.get('channelName'), chaincodeName, 'putCreditRatingAgencyInfo', [JSON.stringify(creditRatingAgencyData),score], org_name, licenseNumber, registerResult.secret).then((response) => {
                        if (!response) {
                            return res.status(httpStatus.BAD_REQUEST).send({ err: ' Problem saving the agency inside blockchain' });
                        }
                        return invokeChaincode.invokeChaincode(['peer0'], config.get('channelName'), chaincodeName, 'creditScore', [JSON.stringify(creditScorePayload),score], org_name, licenseNumber, registerResult.secret).then((response) => {
                            if (!response) {
                                return res.status(httpStatus.BAD_REQUEST).send({ err: 'Problem updating credit score' });
                            }
                            return res.status(200).send(response);
                        });
                    });
                });
            });
        }
        else {
            return invokeChaincode.invokeChaincode(['peer0'], config.get('channelName'), chaincodeName, 'creditScore', [JSON.stringify(creditScorePayload),"C"], org_name, licenseNumber, currentUser.password).then((response) => {
                if (!response) {
                    return res.status(httpStatus.BAD_REQUEST).send({ err: 'Problem updating credit score' });
                }
                return res.status(200).send(response);
            });
        }
    }).catch((err) => {
        return res.status(httpStatus.BAD_REQUEST).send({ err: err });
    });
};


module.exports.pull = (req, res) => {
    return queryChaincode.queryChaincode(['peer0'], config.get('channelName'), chaincodeName, 'creditRatingPull', [JSON.stringify({})], org_name, 'admin', 'adminpw').then((response) => {
        if (!response)
          throw 'Not a proper response for getProperties4Sale'

      let ret = response[0].toString('utf8');
      return res.status(200).send(JSON.parse(ret));
    });
};