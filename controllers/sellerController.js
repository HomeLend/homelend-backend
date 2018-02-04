const db = require('../lib/db');
// const userModel = db.model('Users');
// const propertyModel = db.model('Properties');
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
const hyplerHelper = require('./../hyplerHelper');

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
const [adminUsername, adminPassword] = [config.admins[0].username, config.admins[0].secret];

/**
 *
 * @param req
 * @param res
 * // step1
 * @param req.body.Address
 * @param req.body.SellingPrice
 *
 */
module.exports.advertise = async (req, res) => {
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

    const result = await hyplerHelper.runMethodAndRegister('advertise', 'putSellerPersonalInfo', [JSON.stringify(data)], [JSON.stringify(sellerData)], email, org_name, 'seller', attrs, dept);
    return res.status(result.status).send(result);
};

module.exports.getProperties = async (req, res) => {
    const email = req.query.email.toLowerCase();
    try {
        const currentUser = await UsersCacheModel.findOne({ email, type: 'seller' });
        if (!currentUser) throw 'User not found'

        const response = await queryChaincode.queryChaincode(['peer0'], config.get('channelName'), chaincodeName, 'getMyInfo', ['{}'], org_name, email, currentUser.password)
        if (response == 200) throw 'Not a proper response for sellerGetMyRequests'

        let ret = response[0].toString('utf8');
        ret = JSON.parse(ret);

        // Get only results of the last mortgage request by the latest hash in the array
        let retFiltered = ret;// filter(ret, { Hash: last(ret)['Hash'] })
        return res.status(200).send(retFiltered);
    }
    catch (err) {
        console.log("Check getMyRequests at sellerController.js", err);
        return res.status(400).send(err);
    }
};