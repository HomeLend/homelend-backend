const db = require('../lib/db');
const httpStatus = require('http-status-codes');
const invokeChaincode = require('./hl/invoke-transaction');
const logger = require('../lib/logger');
const config = require('config');
/**
 *
 * @param req
 * @param res
 * // step1
 * @param req.body.address
 * @param req.body.price
 * @param req.body.owner
 *
 * @param req.decoded._id
 *
 */
module.exports.advertise = (req, res) => {
    // const io = getIo();
    const address = req.body.address;
    const price = req.body.price;
    const idnumber = req.body.idnumber;

    const owner = req.body.owner;
    const body = {
        hash: 'hash1',
        address: address,
        price: price,
        idnumber: idnumber,
        owner: owner,
        txHash: '113213132132112321',
        status: 'ADVERTISED'
    };
    if (!address || !price || !idnumber) {
        return res.status(httpStatus.BAD_REQUEST).send({err: 'Invalid input paramteres'});
    }

    // io.to('propertiesList room').emit('propertiesList', buyerController.fetchAssetsForSale());

    invokeChaincode.invokeChaincode('', config.get('channelName'), config.get('lending_chaincode'), 'advertise', [JSON.stringify(body)], 'admin', 'pocseller').then((response) => {
        return res.send(response);
    }).catch((err) => {
        console.log();
    });

};