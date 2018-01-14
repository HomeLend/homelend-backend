const db = require('../lib/db');

module.exports.getListOfPendingRequests = (req, res) => {

  return res.send([
    {
      owner: '13212313',
      price: '100$',
      buyer: '123123',
      salary: 100,
      loanAmount: 10000,
    }]);
};

module.exports.confirmPending = (req, res) => {
  const pendingRequestId = req.decoded._id;
  return res.send({
    interestRate: 2,
    months: 12,
    requestId: 1,
    txHash: "1231231313",
    status: 'CONFIRMED_BY_FI'
  })
};

module.exports.declinePending = (req, res) => {

};

module.exports.transferMoney = (req, res) => {

};
