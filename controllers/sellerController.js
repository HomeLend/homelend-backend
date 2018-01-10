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
    const { fullName, iDNumber, email, address, sellingPrice, imageBase64 } = req.body;

    const sellerData = {
        FullName : fullName,
        IDNumber : iDNumber,
        Email : email
    };

    const data = {
        Address: address,
        SellingPrice: sellingPrice,
        ImageBase64: ImageBase64
    };

    UsersCacheModel.findOne({ email: email, type: 'seller' }).then((currentUser) => {
        if (!currentUser) {
            return helper.register(org_name, email, attrs, dept, adminUsername, adminPassword).then((registerResult) => {
                if (!registerResult && !registerResult.secret) {
                    return res.status(httpStatus.BAD_REQUEST).send({ err: ' Problem registering user' });
                }
                return UsersCacheModel({
                    email: email,
                    password: registerResult.secret,
                    type: 'seller',
                    key: registerResult.key,
                    certificate: registerResult.certificate,
                    rootCertificate: registerResult.rootCertificate
                }).save().then((user) => {
                    if (!user) {
                        return res.status(httpStatus.BAD_REQUEST).send({ err: ' Problem saving the user' });
                    }
                    return invokeChaincode.invokeChaincode(['peer0'], config.get('channelName'), chaincodeName, 'putSellerPersonalInfo', [JSON.stringify(sellerData)], org_name, email, registerResult.secret).then((response) => {
                        if (!response) {
                            return res.status(httpStatus.BAD_REQUEST).send({ err: ' Problem saving the user inside blockchain' });
                        }
                        return invokeChaincode.invokeChaincode(['peer0'], config.get('channelName'), chaincodeName, 'advertise', [JSON.stringify(data)], org_name, email, registerResult.secret).then((response) => {
                            if (!response) {
                                return res.status(httpStatus.BAD_REQUEST).send({ err: ' Problem putting property' });
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
                    return res.status(httpStatus.BAD_REQUEST).send({ err: ' Problem putting property' });
                }
                return res.status(200).send(response);
            });
        }
    }).catch((err) => {
        return res.status(httpStatus.BAD_REQUEST).send({ err: err });
    });
};

