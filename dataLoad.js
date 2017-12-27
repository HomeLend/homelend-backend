'use strict';
const db = require('./lib/db');
const sha512 = require('js-sha512').sha512;
const Promise = require('bluebird');

const NotificationModel = db.model('Notifications');
const SupportModel = db.model('Supports');
const UsersModel = db.model('Users');

const config = require('config');
const logger = require('./lib/logger');

const loggerName = '[DataLoad]';

let devCleaning = [];

if (String(config.get('env')) === 'dev') {
    devCleaning = [
        NotificationModel.remove().exec(),
        SupportModel.remove().exec(),
        UsersModel.remove({}).exec(),
    ];
}

Promise.all(devCleaning).then(() => {
    const arr = [];

    arr.push(new Promise((resolve) => {
        return resolve(new UsersModel({
            fullname: 'Kanat Tulbassiyev',
            email: 'admin@ico.com',
            password: sha512('123123'),
            role: 'admin',
            active: true,
            activationCode: '1',
        }).save());
    }));
});