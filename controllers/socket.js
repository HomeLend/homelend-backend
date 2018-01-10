const buyerController = require('../controllers/buyerController');

let socket = {};

module.exports = (io = null) => {

  // If the exported function has no values, return the socket object
  if(io === null) return socket;

  // On user connection, join the connection to this room
  io.on('connection', socket => {
    socket.join('propertiesList room');
 //   socket.emit('propertiesList', buyerController.getProperties4Sale())
  });

  socket = io;

}