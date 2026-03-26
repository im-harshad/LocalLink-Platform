const db = require('../config/db');

const QueueToken = {
    // Get next token number for provider
    getNextToken: async (provider_id) => {
        try {
            const [rows] = await db.query(
                `SELECT MAX(token_number) as lastToken FROM queue_tokens 
                WHERE provider_id = ? AND DATE(issued_at) = CURDATE()`,
                [provider_id]
            );
            return (rows[0].lastToken || 0) + 1;
        } catch (error) {
            throw error;
        }
    },

    // Issue a new token
    create: async (tokenData) => {
        const { provider_id, user_id, token_number } = tokenData;
        try {
            const [result] = await db.query(
                'INSERT INTO queue_tokens (provider_id, user_id, token_number, status) VALUES (?, ?, ?, ?)',
                [provider_id, user_id, token_number, 'waiting']
            );
            return result.insertId;
        } catch (error) {
            throw error;
        }
    },

    // Get current serving token and queue status
    getQueueStatus: async (provider_id) => {
        try {
            const [rows] = await db.query(
                `SELECT 
                    (SELECT token_number FROM queue_tokens WHERE provider_id = ? AND status = 'serving' AND DATE(issued_at) = CURDATE() LIMIT 1) as serving_token,
                    (SELECT COUNT(*) FROM queue_tokens WHERE provider_id = ? AND status = 'waiting' AND DATE(issued_at) = CURDATE()) as people_waiting`,
                [provider_id, provider_id]
            );
            return rows[0];
        } catch (error) {
            throw error;
        }
    },

    // Get user position in queue
    getUserPosition: async (provider_id, token_number) => {
        try {
            const [rows] = await db.query(
                `SELECT COUNT(*) as position FROM queue_tokens 
                WHERE provider_id = ? AND status = 'waiting' AND token_number < ? AND DATE(issued_at) = CURDATE()`,
                [provider_id, token_number]
            );
            return rows[0].position + 1;
        } catch (error) {
            throw error;
        }
    },

    // Get user token details
    getUserToken: async (user_id) => {
        try {
            const [rows] = await db.query(
                `SELECT qt.*, p.service_type, u_p.name AS provider_name 
                FROM queue_tokens qt 
                JOIN providers p ON qt.provider_id = p.id 
                JOIN users u_p ON p.user_id = u_p.id 
                WHERE qt.user_id = ? AND DATE(qt.issued_at) = CURDATE() 
                ORDER BY qt.issued_at DESC LIMIT 1`,
                [user_id]
            );
            return rows[0];
        } catch (error) {
            throw error;
        }
    },

    // Get all today's tokens for provider
    getProviderQueue: async (provider_id) => {
        try {
            const [rows] = await db.query(
                `SELECT qt.*, u.name AS customer_name 
                FROM queue_tokens qt 
                JOIN users u ON qt.user_id = u.id 
                WHERE qt.provider_id = ? AND DATE(qt.issued_at) = CURDATE() 
                ORDER BY qt.token_number ASC`,
                [provider_id]
            );
            return rows;
        } catch (error) {
            throw error;
        }
    },

    // Update token status (Admin/Provider action)
    updateStatus: async (id, status) => {
        try {
            const [result] = await db.query('UPDATE queue_tokens SET status = ? WHERE id = ?', [status, id]);
            return result.affectedRows;
        } catch (error) {
            throw error;
        }
    },

    // Find token by ID
    findById: async (id) => {
        try {
            const [rows] = await db.query('SELECT * FROM queue_tokens WHERE id = ?', [id]);
            return rows[0];
        } catch (error) {
            throw error;
        }
    },
    // Get all today's tokens for all providers (Admin status monitor)
    findAllToday: async () => {
        try {
            const [rows] = await db.query(
                `SELECT qt.*, u.name AS customer_name, p.service_type, u_p.name AS provider_name 
                FROM queue_tokens qt 
                JOIN users u ON qt.user_id = u.id 
                JOIN providers p ON qt.provider_id = p.id 
                JOIN users u_p ON p.user_id = u_p.id 
                WHERE DATE(qt.issued_at) = CURDATE() 
                ORDER BY qt.issued_at DESC`
            );
            return rows;
        } catch (error) {
            throw error;
        }
    }
};

module.exports = QueueToken;
