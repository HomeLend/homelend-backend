const config = require('config');
const jwt = require('jsonwebtoken');

const httpStatus = require('http-status-codes');

const loggerName = '[TokenGuard]: ';

const allowedList = [
    '/api/v1/auth',
];

const dynamicAllowedList = [];

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

module.exports = function (req, res, next) {
    const token = req.headers['x-access-token'];

    if (urlChecker(req.originalUrl)) {
        next();
    } else {
        if (token) {
            jwt.verify(token, config.get('secret'), function (err, decoded) {
                if (err) {
                    console.error(loggerName, err);
                    if (err instanceof jwt.TokenExpiredError) {
                        return res.status(httpStatus.FORBIDDEN).send({err: 'Session expired'});
                    }

                    console.error(loggerName, err.message);
                    return res.status(httpStatus.BAD_REQUEST).send({err: err});
                } else {
                    req.decoded = decoded;
                    req.token = token;

                    if (req.originalUrl.indexOf('admin') >= 0 &&
                        decoded.role !== 'admin') {
                        console.error(loggerName, req.originalUrl, 'not an admin');
                        return res.status(403).send({err: 'Forbidden'});
                    }
                    return next();
                }
            });
        } else {
            return res.status(httpStatus.FORBIDDEN).send({err: 'Forbidden'});
        }
    }
};
