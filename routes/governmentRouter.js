const express = require('express');
// eslint-disable-next-line new-cap
const router = express.Router();
const governmentController = require('../controllers/governmentController');

router.post('/confirm-house', governmentController.confirmHouse);
router.post('/change-title', governmentController.changeTitle);

module.exports = router;
