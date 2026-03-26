const db = require('../config/db');

const Service = {
    // Add a service
    create: async (serviceData) => {
        const { provider_id, category_id, name, description, price } = serviceData;
        try {
            const [result] = await db.query(
                'INSERT INTO services (provider_id, category_id, name, description, price) VALUES (?, ?, ?, ?, ?)',
                [provider_id, category_id, name, description, price]
            );
            return result.insertId;
        } catch (error) {
            throw error;
        }
    },

    // Get services by provider
    findByProvider: async (provider_id) => {
        try {
            const [rows] = await db.query(
                `SELECT s.*, c.name AS category_name FROM services s 
                JOIN categories c ON s.category_id = c.id 
                WHERE s.provider_id = ?`,
                [provider_id]
            );
            return rows;
        } catch (error) {
            throw error;
        }
    },

    // Get all categories
    getCategories: async () => {
        try {
            const [rows] = await db.query('SELECT * FROM categories');
            return rows;
        } catch (error) {
            throw error;
        }
    }
};

module.exports = Service;
