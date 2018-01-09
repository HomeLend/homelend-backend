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
    const email = req.body.email;
    const FirstName = req.body.FirstName;
    const LastName = req.body.LastName;
    const idNumber = req.body.idNumber;
    const requestHash = '';
    const appraiserHash = '';
    const appraiserAmount = '';

    const appraiserData = {
        FirstName: FirstName,
        LastName: LastName,
        Email: email,
        IDNumber: idNumber,
        Timestamp: Date.now()
    };
    UsersCacheModel.findOne({email: email}).then((currentUser) => {
        if (!currentUser) {
            return helper.register(org_name, email, attrs, dept, adminUsername, adminPassword).then((registerResult) => {
                if (!registerResult && !registerResult.secret) {
                    return res.status(httpStatus.BAD_REQUEST).send({err: ' Problem registering appraiser'});
                }
                return UsersCacheModel({
                    email: email,
                    password: registerResult.secret,
                    type: 'appraiser',
                    key: registerResult.key,
                    certificate: registerResult.certificate,
                    rootCertificate: registerResult.rootCertificate
                }).save().then((user) => {
                    if (!user) {
                        return res.status(httpStatus.BAD_REQUEST).send({err: ' Problem saving the appraiser'});
                    }
                    return invokeChaincode.invokeChaincode(['peer0'], config.get('channelName'), chaincodeName, 'putAppraiserInfo', [JSON.stringify(appraiserData)], org_name, email, registerResult.secret).then((response) => {
                        if (!response) {
                            return res.status(httpStatus.BAD_REQUEST).send({err: ' Problem saving the appraiser inside blockchain'});
                        }
                        return invokeChaincode.invokeChaincode(['peer0'], config.get('channelName'), chaincodeName, 'updateAppraiserOffers', [requestHash, appraiserHash, appraiserAmount], org_name, email, registerResult.secret).then((response) => {
                            if (!response) {
                                return res.status(httpStatus.BAD_REQUEST).send({err: 'Problem updating appraiser offer'});
                            }
                            return res.status(200).send(response);
                        });
                    });
                });
            });
        }
        else {
            return invokeChaincode.invokeChaincode(['peer0'], config.get('channelName'), chaincodeName, 'updateAppraiserOffers', [requestHash, appraiserHash, appraiserAmount], org_name, email, registerResult.secret).then((response) => {
                if (!response) {
                    return res.status(httpStatus.BAD_REQUEST).send({err: 'Problem updating appraiser offer'});
                }
                return res.status(200).send(response);
            });
        }
    }).catch((err) => {
        return res.status(httpStatus.BAD_REQUEST).send({err: err});
    });
};
