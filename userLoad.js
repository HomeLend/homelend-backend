const db = require('./lib/db');
const logger = require('./lib/logger');
const loggerName = '[UserLoad]';
const Promise = require('bluebird');
const sha512 = require('js-sha512').sha512;

const UsersModel = db.model('Users');

const USERS_COUNT = 10;

const userPromises = [];
for(let i = 0; i < USERS_COUNT; i++) {
  const fullname = 'u-' + i;

  const u = new UsersModel({
    fullname: fullname,
    email: fullname + '@gmail.com',
    password: sha512('123123'),
    role: 'admin',
    active: true,
    activationCode: fullname,
  });

  userPromises.push(u.save());
}

Promise.all(userPromises).then((users) => {
  logger.debug(loggerName, users);
  process.exit(1);
});