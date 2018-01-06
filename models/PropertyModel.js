'use strict';

const db = require('../lib/db');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
require('mongoose-double')(mongoose);
const SchemaTypes = mongoose.Schema.Types;

const PropertySchema = new Schema({
    Hash: {
        type: String,
        required: true,
    },
    SellerHash: {
        type: String,
        required: true,
    },
    Address: {
        type: String,
        required: true,
    },
    SellingPrice: {
        type: SchemaTypes.Double
    },
    timestamp: {type: Date, default: Date.now},
});

db.model('Properties', PropertySchema);

