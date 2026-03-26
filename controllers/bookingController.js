const Booking = require('../models/Booking');
const QueueToken = require('../models/QueueToken');
const db = require('../config/db');

// Helper: Create a notification in DB and emit via socket
async function createNotification(user_id, title, message, type, metadata) {
    try {
        await db.query(
            `INSERT INTO notifications (user_id, title, message, type, metadata) VALUES (?, ?, ?, ?, ?)`,
            [user_id, title, message, type, metadata ? JSON.stringify(metadata) : null]
        );
        if (global.io) {
            global.io.to(`user_${user_id}`).emit('new_notification', { title, message, type });
        }
    } catch (err) {
        console.error('Notification creation error:', err);
    }
}

const bookingController = {
    // Create new booking
    createBooking: async (req, res) => {
        const { provider_id, service_id, booking_date } = req.body;
        const user_id = req.user.id;

        try {
            // Create booking entry
            const bookingId = await Booking.create({ user_id, provider_id, service_id, booking_date });

            // Automatically issue a queue token
            const token_number = await QueueToken.getNextToken(provider_id);
            const tokenId = await QueueToken.create({ provider_id, user_id, token_number });

            // Fetch service name and price for notification
            const [services] = await db.query('SELECT name, price FROM services WHERE id = ?', [service_id]);
            const serviceName = services[0]?.name || 'Service';
            const price = services[0]?.price || 0;

            // 📢 Notify Customer
            await createNotification(
                user_id,
                '🎉 Booking Confirmed!',
                `Your booking for "${serviceName}" is confirmed. Virtual token #${token_number} issued. Pay ₹${price} to complete.`,
                'booking',
                { booking_id: bookingId, token_number }
            );

            // 📢 Notify Provider (find provider's user_id)
            const [providerRows] = await db.query('SELECT user_id FROM providers WHERE id = ?', [provider_id]);
            if (providerRows.length) {
                await createNotification(
                    providerRows[0].user_id,
                    '📅 New Booking Received!',
                    `A new booking for "${serviceName}" has been placed. Token #${token_number} issued.`,
                    'booking',
                    { booking_id: bookingId, token_number }
                );
            }

            res.status(201).json({
                message: 'Booking and queue token created successfully',
                bookingId,
                token_number,
                price,
                service_name: serviceName
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error creating booking' });
        }
    },

    // Get user bookings
    getUserBookings: async (req, res) => {
        const user_id = req.user.id;
        try {
            const bookings = await Booking.findByUser(user_id);
            res.json(bookings);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error fetching bookings' });
        }
    },

    // Get provider's own bookings (Hardened Security)
    getProviderBookings: async (req, res) => {
        try {
            const Provider = require('../models/Provider');
            let providerId = req.user.provider_id;

            // Fail-safe: Resolve providerId if missing in token
            if (!providerId) {
                const provider = await Provider.findByUserId(req.user.id);
                if (!provider) return res.status(403).json({ message: 'Authorization required for professionals' });
                providerId = provider.id;
            }

            const bookings = await Booking.findByProvider(providerId);
            res.json(bookings);
        } catch (error) {
            console.error('Fetch Provider Bookings Error:', error);
            res.status(500).json({ message: 'Secure retrieval failed' });
        }
    },

    // Update booking status (With Ownership Verification + Socket.io notification)
    updateBookingStatus: async (req, res) => {
        const { id, status } = req.body;
        const userId = req.user.id;

        try {
            // Audit Check: Does this provider OWN this booking?
            const Provider = require('../models/Provider');
            const provider = await Provider.findByUserId(userId);
            if (!provider) return res.status(403).json({ message: 'Only professionals can update statuses' });

            const booking = await Booking.findById(id);
            if (!booking || booking.provider_id !== provider.id) {
                return res.status(403).json({ message: 'Security Breach: Unauthorized status update attempt' });
            }

            const result = await Booking.updateStatus(id, status);

            // Sync with Queue
            if (status === 'completed' || status === 'cancelled') {
                const activeToken = await QueueToken.getUserToken(booking.user_id);
                if (activeToken && activeToken.provider_id === provider.id) {
                    await QueueToken.updateStatus(activeToken.id, status);
                }
            }

            // 📢 Notify customer of status change
            const statusMessages = {
                confirmed: '✅ Your booking has been confirmed by the provider!',
                completed: '🏁 Your service is marked as completed. Please leave a review!',
                cancelled: '❌ Your booking was cancelled by the provider.'
            };

            if (statusMessages[status]) {
                await createNotification(
                    booking.user_id,
                    `Booking ${status.charAt(0).toUpperCase() + status.slice(1)}`,
                    statusMessages[status],
                    'booking',
                    { booking_id: id, status }
                );
            }

            res.json({ message: 'Booking updated successfully', affectedRows: result });
        } catch (error) {
            console.error('Update Booking Status Error:', error);
            res.status(500).json({ message: 'Secure update failed' });
        }
    }
};

module.exports = bookingController;
