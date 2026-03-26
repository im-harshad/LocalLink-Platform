const db = require('../config/db');

const Booking = {
    // Create a new booking
    create: async (bookingData) => {
        const { user_id, provider_id, service_id, booking_date } = bookingData;
        try {
            const [result] = await db.query(
                'INSERT INTO bookings (user_id, provider_id, service_id, booking_date) VALUES (?, ?, ?, ?)',
                [user_id, provider_id, service_id, booking_date]
            );
            return result.insertId;
        } catch (error) {
            throw error;
        }
    },

    // Get bookings by user
    findByUser: async (user_id) => {
        try {
            const [rows] = await db.query(
                `SELECT b.*, p.service_type, u_p.name AS provider_name, s.name AS service_name, s.price 
                FROM bookings b 
                JOIN providers p ON b.provider_id = p.id 
                JOIN users u_p ON p.user_id = u_p.id 
                JOIN services s ON b.service_id = s.id 
                WHERE b.user_id = ? 
                ORDER BY b.booking_date DESC`,
                [user_id]
            );
            return rows;
        } catch (error) {
            throw error;
        }
    },

    // Get bookings for provider dashboard
    findByProvider: async (provider_id) => {
        try {
            const [rows] = await db.query(
                `SELECT b.*, u.name AS customer_name, u.email AS customer_email, s.name AS service_name, s.price 
                FROM bookings b 
                JOIN users u ON b.user_id = u.id 
                JOIN services s ON b.service_id = s.id 
                WHERE b.provider_id = ? 
                ORDER BY b.booking_date DESC`,
                [provider_id]
            );
            return rows;
        } catch (error) {
            throw error;
        }
    },

    // Get booking by ID
    findById: async (id) => {
        try {
            const [rows] = await db.query('SELECT * FROM bookings WHERE id = ?', [id]);
            return rows[0];
        } catch (error) {
            throw error;
        }
    },

    // Update booking status
    updateStatus: async (id, status) => {
        try {
            const [result] = await db.query('UPDATE bookings SET status = ? WHERE id = ?', [status, id]);
            return result.affectedRows;
        } catch (error) {
            throw error;
        }
    }
};

module.exports = Booking;
