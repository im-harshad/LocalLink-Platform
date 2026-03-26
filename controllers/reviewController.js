const Review = require('../models/Review');
const Booking = require('../models/Booking');

const reviewController = {
    // Add a review (only if service is completed)
    addReview: async (req, res) => {
        const { provider_id, rating, comment } = req.body;
        const user_id = req.user.id;

        try {
            // Business Rule: Users can't review themselves
            if (req.user.provider_id === provider_id) {
                return res.status(403).json({ message: 'Professionals cannot review their own profiles.' });
            }

            // Optional Security check: ensure user has completed booking with provider
            const userBookings = await Booking.findByUser(user_id);
            const hasCompletedBooking = userBookings.some(b => 
                b.provider_id === parseInt(provider_id) && b.status === 'completed'
            );

            if (!hasCompletedBooking) {
                return res.status(403).json({ message: 'Reviews are only permitted for users with completed appointments.' });
            }

            // Check if already reviewed
            const alreadyReviewed = await Review.hasUserReviewed(user_id, provider_id);
            if (alreadyReviewed) {
                return res.status(400).json({ message: 'A review for this provider has already been submitted.' });
            }

            const reviewId = await Review.create({ user_id, provider_id, rating, comment });
            res.status(201).json({ message: 'Review successfully submitted.', reviewId });
        } catch (error) {
            console.error('Add Review Error:', error);
            res.status(500).json({ message: 'Backend failure during review submission.' });
        }
    },

    // Get all reviews for a provider
    getProviderReviews: async (req, res) => {
        const { provider_id } = req.params;
        try {
            const reviews = await Review.findByProvider(provider_id);
            const ratingInfo = await Review.getAverageRating(provider_id);
            
            res.json({
                reviews,
                average_rating: parseFloat(ratingInfo.averageRating || 0).toFixed(1),
                total_reviews: ratingInfo.reviewCount
            });
        } catch (error) {
            console.error('Fetch Reviews Error:', error);
            res.status(500).json({ message: 'Error retrieving profile evaluations.' });
        }
    }
};

module.exports = reviewController;
