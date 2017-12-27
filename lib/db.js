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

require('../models/AddressesModel');
require('../models/CurrenciesModel');
require('../models/EthereumTxsModel');
require('../models/HistoriesModel');
require('../models/HooksModels');
require('../models/NotificationsModel');
require('../models/ProjectsModel');
require('../models/ReferralsDataModel');
require('../models/ReferralProgramsModel');
require('../models/StripeChargesModel');
require('../models/StripeCustomersModel');
require('../models/StripeRequestsModel');
require('../models/SupportsModel');
require('../models/TransfersModel');
require('../models/UsersModel');
require('../models/TeamModel');
