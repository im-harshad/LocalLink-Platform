const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { verifyToken } = require('../middleware/authMiddleware');

// Get all notifications for logged-in user
router.get('/', verifyToken, notificationController.getNotifications);

// Mark all notifications as read
router.put('/read-all', verifyToken, notificationController.markAllRead);

// Mark single notification as read
router.put('/:id/read', verifyToken, notificationController.markRead);

module.exports = router;
