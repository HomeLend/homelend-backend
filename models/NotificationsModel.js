'use strict';

const db = require('../lib/db');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const notificationSchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
        required: true,
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['alert', 'event', 'log'],
        default: 'alert',
    },
    status: {
        type: String,
        enum: ['', 'urgent', 'pending', 'settled', 'successful'],
        default: '',
    },
    color: {
        type: String,
        enum: ['', 'primary', 'danger', 'info', 'success', 'warning', 'default'],
        default: '',
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

db.model('Notifications', notificationSchema);