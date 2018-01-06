'use strict';

const db = require('../lib/db');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UsersSchema = new Schema({
    fullname: {
        type: String,
        required: true,
    },
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
    twoFaEnabled: Boolean,
    twoFaCode: String,
    forgotPasswordCode: String,
    forgotPasswordTried: Number,
    authCount: {
        type: Number,
        default: 0,
    },
    hash: {
        type: String,
        require: true
    },
    active: {
        type: Boolean,
        default: false,
    },
    verified: {
        type: Boolean,
        default: false,
    },
    activationCode: String,
    referralCode: {
        type: String,
        required: false,
    },
    timestamp: {type: Date, default: Date.now},
});

db.model('Users', UsersSchema);

