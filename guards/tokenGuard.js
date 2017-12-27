const config = require('config');
const jwt = require('jsonwebtoken');
const logger = require('../lib/logger');

const httpStatus = require('http-status-codes');

const loggerName = '[TokenGuard]: ';

const allowedList = [
    '/api/v1/auth',
    '/api/v1/auth/verify',
    '/api/v1/auth/verify-activation',
    '/api/v1/auth/sign-up',
    '/api/v1/auth/forgot-password',
    '/api/v1/auth/check-activation-code',
    '/api/v1/hook/transfer',
];

const dynamicAllowedList = [
    '/api/v1/stripe/charge',
    '/api/v1/auth/activate',
    '/api/v1/auth/change-password',
    '/api/v1/bitgo',
    '/api/v1/stripe/crypto-charge'
];

const urlChecker = (url) => {
    for (const allowedUrl of dynamicAllowedList) {
        if (url.indexOf(allowedUrl) > -1) {
            return true;
        }
    }

    for (const allowedUrl of allowedList) {
        if (url === allowedUrl) {
            return true;
        }
    }
};

const projectMaps = {};
projectMaps['charg'] = 'chg';

module.exports = function (req, res, next) {
    const token = req.headers['x-access-token'];

    if (req.originalUrl !== '/api/v1/hook/transfer') {
        if (String(config.get('env')) === 'dev') {
            const origin = String(req.headers.origin);
            const twoSlashes = origin.indexOf('//') + 2;
            const firstDot = origin.indexOf('.');

            const projectSubDomain = origin.substr(twoSlashes, (firstDot - twoSlashes));
            const projectCode = projectMaps[projectSubDomain];

            if (!projectCode) {
                return res.sendStatus(httpStatus.NOT_FOUND);
            }

            req.projectCode = projectCode;
        } else {
            if (!req.headers || !req.headers.host) {
                return res.sendStatus(httpStatus.NOT_FOUND);
            }

            const origin = String(req.headers.host);
            const firstDot = origin.indexOf('.');

            const projectSubDomain = origin.substr(0, firstDot);
            const projectCode = projectMaps[projectSubDomain];

            if (!projectCode) {
                return res.sendStatus(httpStatus.NOT_FOUND);
            }

            req.projectCode = projectCode;
        }
    }

    if (urlChecker(req.originalUrl)) {
        next();
    } else {
        if (token) {
            jwt.verify(token, config.get('secret'), function (err, decoded) {
                if (err) {
                    if (err instanceof jwt.TokenExpiredError) {
                        return res.status(httpStatus.FORBIDDEN).send({'err': 'Session expired'});
                    }

                    return res.status(httpStatus.BAD_REQUEST).send({err: err});
                } else {
                    req.decoded = decoded;
                    req.token = token;

                    if (req.originalUrl.indexOf('admin') >= 0 &&
                        decoded.role !== 'admin') {
                        logger.error(loggerName, req.originalUrl, 'not an admin');
                        return res.status(403).json({'err': 'Forbidden'});
                    }
                    return next();
                }
            });
        } else {
            return res.status(httpStatus.FORBIDDEN).send({'err': 'Forbidden'});
        }
    }
};
