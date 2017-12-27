module.exports.getConfirmedRequests = (req, res) => {
  return res.send([
    {
      buyer: '12312',
      loanAmount: 100,
      assetValue: 100000
    }
  ]);
};

module.exports.provideOffer = (req, res) => {
  const monthlyPrice = req.body.monthlyPrice;
  const requestId = req.body.requestId;

  return res.send({
    requestId: requestId,
    monthlyPrice: monthlyPrice,
    txHash: '1231',
    status: 'INSURANCE_OFFERED'
  });
};