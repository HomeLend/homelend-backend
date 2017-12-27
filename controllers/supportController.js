'use strict';

const db = require('../lib/db');
const SupportModel = db.model('Supports');
const httpStatus = require('http-status-codes');
const logger = require('../lib/logger');

const loggerName = '[supportController]';

/**
 *
 * Add support ticket
 *
 * @param req {Object}
 * @param res  {Object}
 *
 */
module.exports.addSupportMessage = (req, res) => {
  const methodName = '[addSupportMessage]';
  const newSupportMsg = new SupportModel(req.body);
  return newSupportMsg.save().then((support) => {
    return res.send(
        {msg: 'Your message successfully added! You will get response soon.'});
  }).catch((err) => {
    logger.error(loggerName, methodName, err);
    return res.status(httpStatus.BAD_REQUEST).send({'err': 'Bad request'});
  });
};