const db = require('../lib/db');
const httpStatus = require('http-status-codes');
const invokeChaincode = require('./hl/invoke-transaction');
const logger = require('../lib/logger');
const Promise = require('bluebird');
const config = require('config');
const helper = require('./hl/helper');
const UsersCacheModel = db.model('UsersCache');
const chaincodeName = config.get('lending_chaincode');
const org_name = 'org_pocappraiser';
const queryChaincode = require('./hl/query');
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
module.exports.putOffer = (req, res) => {
    const Name = req.body.Name;
    const email = req.body.email;
    const FirstName = req.body.FirstName;
    const LastName = req.body.LastName;
    const idNumber = req.body.idNumber;
    const requestHash = '';
    const appraiserAmount = '';

    const appraiserData = {
        FirstName: FirstName,
        LastName: LastName,
        Email: email,
        IDNumber: idNumber,
        Timestamp: Date.now()
    };
    UsersCacheModel.findOne({ email: email, type: 'appraiser' }).then((currentUser) => {
        if (!currentUser) {
            return helper.register(org_name, email, attrs, dept, adminUsername, adminPassword).then((registerResult) => {
                if (!registerResult && !registerResult.secret) {
                    return res.status(httpStatus.BAD_REQUEST).send({ err: ' Problem registering appraiser' });
                }
                return UsersCacheModel({
                    email: email,
                    password: registerResult.secret,
                    type: 'appraiser',
                    key: registerResult.key,
                    certificate: registerResult.certificate,
                    rootCertificate: registerResult.rootCertificate,
                }).save().then((user) => {
                    if (!user) {
                        return res.status(httpStatus.BAD_REQUEST).send({ err: ' Problem saving the appraiser' });
                    }
                    return invokeChaincode.invokeChaincode(['peer0'], config.get('channelName'), chaincodeName, 'putAppraiserInfo', [JSON.stringify(appraiserData)], org_name, email, registerResult.secret).then((response) => {
                        if (!response) {
                            return res.status(httpStatus.BAD_REQUEST).send({ err: ' Problem saving the appraiser inside blockchain' });
                        }
                        return invokeChaincode.invokeChaincode(['peer0'], config.get('channelName'), chaincodeName, 'updateAppraiserOffers', [requestHash, appraiserAmount, uniqueString()], org_name, email, registerResult.secret).then((response) => {
                            if (!response) {
                                return res.status(httpStatus.BAD_REQUEST).send({ err: 'Problem updating appraiser offer' });
                            }
                            return res.status(200).send(response);
                        });
                    });
                });
            });
        }
        else {
            return invokeChaincode.invokeChaincode(['peer0'], config.get('channelName'), chaincodeName, 'updateAppraiserOffers', [requestHash, appraiserAmount, uniqueString()], org_name, email, registerResult.secret).then((response) => {
                if (!response) {
                    return res.status(httpStatus.BAD_REQUEST).send({ err: 'Problem updating appraiser offer' });
                }
                return res.status(200).send(response);
            });
        }
    }).catch((err) => {
        return res.status(httpStatus.BAD_REQUEST).send({ err: err });
    });
};


module.exports.register = (req, res) => {

    const { email, idNumber, firstName, lastName } = req.body
    const userData = {
        FirstName: firstName,
        LastName: lastName,
        Email: email,
        IDNumber: idNumber + ``
    };


    UsersCacheModel.findOne({ email: email, type: 'appraiser' }).then((currentUser) => {
        if (!currentUser) {
            return helper.register(org_name, email, attrs, dept, adminUsername, adminPassword).then((registerResult) => {
                if (!registerResult && !registerResult.secret) {
                    return res.status(httpStatus.BAD_REQUEST).send({ err: ' Problem registering user' });
                }
                return UsersCacheModel({
                    email: email,
                    password: registerResult.secret,
                    type: 'buyer',
                    key: registerResult.key,
                    certificate: registerResult.certificate,
                    rootCertificate: registerResult.rootCertificate,
                }).save().then((user) => {
                    if (!user) {
                        return res.status(httpStatus.BAD_REQUEST).send({ err: ' Problem saving the user' });
                    }
                    return invokeChaincode.invokeChaincode(['peer0'], config.get('channelName'), chaincodeName, 'appraiserputPersonalInfo', [JSON.stringify(userData)], org_name, email, registerResult.secret).then((response) => {
                        if (!response) {
                            return res.status(httpStatus.BAD_REQUEST).send({ err: ' Problem saving the user inside blockchain' });
                        }
                        else {
                            return res.status(200).send(response);
                        }
                    });
                });
            });
        }
    });
};


module.exports.pullPendingRequests = (req, res) => {
    const email = req.query.email;
    return runQueryWithIdentity(req, res, email, 'appraiserPullPendingRequests');
};


module.exports.putEstimation = (req, res) => {
    const { email, buyerHash, requestHash, amount } = req.body;
    return runMethodWithIdentity(req, res, "appraiserProvideAmount", [buyerHash, requestHash, amount + ``], email)
};




const runQueryWithIdentity = (req, res, email, queryName) => {
    UsersCacheModel.findOne({ email: email, type: 'appraiser' }).then((currentUser) => {
        if (!currentUser) {
            return res.status(httpStatus.BAD_REQUEST).send({ err: 'User not found' });
        }

        return queryChaincode.queryChaincode(['peer0'], config.get('channelName'), chaincodeName, queryName, [JSON.stringify({})], org_name, email, currentUser.password).then((response) => {
            if (!response)
                throw 'Not a proper response for ' + queryName

            let ret = response[0].toString('utf8');
            return res.status(200).send(JSON.parse(ret));
        });
    });
};


const runMethodWithIdentity = async (req, res, methodName, data, email) => {
    try {
        const currentUser = await UsersCacheModel.findOne({ email: email, type: 'appraiser' })
        if (!currentUser) {
            return res.status(400).send('user was not found');
        }
        else {
            const response = await invokeChaincode.invokeChaincode(['peer0'], config.get('channelName'), chaincodeName, methodName, data, org_name, email, currentUser.password)
            if (!response) {
                throw 'Problem executing ' + methodName
            }
            return res.status(200).send(response);
        }
    }
    catch (err) {
        return res.status(httpStatus.BAD_REQUEST).send({ err: err });
    }
};
