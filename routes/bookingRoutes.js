const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { verifyToken, isProvider } = require('../middleware/authMiddleware');

// @route   POST /api/bookings
// @desc    Create a new booking and automatically issue a queue token
router.post('/', verifyToken, bookingController.createBooking);

// @route   GET /api/bookings/my-bookings
// @desc    Get all bookings for the logged-in user
router.get('/my-bookings', verifyToken, bookingController.getUserBookings);

// @route   GET /api/bookings/user/:id
// @desc    Get all bookings for a user
router.get('/user/:id', verifyToken, bookingController.getUserBookings);

// @route   GET /api/bookings/provider/:id
// @desc    Get all bookings for a provider
router.get('/provider/:id', verifyToken, isProvider, bookingController.getProviderBookings);

// @route   PUT /api/bookings/status
// @desc    Update booking status (status = 'pending', 'confirmed', 'completed', 'cancelled')
router.put('/status', verifyToken, bookingController.updateBookingStatus);

module.exports = router;
