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
const [ adminUsername, adminPassword ] = [config.admins[0].username, config.admins[0].secret];

module.exports.register = (req, res) => {

    const { licenseNumber, name, address } = req.body
    const insCompanyData = {
        Hash: uniqueString(),
        LicenseNumber: licenseNumber,
        Name: name,
        Address: address,
    };

    email = licenseNumber;

    UsersCacheModel.findOne({ email: email, type: 'insurance' }).then((currentUser) => {
        if (!currentUser) {
            return helper.register(org_name, email, attrs, dept, adminUsername, adminPassword).then((registerResult) => {
                if (!registerResult && !registerResult.secret) {
                    return res.status(httpStatus.BAD_REQUEST).send({ err: ' Problem registering user' });
                }
                return UsersCacheModel({
                    email: email,
                    password: registerResult.secret,
                    type: 'insurance',
                    key: registerResult.key,
                    certificate: registerResult.certificate,
                    rootCertificate: registerResult.rootCertificate,
                }).save().then((user) => {
                    if (!user) {
                        return res.status(httpStatus.BAD_REQUEST).send({ err: ' Problem saving the user' });
                    }
                    return invokeChaincode.invokeChaincode(['peer0'], config.get('channelName'), chaincodeName, 'putInsuranceCompanyInfo', [JSON.stringify(insCompanyData)], org_name, email, registerResult.secret).then((response) => {
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

module.exports.pull = (req, res) => {
    const licenseNumber = req.query.licenseNumber;
    return runQueryWithIdentity(req, res, licenseNumber, 'insuranceGetOpenRequests');
};

module.exports.putOffer = (req, res) => {
    const { licenseNumber,userHash,requestHash, amount } = req.body
    return runMethodWithIdentity(req, res,'insurancePutOffer',[userHash,requestHash,amount + '',uniqueString()],licenseNumber);
};

module.exports.pull = (req, res) => {
    return queryChaincode.queryChaincode(['peer0'], config.get('channelName'), chaincodeName, 'insuranceGetOpenRequests', [JSON.stringify({})], org_name, adminUsername, adminPassword).then((response) => {
        if (!response)
            throw 'Not a proper response for insuranceGetOpenRequests'

        let ret = response[0].toString('utf8');
        if (ret.length == 0)
            ret = "{}"
        return res.status(200).send(JSON.parse(ret));
    });
};

const runMethodWithIdentity = (req, res, methodName, data, email) => {
    UsersCacheModel.findOne({ email: email, type: 'insurance' }).then((currentUser) => {
        if (!currentUser) {
            return res.status(400).send('user was not found');
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

