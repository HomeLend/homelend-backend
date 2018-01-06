const express = require('express');
// eslint-disable-next-line new-cap
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/', authController.auth);
router.post('/sign-up', authController.signup);
//Temp method for registering user inside blockchain
router.post('/reg', authController.registerUserBlockchain);

// router.post('/activate', authController.activateEmail);
// router.post('/activate-account', authController.activateAccount);
// router.post('/change-password', authController.changePassword);
// router.post('/forgot-password', authController.forgotPassword);
// router.post('/verify-activation', authController.verifyActivationCode);
// router.post('/resend-activate-email', authController.resendActivateEmail);

// router.get('/verify', authController.verify);
// router.get('/addresses', authController.getAddresses);


module.exports = router;