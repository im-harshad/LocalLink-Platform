const db = require('../config/db');

const loyaltyController = {

    // GET /api/loyalty/me
    getMyPoints: async (req, res) => {
        const user_id = req.user.id;
        try {
            const [rows] = await db.query(
                `SELECT lp.*, u.name FROM loyalty_points lp
                 JOIN users u ON lp.user_id = u.id
                 WHERE lp.user_id = ?`,
                [user_id]
            );

            if (!rows.length) {
                // Create fresh loyalty row if user doesn't have one
                await db.query(
                    `INSERT IGNORE INTO loyalty_points (user_id, total_points, lifetime_points, tier) VALUES (?, 0, 0, 'bronze')`,
                    [user_id]
                );
                return res.json({ success: true, loyalty: { total_points: 0, lifetime_points: 0, tier: 'bronze', next_tier: 'silver', points_to_next: 500 } });
            }

            const lp = rows[0];
            const { next_tier, points_to_next } = getNextTierInfo(lp.lifetime_points);

            res.json({
                success: true,
                loyalty: {
                    total_points: lp.total_points,
                    lifetime_points: lp.lifetime_points,
                    tier: lp.tier,
                    next_tier,
                    points_to_next,
                    tier_progress: getTierProgress(lp.lifetime_points)
                }
            });
        } catch (error) {
            console.error('Get loyalty error:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch loyalty data' });
        }
    },

    // GET /api/loyalty/transactions
    getTransactions: async (req, res) => {
        const user_id = req.user.id;
        try {
            const [transactions] = await db.query(
                `SELECT lt.*, b.booking_date, s.name AS service_name
                 FROM loyalty_transactions lt
                 LEFT JOIN bookings b ON lt.booking_id = b.id
                 LEFT JOIN services s ON b.service_id = s.id
                 WHERE lt.user_id = ?
                 ORDER BY lt.created_at DESC
                 LIMIT 20`,
                [user_id]
            );
            res.json({ success: true, transactions });
        } catch (error) {
            console.error('Get transactions error:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch transactions' });
        }
    },

    // POST /api/loyalty/redeem
    redeemPoints: async (req, res) => {
        const user_id = req.user.id;
        const { points } = req.body;

        if (!points || points < 100) {
            return res.status(400).json({ success: false, message: 'Minimum 100 points required to redeem' });
        }

        try {
            const [rows] = await db.query('SELECT total_points FROM loyalty_points WHERE user_id = ?', [user_id]);
            if (!rows.length || rows[0].total_points < points) {
                return res.status(400).json({ success: false, message: `Insufficient points. You have ${rows[0]?.total_points || 0} points.` });
            }

            const discount = Math.floor(points / 10); // 10 points = ₹1

            await db.query(
                'UPDATE loyalty_points SET total_points = total_points - ? WHERE user_id = ?',
                [points, user_id]
            );

            await db.query(
                `INSERT INTO loyalty_transactions (user_id, points, type, description) VALUES (?, ?, 'redeemed', ?)`,
                [user_id, -points, `Redeemed ${points} points for ₹${discount} discount`]
            );

            await db.query(
                `INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)`,
                [user_id, '🎁 Points Redeemed!', `You redeemed ${points} points for a ₹${discount} discount.`, 'loyalty']
            );

            res.json({
                success: true,
                message: `Successfully redeemed ${points} points for ₹${discount} discount`,
                discount_amount: discount,
                points_used: points
            });

        } catch (error) {
            console.error('Redeem error:', error);
            res.status(500).json({ success: false, message: 'Redemption failed' });
        }
    }
};

function getNextTierInfo(lifetimePoints) {
    if (lifetimePoints < 500) return { next_tier: 'silver', points_to_next: 500 - lifetimePoints };
    if (lifetimePoints < 2000) return { next_tier: 'gold', points_to_next: 2000 - lifetimePoints };
    if (lifetimePoints < 5000) return { next_tier: 'platinum', points_to_next: 5000 - lifetimePoints };
    return { next_tier: null, points_to_next: 0 };
}

function getTierProgress(lifetimePoints) {
    if (lifetimePoints < 500) return Math.round((lifetimePoints / 500) * 100);
    if (lifetimePoints < 2000) return Math.round(((lifetimePoints - 500) / 1500) * 100);
    if (lifetimePoints < 5000) return Math.round(((lifetimePoints - 2000) / 3000) * 100);
    return 100;
}

module.exports = loyaltyController;
