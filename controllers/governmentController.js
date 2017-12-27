module.exports.confirmHouse = (req, res) => {
  const houseId = req.body.houseId;

  return res.send([
    {
      description: 'House Owner',
      status: 'OK'
    },
    {
      description: 'Lien',
      status: 'OK'
    },
    {
      description: 'Warning shot',
      status: 'OK'
    }
  ]);
};

module.exports.changeTitle = (req, res) => {
  const houseId = req.body.houseId;
  const previousOwner = req.body.previousOwner;
  const newOwner = req.body.newOwner;

  return res.send({
    status: 'TITLED',
    previousOwner: previousOwner,
    newOwner: newOwner,
    currentOwner: newOwner
  });
};