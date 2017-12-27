'use strict';

const Promise = require('bluebird');
const util = require('util');
const config = require('config');
const mailcomposer = require('mailcomposer');
const mailgun = require('mailgun-js')({
  apiKey: config.get('mailgun-access-key'),
  domain: config.get('mailgun-domain'),
});
const logger = require('../lib/logger');
const eTemplate = require('./emailTemplate.json');

const loggerName = '[Mail]';

module.exports.sendActivationCode = function(project, email, activationCode) {
  const methodName = '[SendActivationCode]';

  return new Promise((resolve, reject) => {
    let subject = eTemplate.sendActivationCode.SUBJECT.replace('[COMPANY_NAME]',
        project.name);

    const projectUrl = String(config.get('env')) === 'dev' ?
        project.devUrl :
        project.url;

    let activationLInk = '<p><a href=\'' + projectUrl + '/activate-email/' +
        email + '/' + activationCode + '\'>Activate your account</a></p>';
    activationLInk += '<br/><br/><p>If activation link is not working, use URL below.</p>';
    activationLInk += '<br/><br/><p>' + projectUrl + '/activate-email/' +
        email + '/' + activationCode + '</p>';

    let bodyHtml = eTemplate.sendActivationCode.HTML_MSG.replace('[EMAIL]',
        email).replace('[ACTIVATE_LINK]', activationLInk);

    bodyHtml += eTemplate.FOOTER.replace('[COMPANY_NAME]', project.name);

    bodyHtml += eTemplate.DISCLAIMER;

    let activationURL = projectUrl + '/activate-email/' + email + '/' +
        activationCode;

    let bodyText = eTemplate.sendActivationCode.PLAIN_MSG.replace('[EMAIL]',
        email).replace('[ACTIVATE_LINK]', activationURL);

    const mail = mailcomposer({
      from: project.projectEmail,
      to: email,
      subject: subject,
      text: bodyText,
      html: bodyHtml,
    });

    return new Promise((resolve, reject) => {
      mail.build((err, message) => {
        if (err) {
          reject(err);
        }

        resolve(message);
      });
    }).then((message) => {
      const sendMessage = {
        to: email,
        message: message.toString('ascii'),
      };

      mailgun.messages().sendMime(sendMessage).then((result) => {
        logger.debug(loggerName, methodName, result);
        logger.debug(loggerName, methodName,
            util.format('Message successfully submitted to %s', email));
        resolve(result);
      }).catch((err) => {
        logger.error(loggerName, methodName, err);
        reject(err);
      });
    });
  }).catch((err) => {
    logger.error(loggerName, methodName, err);
  });
};

module.exports.sencActivateAccount = function(project, email, activationCode) {
  const methodName = '[SendActivationAccount]';

  return new Promise((resolve, reject) => {
    const projectUrl = String(config.get('env')) === 'dev' ?
        project.devUrl :
        project.url;

    let subject = eTemplate.sendActivationAccount.SUBJECT.replace(
        '[COMPANY_NAME]', project.name);

    let activationLInk = '<p><a href=\'' + projectUrl + '/activate-account/' +
        email + '/' + activationCode + '\'>Activate your account</a></p>';

    activationLInk += '<br/><br/><p>If activation link is not working, use URL below.</p>';
    activationLInk += '<br/><br/><p>' + projectUrl + '/activate-account/' +
        email + '/' + activationCode + '</p>';

    let bodyHtml = eTemplate.sendActivationCode.HTML_MSG.replace('[EMAIL]',
        email).replace('[ACTIVATE_LINK]', activationLInk);

    bodyHtml += eTemplate.FOOTER.replace('[COMPANY_NAME]', project.name);
    bodyHtml += eTemplate.DISCLAIMER;

    let activationURL = projectUrl + '/activate-email/' + email + '/' +
        activationCode;

    let bodyText = eTemplate.sendActivationCode.PLAIN_MSG.replace('[EMAIL]',
        email).replace('[ACTIVATE_LINK]', activationURL);

    const mail = mailcomposer({
      from: project.projectEmail,
      to: email,
      subject: subject,
      text: bodyText,
      html: bodyHtml,
    });

    return new Promise((resolve, reject) => {
      mail.build((err, message) => {
        if (err) {
          reject(err);
        }

        resolve(message);
      });
    }).then((message) => {
      const sendMessage = {
        to: email,
        message: message.toString('ascii'),
      };

      mailgun.messages().sendMime(sendMessage).then((result) => {
        logger.debug(loggerName, methodName, result);
        logger.debug(loggerName, methodName,
            util.format('Message successfully submitted to %s', email));
        resolve(result);
      }).catch((err) => {
        logger.error(loggerName, methodName, err);
        reject(err);
      });
    });
  }).catch((err) => {
    logger.error(loggerName, methodName, err);
  });
};

module.exports.sendForgotPassword = function(project, email, activationCode) {
  const methodName = '[SendForgotPassword]';

  return new Promise((resolve, reject) => {
    const projectUrl = String(config.get('env')) === 'dev' ?
        project.devUrl :
        project.url;
    let subject = eTemplate.sendForgotPassword.SUBJECT;

    let activationLink = '<p><a href=\'' + projectUrl + '/change-password/' +
        email + '/' + activationCode + '\'">Reset</a></p>';

    let bodyHtml = eTemplate.sendForgotPassword.HTML_MSG.replace('[EMAIL]',
        email).replace('[ACTIVATE_LINK]', activationLink);

    bodyHtml += eTemplate.FOOTER.replace('[COMPANY_NAME]', project.name);
    bodyHtml += eTemplate.DISCLAIMER;

    activationLink = projectUrl + '/change-password/' + email + '/' +
        activationCode;

    let bodyText = eTemplate.sendForgotPassword.PLAIN_MSG.replace('[EMAIL]',
        email).replace('[ACTIVATE_LINK]', activationLink);

    const mail = mailcomposer({
      from: project.projectEmail,
      to: email,
      subject: subject,
      text: bodyText,
      html: bodyHtml,
    });

    return new Promise((resolve, reject) => {
      mail.build((err, message) => {
        if (err) {
          reject(err);
        }

        resolve(message);
      });
    }).then((message) => {
      const sendMessage = {
        to: email,
        message: message.toString('ascii'),
      };

      mailgun.messages().sendMime(sendMessage).then((result) => {
        logger.debug(loggerName, methodName,
            util.format('Message successfully submitted to %s', email));
        resolve(result);
      }).catch((err) => {
        logger.error(loggerName, methodName, err);
        reject(err);
      });
    });
  }).catch((err) => {
    logger.error(loggerName, methodName, err);
  });
};

module.exports.sendPasswordResetCompleted = function(project, email) {
  const methodName = '[SendPasswordResetCompleted]';

  return new Promise((resolve, reject) => {
    let subject = eTemplate.sendPasswordResetCompleted.SUBJECT;

    let bodyHtml = eTemplate.sendPasswordResetCompleted.HTML_MSG.replace(
        '[EMAIL]', email);

    bodyHtml += eTemplate.FOOTER.replace('[COMPANY_NAME]', project.name);

    bodyHtml += eTemplate.DISCLAIMER;

    let bodyText = eTemplate.sendPasswordResetCompleted.PLAIN_MSG.replace(
        '[EMAIL]', email);

    const mail = mailcomposer({
      from: project.projectEmail,
      to: email,
      subject: subject,
      text: bodyText,
      html: bodyHtml,
    });

    return new Promise((resolve, reject) => {
      mail.build((err, message) => {
        if (err) {
          reject(err);
        }

        resolve(message);
      });
    }).then((message) => {
      const sendMessage = {
        to: email,
        message: message.toString('ascii'),
      };

      mailgun.messages().sendMime(sendMessage).then((result) => {
        logger.debug(loggerName, methodName,
            util.format('Message successfully submitted to %s', email));
        resolve(result);
      }).catch((err) => {
        logger.error(loggerName, methodName, err);
        reject(err);
      });
    });
  }).catch((err) => {
    logger.error(loggerName, methodName, err);
  });
};

module.exports.notifyTransfer = function(project, email, tknAmount) {
  const methodName = '[NotifyTransfer]';

  return new Promise((resolve, reject) => {
    let subject = eTemplate.sendDepositTKN.SUBJECT;

    let bodyHtml = eTemplate.sendDepositTKN.HTML_MSG.replace('[EMAIL]', email).
        replace('[TOKEN_AMOUNT]', tknAmount);

    bodyHtml += eTemplate.FOOTER.replace('[COMPANY_NAME]',
        project.projectEmail);

    bodyHtml += eTemplate.DISCLAIMER;

    let bodyText = eTemplate.sendDepositTKN.PLAIN_MSG.replace('[EMAIL]', email).
        replace('[TOKEN_AMOUNT]', tknAmount);

    const data = {
      from: project.projectEmail,
      to: email,
      subject: subject,
      text: bodyText,
      html: bodyHtml,
    };

    mailgun.messages().send(data).then((result) => {
      logger.debug(loggerName, methodName,
          util.format('Message successfully submitted to %s', email));
      resolve(result);
    }).catch((err) => {
      logger.error(loggerName, methodName, err);
      reject(err);
    });
  }).catch((err) => {
    logger.error(loggerName, methodName, err);
  });
};

module.exports.sendSubscription = (project, email) => {
  const methodName = '[SendEmail]';

  return new Promise((resolve, reject) => {
    let subject = eTemplate.sendSubscription.SUBJECT;

    let bodyHtml = eTemplate.sendSubscription.HTML_MSG;

    const data = {
      from: project.projectEmail,
      to: email,
      subject: subject,
      text: bodyHtml,
      html: bodyHtml,
    };

    mailgun.messages().send(data).then((result) => {
      logger.debug(loggerName, methodName,
          util.format('Message successfully submitted to %s', email));
      resolve(result);
    }).catch((err) => {
      logger.error(loggerName, methodName, err);
      reject(err);
    });
  }).catch((err) => {
    logger.error(loggerName, methodName, err);
  });
};
