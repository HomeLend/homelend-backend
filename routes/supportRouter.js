const express = require('express');
// eslint-disable-next-line new-cap
const router = express.Router();
const supportController = require('../controllers/supportController');

router.post('/add', supportController.addSupportMessage);

module.exports = router;