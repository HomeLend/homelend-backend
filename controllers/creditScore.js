const db = require('../lib/db');

const Promise = require('bluebird');
module.exports.getCreditScore = (user, salary, loanAmount) => {

  return new Promise ((resolve) => {
    return {
      _id: user,
      creditScore: 1
    };
  });
};
