'use strict';
/* Main dependencies */
const express = require('express');
const bodyParser = require('body-parser');
const config = require('config');
const morgan = require('./lib/morgan');
const httpStatus = require('http-status-codes');
const logger = require('./lib/logger');

/* Register all libs */
require('./lib/db');

/* Register all models */
require('./models/UsersModel');
require('./models/PropertyModel');

/* Register all routes */
const appraiserRouter = require('./routes/appraiserRouter');
const buyerRouter = require('./routes/buyerRouter');
const bankRouter = require('./routes/bankRouter');
const governmentRouter = require('./routes/governmentRouter');
const insuranceRouter = require('./routes/insuranceRouter');
const sellerRouter = require('./routes/sellerRouter');
const creditScoreRouter = require('./routes/creditScoreRouter');
const app = express();

app.use(morgan);
app.set('view engine', 'pug');
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

// Enable Cross Origin Resource Sharing
app.all('/*', function (req, res, next) {
    // CORS headers
    if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Origin', req.headers.origin);
        res.header('Access-Control-Allow-Headers',
            'Content-Type,X-Access-Token,Cache-Control');
        return res.sendStatus(httpStatus.OK).end();
    } else {
        res.header('Access-Control-Allow-Origin', req.headers.origin);
        next();
    }
});

/* Express Router configrations */
const API = '/api/v1/';
app.use(API + 'seller', sellerRouter);
app.use(API + 'buyer', buyerRouter);
app.use(API + 'appraiser', appraiserRouter);
app.use(API + 'government', governmentRouter);
app.use(API + 'insurance', insuranceRouter);
app.use(API + 'creditscore', creditScoreRouter);
app.use(API + 'bank', bankRouter);



// catch 404 and forward to error handler
app.use(function (req, res, next) {
    return res.status(httpStatus.NOT_FOUND).send({'err': 'Not found'});
});

// error handler
app.use(function (err, req, res, next) {
    logger.error('[Handler]', err);
    return res.status(httpStatus.BAD_REQUEST).send({'err': 'Bad request'});
});

logger.debug('[Server]', 'Server running mode', config.get('env'));

module.exports = app;