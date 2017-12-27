const db = require('../lib/db');
const httpStatus = require('http-status-codes');

const logger = require('../lib/logger');

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
  const address = req.body.address;
  const price = req.body.price;
  const idnumber = req.body.idnumber;

  const owner = req.decoded._id;

  if (!address || !price || !idnumber) {
    return res.status(httpStatus.BAD_REQUEST).
        send({err: 'Invalid input paramteres'});
  }

  return res.send({
    hash: 'hash1',
    address: address,
    price: price,
    idnumber: idnumber,
    owner: owner,
    txHash: '113213132132112321',
    status: 'ADVERTISED'
  });

};