const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/login', authController.login);
router.post('/register/student', authController.registerStudent);
router.post('/logout', authController.logout);

module.exports = router;
