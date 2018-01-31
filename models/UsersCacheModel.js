'use strict';

const db = require('../lib/db');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UsersCacheSchema = new Schema({
    email: {
        lowercase : true,
        type: String,
        required: true,
        unique: true,
    },
    licenseNumber: {
        type: String,
    },
    swiftNumber: {
        type: String,
    },
    password: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ['buyer', 'seller', 'appraiser', 'bank', 'insurance', 'credit-rating','government']
    },
    key: {
        type: String,
    },
    certificate: {
        type: String,
    },
    rootCertificate: {
        type: String,
    },
    timestamp: {type: Date, default: Date.now},
});

db.model('UsersCache', UsersCacheSchema);

