const { getProperties4SaleSocket } = require('../controllers/buyerController');
const { getCreditRatingListSocket } = require('../controllers/creditScoreController');


const emitPropertiesList = () => {
  getProperties4SaleSocket(res => {
    socket.emit('propertiesList', res)
  })
}

const emitCreditRatingList = () => {
  console.log("Got it");
  getCreditRatingListSocket(res => {
    socket.emit('CreditRatingList', res)
  })
}

let socket = {};

module.exports = (io = null) => {

  // If the exported function has no values, return the socket object
  if(io === null) return socket;

  // On user connection, join the connection to this room
  io.on('connection', socket => {
    socket.join('propertiesList room');
    emitPropertiesList()
    socket.on('getCreditRankList', emitCreditRatingList)
  });

  socket = io;

  socket.emitPropertiesList = emitPropertiesList;

}