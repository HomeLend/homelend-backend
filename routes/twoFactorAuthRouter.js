const express = require('express');
// eslint-disable-next-line new-cap
const router = express.Router();
const twoFactorAuthController = require(
    '../controllers/twoFactorAuthController');

router.post('/generate', twoFactorAuthController.generate2FA);
router.post('/check', twoFactorAuthController.check2FA);
router.post('/confirm', twoFactorAuthController.confirm2FA);
router.post('/disable', twoFactorAuthController.disable2FA);

module.exports = router;
