const db = require('../lib/db');
const userModel = db.model('Users');
const propertyModel = db.model('Properties');
const httpStatus = require('http-status-codes');
const invokeChaincode = require('./hl/invoke-transaction');
const logger = require('../lib/logger');
const config = require('config');
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

    const address = req.body.Address;
    const price = req.body.SellingPrice;
    const _id = req.decoded._id;
    const body = {
        Address: address,
        SelingPrice: price,
        Timestamp: Date.now()
    };
    if (!address || !price) {
        return res.status(httpStatus.BAD_REQUEST).send({ err: 'Invalid input paramteres' });
    }
    userModel.findById(_id).exec().then((user) => {
        if (!user || !user.hash) {
            return res.status(httpStatus.BAD_REQUEST).send({ err: 'Invalid request' });
        }
        body.SellerHash = user.hash;
        return invokeChaincode.invokeChaincode(['peer0'], config.get('channelName'), config.get('lending_chaincode'), 'advertise', [JSON.stringify(body)], 'admin', 'org_pocseller').then((response) => {
            //Mongod code to be added
            const property = new propertyModel(res);
            return property.save().then((property) => {
                if (!property) {
                    return res.status(httpStatus.BAD_REQUEST).send({ err: 'Something went wrong' });
                } else {
                    return res.send({ msg: 'Property added successfully' });
                }
            });
        })
    }).catch((err) => {
        //TODO: Handling errors at one point and send proper error response is pending
        return res.status(httpStatus.BAD_REQUEST).send({ err: err });
    });
};