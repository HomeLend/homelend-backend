const express = require('express');
// eslint-disable-next-line new-cap
const router = express.Router();
const governmentController = require('../controllers/governmentController');

router.post('/updateRequest', governmentController.updateRequest);
router.get('/pending', governmentController.pull);

module.exports = router;
