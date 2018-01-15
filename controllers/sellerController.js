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
const uniqueString = require('unique-string');
const queryChaincode = require('./hl/query');

const socket = require('../controllers/socket');
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
    const { fullName, idNumber, email, address, sellingPrice, imageBase64 } = req.body;
    const sellerData = {
        FullName: fullName,
        IDNumber: idNumber,
        Email: email
    };

    const data = {
        Hash: uniqueString(),
        Address: address,
        SellingPrice: parseFloat(sellingPrice),
        ImageBase64: imageBase64
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
                            // Emit a new list of the properties
                            socket().emitPropertiesList();
                            return res.status(200).send({newPropertyHash: response});
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
                // Emit a new list of the properties
                socket().emitPropertiesList();
                return res.status(200).send({newPropertyHash: response});
            });
        }
    }).catch((err) => {
        return res.status(httpStatus.BAD_REQUEST).send({ err: err });
    });
};

module.exports.getProperties = (req, res) => {
    const email = req.query.email;

    UsersCacheModel.findOne({ email: email, type: 'seller' }).then((currentUser) => {
        if (currentUser) {

            return queryChaincode.queryChaincode(['peer0'], config.get('channelName'), chaincodeName, 'getProperties', [JSON.stringify({})], org_name, email, currentUser.secret).then((response) => {
                if (!response) {
                    return res.status(httpStatus.BAD_REQUEST).send({ err: ' Problem saving the user inside blockchain' });
                }
                //we must handle error in more proper way
                return res.status(200).send(JSON.parse(response[0].toString('utf8')));

                const array = [];
                for (let i = 0; i < response.length; i++) {
                    array.push(response[i].toString('utf8'));
                }
                return res.status(200).send(JSON.parse(array));
            });
        }
        else
            return res.status(400).send("user not found");
    });
};