const winston = require('winston');

let logger = new (winston.Logger)({
    level: 'debug',
    transports: [
        new (winston.transports.Console)({json: false, timestamp: true}),
        //new winston.transports.File({ filename: __dirname + '/debug.log', json: false })
    ],
    /*exceptionHandlers: [
        new (winston.transports.Console)({json: false, timestamp: true, prettyPrint: true}),
        //new winston.transports.File({ filename: __dirname + '/exceptions.log', json: false })
    ],*/
    exitOnError: false
});

module.exports = logger;