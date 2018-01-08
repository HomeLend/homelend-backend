const express = require('express');
// eslint-disable-next-line new-cap
const router = express.Router();
const creditScoreController = require('../controllers/creditScoreController');

router.post('/calculate', creditScoreController.CalculateRating);

module.exports = router;
