const db = require('../config/db');

const notificationController = {

    // GET /api/notifications — Get all for logged-in user
    getNotifications: async (req, res) => {
        const user_id = req.user.id;
        try {
            const [notifications] = await db.query(
                `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30`,
                [user_id]
            );
            const unread_count = notifications.filter(n => !n.is_read).length;
            res.json({ success: true, notifications, unread_count });
        } catch (error) {
            console.error('Get notifications error:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
        }
    },

    // PUT /api/notifications/read-all — Mark all as read
    markAllRead: async (req, res) => {
        const user_id = req.user.id;
        try {
            await db.query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [user_id]);
            res.json({ success: true, message: 'All notifications marked as read' });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to update notifications' });
        }
    },

    // PUT /api/notifications/:id/read — Mark single as read
    markRead: async (req, res) => {
        const user_id = req.user.id;
        const { id } = req.params;
        try {
            await db.query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [id, user_id]);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed' });
        }
    }
};

module.exports = notificationController;
