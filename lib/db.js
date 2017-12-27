const mongoose = require('mongoose');
const config = require('config');
const logger = require('../lib/logger');

mongoose.Promise = Promise;
let db = mongoose.createConnection(String(config.get('mongodb')), {
    useMongoClient: true,
});

db.on('error', logger.error.bind(console, 'connection to DB error: '));
db.once('open', function() {
    logger.debug('[Server]', 'Connection with MongoDB installed');
});

module.exports = db;

require('../models/NotificationsModel');
require('../models/SupportsModel');
require('../models/UsersModel');