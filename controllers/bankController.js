const db = require('../lib/db');
const httpStatus = require('http-status-codes');
const invokeChaincode = require('./hl/invoke-transaction');
const logger = require('../lib/logger');
const queryChaincode = require('./hl/query');
const Promise = require('bluebird');
const config = require('config');
const helper = require('./hl/helper');
const UsersCacheModel = db.model('UsersCache');
const chaincodeName = config.get('lending_chaincode');
const org_name = 'org_pocbank';
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
const dept = 'pocbank' + '.department1';
const adminUsername = 'admin';
const adminPassword = 'adminpw';
module.exports.calculateRating = (req, res) => {
    const { name, swiftNumber, userHash, requestHash, interest, monthlyPayment } = req.body;

    const bankData = {
        Name: name,
        SwiftNumber: swiftNumber
    };
    const requestLink = {
        RequestHash: requestHash,
        UserHash: userHash
    }

    const interestFloat = parseFloat(interest)
    const monthlyPaymentFloat = parseFloat(monthlyPayment)

    const bankPutOfferData = [JSON.stringify(requestLink), uniqueString(), interestFloat + "", monthlyPaymentFloat + ""];
    UsersCacheModel.findOne({ email: swiftNumber, type: 'bank' }).then((currentUser) => {
        if (!currentUser) {
            return helper.register(org_name, swiftNumber, attrs, dept, adminUsername, adminPassword).then((registerResult) => {
                if (!registerResult && !registerResult.secret) {
                    return res.status(httpStatus.BAD_REQUEST).send({ err: ' Problem registering agency' });
                }
                return UsersCacheModel({
                    email: swiftNumber,
                    password: registerResult.secret,
                    type: 'bank',
                    key: registerResult.key,
                    certificate: registerResult.certificate,
                    rootCertificate: registerResult.rootCertificate,
                }).save().then((user) => {
                    if (!user) {
                        return res.status(httpStatus.BAD_REQUEST).send({ err: ' Problem saving the bank' });
                    }
                    return invokeChaincode.invokeChaincode(['peer0'], config.get('channelName'), chaincodeName, 'putBankInfo', [JSON.stringify(bankData)], org_name, swiftNumber, registerResult.secret).then((response) => {
                        if (!response) {
                            return res.status(httpStatus.BAD_REQUEST).send({ err: ' Problem saving the bank inside blockchain' });
                        }
                        return invokeChaincode.invokeChaincode(['peer0'], config.get('channelName'), chaincodeName, 'bankPutOffer', bankPutOfferData, org_name, swiftNumber, registerResult.secret).then((response) => {
                            if (!response) {
                                return res.status(httpStatus.BAD_REQUEST).send({ err: 'Problem updating bank offer' });
                            }
                            return res.status(200).send(response);
                        });
                    });
                });
            });
        }
        else {
            return invokeChaincode.invokeChaincode(['peer0'], config.get('channelName'), chaincodeName, 'bankPutOffer', bankPutOfferData, org_name, swiftNumber, currentUser.password).then((response) => {
                if (!response) {
                    return res.status(httpStatus.BAD_REQUEST).send({ err: 'Problem updating bank offer' });
                }
                return res.status(200).send(response);
            });
        }
    }).catch((err) => {
        return res.status(httpStatus.BAD_REQUEST).send({ err: err });
    });
};


module.exports.bankApprove = (req, res) => {
    const { userHash, requestHash, swiftNumber } = req.body;

    const requestLink = {
        RequestHash: requestHash,
        UserHash: userHash
    }

    const requestData = [JSON.stringify(requestLink)];

    UsersCacheModel.findOne({ email: swiftNumber, type: 'bank' }).then((currentUser) => {
        if (!currentUser) {
            return res.status(400).send('user was not found');
        }
        else {
            return invokeChaincode.invokeChaincode(['peer0'], config.get('channelName'), chaincodeName, 'bankApprove', requestData, org_name, swiftNumber, currentUser.password).then((response) => {
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

module.exports.bankRunChaincode = (req, res) => {
    const { userHash, requestHash, swiftNumber } = req.body;

    const requestLink = {
        RequestHash: requestHash,
        UserHash: userHash
    }

    const requestData = [JSON.stringify(requestLink)];

    UsersCacheModel.findOne({ email: swiftNumber, type: 'bank' }).then((currentUser) => {
        if (!currentUser) {
            return res.status(400).send('user was not found');
        }
        else {
            return invokeChaincode.invokeChaincode(['peer0'], config.get('channelName'), chaincodeName, 'bankRunChaincode', requestData, org_name, swiftNumber, currentUser.password).then((response) => {
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



module.exports.pull = (req, res) => {
    return queryChaincode.queryChaincode(['peer0'], config.get('channelName'), chaincodeName, 'bankPullOpen4bankOffers', [JSON.stringify({})], org_name, 'admin', 'adminpw').then((response) => {
        if (!response)
            throw 'Not a proper response for bankPullOpen4bankOffers'

        let ret = response[0].toString('utf8');
        return res.status(200).send(JSON.parse(ret));
    });
};