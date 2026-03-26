const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { verifyToken } = require('../middleware/authMiddleware');

// Initiate a payment for a booking
router.post('/initiate', verifyToken, paymentController.initiatePayment);

// Confirm payment (simulate gateway callback)
router.post('/confirm', verifyToken, paymentController.confirmPayment);

// Get payment history for logged-in user
router.get('/history', verifyToken, paymentController.getPaymentHistory);

// Get payment status for a specific booking
router.get('/booking/:bookingId', verifyToken, paymentController.getBookingPayment);

module.exports = router;
