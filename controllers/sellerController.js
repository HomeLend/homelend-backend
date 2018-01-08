const db = require('../lib/db');
const userModel = db.model('Users');
const propertyModel = db.model('Properties');
const httpStatus = require('http-status-codes');
const invokeChaincode = require('./hl/invoke-transaction');
const logger = require('../lib/logger');
const config = require('config');
const helper = require('./hl/helper');
const UsersCacheModel = db.model('UsersCache');
const chaincodeName = config.get('lending_chaincode');
const org_name = 'org_pocseller';

/**
 *
 * @param req
 * @param res
 * // step1
 * @param req.body.Address
 * @param req.body.SellingPrice
 *
 */
module.exports.advertise = (req, res) => {
    const email = req.body.email;
    const FirstName = req.body.FirstName;
    const LastName = req.body.LastName;
    const data = {
        SellingPrice: "10000",
        Address: 'dsdfds'
    };
    const sellerData = {
        FirstName: FirstName,
        LastName: LastName,
        Email: email,
        Timestamp: Date.now()
    };
    UsersCacheModel.findOne({email: email}).then((currentUser) => {
        if (!currentUser) {
            return registerSeller(email).then((registerResult) => {
                return UsersCacheModel({
                    email: email,
                    password: registerResult.secret,
                    type: 'seller'
                }).save().then((user) => {
                    if (!user) {
                        return res.status(httpStatus.BAD_REQUEST).send({err: ' Problem saving the user'});
                    }
                    return invokeChaincode.invokeChaincode(['peer0'], config.get('channelName'), chaincodeName, 'putSellerPersonalInfo', [JSON.stringify(sellerData)], org_name, email, registerResult.secret).then((response) => {
                        if (!response) {
                            return res.status(httpStatus.BAD_REQUEST).send({err: ' Problem saving the user inside blockchain'});
                        }
                        return invokeChaincode.invokeChaincode(['peer0'], config.get('channelName'), chaincodeName, 'advertise', [JSON.stringify(data)], org_name, email, registerResult.secret).then((response) => {
                            if (!response) {
                                return res.status(httpStatus.BAD_REQUEST).send({err: ' Problem saving the user inside blockchain'});
                            }
                            return res.status(200).send(response);
                        });
                    });
                });
            });
        }
        else {
            return invokeChaincode.invokeChaincode(['peer0'], config.get('channelName'), chaincodeName, 'advertise', [JSON.stringify(data)], org_name, email, currentUser.password).then((response) => {
                if (!response) {
                    return res.status(httpStatus.BAD_REQUEST).send({err: ' Problem saving the user inside blockchain'});
                }
                return res.status(200).send(response);
            });
        }
    }).catch((err) => {
        return res.status(httpStatus.BAD_REQUEST).send({err: err});
    });
};

const registerSeller = (email) => {
    const username = email;
    const isJSON = true;
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
    return helper.registerUser(org_name, username, dept, attrs, adminUsername, adminPassword).then((result) => {
        console.log(result);
        const response = {};
        response.secret = result.secret;
        const buff = new Buffer(result.key.toBytes());
        response.key = buff.toString('utf8');
        response.certificate = result.certificate;
        response.rootCertificate = result.rootCertificate;
        return (response);
    });
};