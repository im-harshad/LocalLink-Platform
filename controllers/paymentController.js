const db = require('../config/db');
const crypto = require('crypto');

const paymentController = {

    // POST /api/payments/initiate
    // Initiates a payment for a booking (simulated gateway)
    initiatePayment: async (req, res) => {
        const { booking_id, payment_method, card_number, card_expiry, card_cvv, upi_id } = req.body;
        const user_id = req.user.id;

        if (!booking_id || !payment_method) {
            return res.status(400).json({ success: false, message: 'booking_id and payment_method are required' });
        }

        try {
            // Verify booking belongs to this user
            const [bookings] = await db.query(
                `SELECT b.*, s.price, s.name AS service_name FROM bookings b
                 JOIN services s ON b.service_id = s.id
                 WHERE b.id = ? AND b.user_id = ?`,
                [booking_id, user_id]
            );

            if (!bookings.length) {
                return res.status(404).json({ success: false, message: 'Booking not found or unauthorized' });
            }

            const booking = bookings[0];

            if (booking.payment_status === 'paid') {
                return res.status(400).json({ success: false, message: 'This booking is already paid' });
            }

            // Check for existing pending payment
            const [existingPayments] = await db.query(
                'SELECT id FROM payments WHERE booking_id = ? AND status IN (?,?)',
                [booking_id, 'pending', 'processing']
            );
            if (existingPayments.length) {
                await db.query('DELETE FROM payments WHERE booking_id = ? AND status IN (?,?)', [booking_id, 'pending', 'processing']);
            }

            // Generate a transaction ID
            const txnId = `TXN${Date.now()}${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

            // Create payment record
            const [result] = await db.query(
                `INSERT INTO payments (booking_id, user_id, amount, payment_method, transaction_id, status, card_last4, upi_id)
                 VALUES (?, ?, ?, ?, ?, 'processing', ?, ?)`,
                [
                    booking_id,
                    user_id,
                    booking.price,
                    payment_method,
                    txnId,
                    payment_method === 'card' && card_number ? card_number.slice(-4) : null,
                    payment_method === 'upi' ? upi_id : null
                ]
            );

            const paymentId = result.insertId;

            res.json({
                success: true,
                payment_id: paymentId,
                transaction_id: txnId,
                amount: booking.price,
                service_name: booking.service_name,
                message: 'Payment initiated. Processing...'
            });

        } catch (error) {
            console.error('Payment initiate error:', error);
            res.status(500).json({ success: false, message: 'Payment initiation failed' });
        }
    },

    // POST /api/payments/confirm
    // Confirms a payment (simulated — in real system Razorpay webhook would do this)
    confirmPayment: async (req, res) => {
        const { payment_id, transaction_id } = req.body;
        const user_id = req.user.id;

        try {
            const [payments] = await db.query(
                'SELECT * FROM payments WHERE id = ? AND user_id = ? AND transaction_id = ?',
                [payment_id, user_id, transaction_id]
            );

            if (!payments.length) {
                return res.status(404).json({ success: false, message: 'Payment record not found' });
            }

            const payment = payments[0];

            // Simulate processing delay / gateway validation
            // In real world: verify Razorpay signature here
            const isSuccess = true; // Always succeed in our simulation

            if (isSuccess) {
                // Mark payment as success
                await db.query(
                    'UPDATE payments SET status = ?, paid_at = NOW(), gateway_response = ? WHERE id = ?',
                    ['success', JSON.stringify({ simulated: true, confirmed_at: new Date().toISOString() }), payment_id]
                );

                // Mark booking as paid
                await db.query(
                    'UPDATE bookings SET payment_status = ?, status = ? WHERE id = ?',
                    ['paid', 'confirmed', payment.booking_id]
                );

                // Award loyalty points (10 points per ₹100 spent)
                const pointsEarned = Math.floor(parseFloat(payment.amount) / 10);
                await awardLoyaltyPoints(user_id, pointsEarned, 'earned', `Payment for booking #${payment.booking_id}`, payment.booking_id, db);

                // Create notification
                await db.query(
                    `INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)`,
                    [user_id, '✅ Payment Successful', `₹${payment.amount} paid successfully. You earned ${pointsEarned} loyalty points!`, 'payment']
                );

                // Emit socket event via global io
                if (global.io) {
                    global.io.to(`user_${user_id}`).emit('payment_success', {
                        amount: payment.amount,
                        points_earned: pointsEarned,
                        booking_id: payment.booking_id,
                        transaction_id
                    });
                }

                res.json({
                    success: true,
                    message: 'Payment confirmed successfully',
                    points_earned: pointsEarned,
                    booking_id: payment.booking_id
                });

            } else {
                await db.query('UPDATE payments SET status = ? WHERE id = ?', ['failed', payment_id]);
                res.status(400).json({ success: false, message: 'Payment failed. Please try again.' });
            }

        } catch (error) {
            console.error('Payment confirm error:', error);
            res.status(500).json({ success: false, message: 'Confirmation failed' });
        }
    },

    // GET /api/payments/history
    getPaymentHistory: async (req, res) => {
        const user_id = req.user.id;
        try {
            const [payments] = await db.query(
                `SELECT p.*, s.name AS service_name, u2.name AS provider_name
                 FROM payments p
                 JOIN bookings b ON p.booking_id = b.id
                 JOIN services s ON b.service_id = s.id
                 JOIN providers pr ON b.provider_id = pr.id
                 JOIN users u2 ON pr.user_id = u2.id
                 WHERE p.user_id = ?
                 ORDER BY p.created_at DESC`,
                [user_id]
            );
            res.json({ success: true, payments });
        } catch (error) {
            console.error('Payment history error:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch payment history' });
        }
    },

    // GET /api/payments/booking/:bookingId
    getBookingPayment: async (req, res) => {
        const user_id = req.user.id;
        const { bookingId } = req.params;
        try {
            const [payments] = await db.query(
                'SELECT * FROM payments WHERE booking_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1',
                [bookingId, user_id]
            );
            res.json({ success: true, payment: payments[0] || null });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to fetch payment' });
        }
    }
};

// Helper: Award loyalty points
async function awardLoyaltyPoints(userId, points, type, description, bookingId, db) {
    try {
        // Upsert loyalty_points row
        await db.query(
            `INSERT INTO loyalty_points (user_id, total_points, lifetime_points, tier)
             VALUES (?, ?, ?, 'bronze')
             ON DUPLICATE KEY UPDATE
               total_points = total_points + VALUES(total_points),
               lifetime_points = lifetime_points + VALUES(lifetime_points),
               tier = CASE
                 WHEN lifetime_points + VALUES(lifetime_points) >= 5000 THEN 'platinum'
                 WHEN lifetime_points + VALUES(lifetime_points) >= 2000 THEN 'gold'
                 WHEN lifetime_points + VALUES(lifetime_points) >= 500  THEN 'silver'
                 ELSE 'bronze'
               END`,
            [userId, points, points]
        );

        // Log transaction
        await db.query(
            `INSERT INTO loyalty_transactions (user_id, points, type, description, booking_id) VALUES (?, ?, ?, ?, ?)`,
            [userId, points, type, description, bookingId || null]
        );
    } catch (err) {
        console.error('Award loyalty points error:', err);
    }
}

module.exports = paymentController;
module.exports.awardLoyaltyPoints = awardLoyaltyPoints;
