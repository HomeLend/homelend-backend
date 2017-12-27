'use strict';

const db = require('../lib/db');
const UsersModel = db.model('Users');
const httpStatus = require('http-status-codes');
const speakeasy = require('speakeasy');
const logger = require('../lib/logger');

const loggerName = '[TwoFactorAuthController]';

/**
 * Function checks if 2FA enabled for current user
 *
 * @param {Object} req
 * @param {Object} res
 * @param {String} req.decoded._id - current user
 *
 */
module.exports.check2FA = (req, res) => {
  const methodName = '[Check2FA]';

  UsersModel.findOne({_id: req.decoded._id}).exec().then((user) => {
    if (!user) {
      return res.status(httpStatus.BAD_REQUEST).send({'err': 'User not found'});
    } else {
      if (user.twoFaEnabled) {
        return res.send({msg: 'enabled'});
      } else {
        return res.send({msg: 'disabled'});
      }
    }
  }).catch((err) => {
    logger.error(loggerName, methodName, err);
    return res.status(httpStatus.BAD_REQUEST).send(false);
  });
};

/**
 * Function generates 2FA code
 *
 * @param {Object} req
 * @param {Object} res
 *
 */
module.exports.generate2FA = (req, res) => {
  const secret = speakeasy.generateSecret({length: 20});

  res.send({
    url: secret.otpauth_url,
    secret: secret.base32,
  });
};

/**
 * Function enables 2FA for current user and updates generated code
 *
 * @param {Object} req
 * @param {Object} res
 *
 */
module.exports.confirm2FA = (req, res) => {
  const methodName = '[Confirm2FA]';

  const secret = req.body.secret;
  const code = req.body.code;

  if (!secret || !code) {
    return res.status(httpStatus.BAD_REQUEST).
        send({'err': 'Invalid input parameters'});
  }

  const verified = speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: code,
  });

  if (!verified) {
    return res.status(httpStatus.BAD_REQUEST).send({'err': 'Invalid 2FA code'});
  }

  UsersModel.findOneAndUpdate({_id: req.decoded._id},
      {twoFaEnabled: true, twoFaCode: secret}).exec().then((user) => {
    if (!user) {
      return res.status(httpStatus.BAD_REQUEST).send({'err': 'User not found'});
    }
    return res.send({msg: 'Two factor authentication succesfully confirmed'});
  }).catch((err) => {
    logger.error(loggerName, methodName, err);
    return res.status(httpStatus.BAD_REQUEST).send(false);
  });
};

/**
 * Function disables 2FA for current user and updates generated code
 *
 * @param {Object} req
 * @param {Object} res
 *
 */
module.exports.disable2FA = (req, res) => {
  const methodName = '[Disable2FA]';
  const code = req.body.code;

  if (!code) {
    return res.status(httpStatus.BAD_REQUEST).send({'err': 'Invalid code'});
  }

  UsersModel.findOne({_id: req.decoded._id}).exec().then((user) => {
    if (!user) {
      return res.status(httpStatus.BAD_REQUEST).send({'err': 'User not found'});
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFaCode,
      encoding: 'base32',
      token: code,
    });

    if (!verified) {
      return res.status(httpStatus.BAD_REQUEST).
          send({'err': 'Invalid 2FA code'});
    }

    UsersModel.findOneAndUpdate({_id: user._id},
        {twoFaEnabled: false, twoFaCode: null}).exec().then(() => {
      return res.send(
          {'err': 'Two factor authentication succesfully disabled'});
    });
  }).catch((err) => {
    logger.error(loggerName, methodName, err);
    return res.status(httpStatus.BAD_REQUEST).send({'err': 'Bad request'});
  });
};
