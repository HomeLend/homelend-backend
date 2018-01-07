'use strict';

const db = require('../lib/db');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UsersCacheSchema = new Schema({
    email: {
        type: String,
        lowercase: true,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    timestamp: {type: Date, default: Date.now},
});

db.model('UsersCache', UsersCacheSchema);

