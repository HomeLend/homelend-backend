const request = require('request-promise');
const config = require('config');
const Promise = require('bluebird');
const logger = require('../lib/logger');

const headers = {};

module.exports.validate = (captchaValue) => {
    if (String(config.get('env')) === 'dev') {
        return new Promise((resolve) => {
            return resolve(true);
        });
    } else {
        const options = {
            url: 'https://www.google.com/recaptcha/api/siteverify',
            method: 'POST',
            headers: headers,
            form: {
                secret: '6Ld68zsUAAAAAPfDqf1Cv-Czr1p3zijs-2Uv5Z7R',
                response: captchaValue
            }
        };

        return request(options)
            .then((r) => {
                return JSON.parse(r).success;
            })
            .catch((err) => {
                logger.error(loggerName, err);
                return false;
            });
    }
};
