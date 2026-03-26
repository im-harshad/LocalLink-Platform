const express = require('express');
const router = express.Router();
const loyaltyController = require('../controllers/loyaltyController');
const { verifyToken } = require('../middleware/authMiddleware');

// Get my loyalty points & tier info
router.get('/me', verifyToken, loyaltyController.getMyPoints);

// Get my loyalty transaction history
router.get('/transactions', verifyToken, loyaltyController.getTransactions);

// Redeem points
router.post('/redeem', verifyToken, loyaltyController.redeemPoints);

module.exports = router;
