const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { verifyToken } = require('../middleware/authMiddleware');

// @route   POST /api/reviews
// @desc    Add a review for a provider
router.post('/', verifyToken, reviewController.addReview);

// @route   GET /api/reviews/provider/:provider_id
// @desc    Get all reviews for a specific provider
router.get('/provider/:provider_id', reviewController.getProviderReviews);

module.exports = router;
