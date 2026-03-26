const db = require('../config/db');

const Review = {
    // Create a new review
    create: async (reviewData) => {
        const { user_id, provider_id, rating, comment } = reviewData;
        try {
            const [result] = await db.query(
                'INSERT INTO reviews (user_id, provider_id, rating, comment) VALUES (?, ?, ?, ?)',
                [user_id, provider_id, rating, comment]
            );
            return result.insertId;
        } catch (error) {
            throw error;
        }
    },

    // Find reviews for a specific provider
    findByProvider: async (provider_id) => {
        try {
            const [rows] = await db.query(
                `SELECT r.*, u.name as reviewer_name 
                 FROM reviews r 
                 JOIN users u ON r.user_id = u.id 
                 WHERE r.provider_id = ? 
                 ORDER BY r.created_at DESC`,
                [provider_id]
            );
            return rows;
        } catch (error) {
            throw error;
        }
    },

    // Get average rating for a provider
    getAverageRating: async (provider_id) => {
        try {
            const [rows] = await db.query(
                'SELECT AVG(rating) as averageRating, COUNT(*) as reviewCount FROM reviews WHERE provider_id = ?',
                [provider_id]
            );
            return rows[0];
        } catch (error) {
            throw error;
        }
    },

    // Check if a user has already reviewed this provider
    hasUserReviewed: async (user_id, provider_id) => {
        try {
            const [rows] = await db.query(
                'SELECT * FROM reviews WHERE user_id = ? AND provider_id = ?',
                [user_id, provider_id]
            );
            return rows.length > 0;
        } catch (error) {
            throw error;
        }
    }
};

module.exports = Review;
