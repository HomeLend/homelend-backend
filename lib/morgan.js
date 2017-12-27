'use strict';

const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const rfs = require('rotating-file-stream');
const config = require('config');

const logDirectory = path.join(__dirname, '../logs/morgan');

// ensure log directory exists
fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);

// create a rotating write stream
const accessLogStream = rfs('access.log', {
  interval: '1d', // rotate daily
  path: logDirectory,
});


if (String(config.get('env')) === 'prod') {
    module.exports = morgan('[:date[clf]]  :remote-addr - :remote-user ' +
        '":method :url" :status :response-time ms', {stream: accessLogStream});
} else {
    module.exports = morgan('[:date[clf]]  :remote-addr - :remote-user ":method :url" :status :response-time ms');
}
