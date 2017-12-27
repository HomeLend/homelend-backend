const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

router.get('/notifications-latest/:limit?', notificationController.getAllNotifications);

module.exports = router;
