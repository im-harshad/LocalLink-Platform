const db = require('../config/db');

const User = {
    // Find a user by email
    findByEmail: async (email) => {
        try {
            const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
            return rows[0];
        } catch (error) {
            throw error;
        }
    },

    // Create a new user
    create: async (userData) => {
        const { name, email, password, role } = userData;
        try {
            const [result] = await db.query(
                'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
                [name, email, password, role]
            );
            return result.insertId;
        } catch (error) {
            throw error;
        }
    },

    // Find user by ID
    findById: async (id) => {
        try {
            const [rows] = await db.query('SELECT id, name, email, role FROM users WHERE id = ?', [id]);
            return rows[0];
        } catch (error) {
            throw error;
        }
    }
};

module.exports = User;
