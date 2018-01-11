const { getProperties4Sale } = require('../controllers/buyerController');


const emitPropertiesList = () => {
  getProperties4Sale(res => {
    socket.emit('propertiesList', res)
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
  });

  socket = io;

  socket.emitPropertiesList = emitPropertiesList;

  console.log("socket", socket);

}