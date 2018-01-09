const db = require('../lib/db');
const httpStatus = require('http-status-codes');
const invokeChaincode = require('./hl/invoke-transaction');
const logger = require('../lib/logger');
const Promise = require('bluebird');
const config = require('config');
const helper = require('./hl/helper');
const UsersCacheModel = db.model('UsersCache');
const chaincodeName = config.get('lending_chaincode');
const org_name = 'org_pocinsurance';
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
    const Name = req.body.Name;
    const licenseNumber = req.body.licenseNumber;
    const requestHash = '';
    const insuranceHash = '';
    const insuranceAmount = '';
    const insuranceCompanyData = {
        Name: Name,
        LicenseNumber: licenseNumber
    };
    UsersCacheModel.findOne({licenseNumber: licenseNumber, type: 'insurance'}).then((currentUser) => {
        if (!currentUser) {
            return helper.register(org_name, email, attrs, dept, adminUsername, adminPassword).then((registerResult) => {
                if (!registerResult && !registerResult.secret) {
                    return res.status(httpStatus.BAD_REQUEST).send({err: ' Problem registering insurance company'});
                }
                return UsersCacheModel({
                    licenseNumber: licenseNumber,
                    password: registerResult.secret,
                    type: 'insurance',
                    key: registerResult.key,
                    certificate: registerResult.certificate,
                    rootCertificate: registerResult.rootCertificate
                }).save().then((user) => {
                    if (!user) {
                        return res.status(httpStatus.BAD_REQUEST).send({err: ' Problem saving the insurance company'});
                    }
                    return invokeChaincode.invokeChaincode(['peer0'], config.get('channelName'), chaincodeName, 'putInsuranceCompanyInfo', [JSON.stringify(insuranceCompanyData)], org_name, licenseNumber, registerResult.secret).then((response) => {
                        if (!response) {
                            return res.status(httpStatus.BAD_REQUEST).send({err: ' Problem saving the insurance company inside blockchain'});
                        }
                        return invokeChaincode.invokeChaincode(['peer0'], config.get('channelName'), chaincodeName, 'updateInsuranceOffers', [requestHash, insuranceHash, insuranceAmount], org_name, licenseNumber, registerResult.secret).then((response) => {
                            if (!response) {
                                return res.status(httpStatus.BAD_REQUEST).send({err: 'Problem updating insurance offer'});
                            }
                            return res.status(200).send(response);
                        });
                    });
                });
            });
        }
        else {
            return invokeChaincode.invokeChaincode(['peer0'], config.get('channelName'), chaincodeName, 'updateInsuranceOffers', [requestHash, insuranceHash, insuranceAmount], org_name, licenseNumber, registerResult.secret).then((response) => {
                if (!response) {
                    return res.status(httpStatus.BAD_REQUEST).send({err: 'Problem updating insurance offer'});
                }
                return res.status(200).send(response);
            });
        }
    }).catch((err) => {
        return res.status(httpStatus.BAD_REQUEST).send({err: err});
    });
};
