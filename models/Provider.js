const db = require('../config/db');

const Provider = {
    // Create provider profile
    create: async (providerData) => {
        const { user_id, service_type, location, description } = providerData;
        try {
            const [result] = await db.query(
                'INSERT INTO providers (user_id, service_type, location, description) VALUES (?, ?, ?, ?)',
                [user_id, service_type, location, description]
            );
            return result.insertId;
        } catch (error) {
            throw error;
        }
    },

    // Find provider by user ID
    findByUserId: async (user_id) => {
        try {
            const [rows] = await db.query(
                'SELECT p.*, u.name, u.email FROM providers p JOIN users u ON p.user_id = u.id WHERE p.user_id = ?',
                [user_id]
            );
            return rows[0];
        } catch (error) {
            throw error;
        }
    },

    // Find provider with user and info by ID
    findById: async (id) => {
        try {
            const [rows] = await db.query(
                'SELECT p.*, u.name, u.email FROM providers p JOIN users u ON p.user_id = u.id WHERE p.id = ?',
                [id]
            );
            return rows[0];
        } catch (error) {
            throw error;
        }
    },

    // Get all providers (With Aggregate Ratings)
    findAllApproved: async () => {
        try {
            const [rows] = await db.query(`
                SELECT p.*, u.name, 
                       IFNULL(AVG(r.rating), 0) as average_rating, 
                       COUNT(r.id) as review_count
                FROM providers p 
                JOIN users u ON p.user_id = u.id
                LEFT JOIN reviews r ON r.provider_id = p.id
                GROUP BY p.id
            `);
            return rows;
        } catch (error) {
            throw error;
        }
    },

    // Get all providers
    findAll: async () => {
        try {
            const [rows] = await db.query(`
                SELECT p.*, u.name, u.email,
                       IFNULL(AVG(r.rating), 0) as average_rating, 
                       COUNT(r.id) as review_count
                FROM providers p 
                JOIN users u ON p.user_id = u.id
                LEFT JOIN reviews r ON r.provider_id = p.id
                GROUP BY p.id
            `);
            return rows;
        } catch (error) {
            throw error;
        }
    },

    // Approve provider (Now redundant but kept for API compatibility)
    approve: async (id) => {
        try {
            const [result] = await db.query('UPDATE providers SET is_approved = TRUE WHERE id = ?', [id]);
            return result.affectedRows;
        } catch (error) {
            throw error;
        }
    },

    // Filter providers by category (Auto-approved)
    findByCategory: async (category_id) => {
        try {
            const [rows] = await db.query(
                `SELECT DISTINCT p.*, u.name, c.name as category_name,
                        IFNULL(AVG(rv.rating), 0) as average_rating, 
                        COUNT(rv.id) as review_count
                 FROM providers p 
                 JOIN users u ON p.user_id = u.id 
                 JOIN services s ON s.provider_id = p.id 
                 JOIN categories c ON s.category_id = c.id
                 LEFT JOIN reviews rv ON rv.provider_id = p.id
                 WHERE s.category_id = ?
                 GROUP BY p.id`,
                [category_id]
            );
            return rows;
        } catch (error) {
            throw error;
        }
    },

    // Update provider profile details
    updateProfile: async (id, profileData) => {
        const { service_type, location, description } = profileData;
        try {
            const [result] = await db.query(
                'UPDATE providers SET service_type = ?, location = ?, description = ? WHERE id = ?',
                [service_type, location, description, id]
            );
            return result.affectedRows;
        } catch (error) {
            throw error;
        }
    }
};

module.exports = Provider;
