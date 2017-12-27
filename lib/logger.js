const path = require('path');
const winston = require('winston');
const config = require('config');

require('winston-daily-rotate-file');

const logDirectory = path.join(__dirname, '../logs/winston/log-');

const transports = [];
const consoleLog = new winston.transports.Console({
  name: 'debug-console',
  level: 'debug',
  timestamp: true,
  prettyPrint: function(object) {
    return JSON.stringify(object);
  },
  handleExceptions: false,
  json: false,
  colorize: true,
});
transports.push(consoleLog);

if (String(config.get('env')) === 'prod') {
    const fileLog = new winston.transports.DailyRotateFile({
        level: 'debug',
        filename: `${logDirectory}/`,
        datePattern: 'yyyy-MM-dd.log',
        timestamp: true,
        handleExceptions: false,
        colorized: true,
        prettyPrint: function(object) {
            return JSON.stringify(object);
        },
    });

    transports.push(fileLog);
}

const logger = new winston.Logger({
  transports,
  exitOnError: false,
});

module.exports = logger;
