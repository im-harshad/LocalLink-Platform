const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authValidation, loginValidation } = require('../middleware/validationMiddleware');

// @route   POST /api/auth/register
// @desc    Register a new user
router.post('/register', authValidation, authController.register);

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
router.post('/login', loginValidation, authController.login);

module.exports = router;
