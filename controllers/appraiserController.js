module.exports.getConfirmedRequests = (req, res) => {
  return res.send([{
    buyer: '13213',
    property: {
      address: '12313',
      owner: '12312',
      sellingPrice: 1000
    },
    loanAmount: 100
  }]);
};

module.exports.providePrice = (req, res) => {
  const propertyHash = req.body.propertyHash;
  const price = req.body.price;

  return res.send({
    propertyHash: propertyHash,
    price: price,
    appraiser: '',
    txHash: '123213213',
    status: 'PRICE_INSTALLED'
  });
};