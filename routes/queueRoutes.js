const express = require('express');
const router = express.Router();
const queueController = require('../controllers/queueController');
const { verifyToken, isProvider } = require('../middleware/authMiddleware');

// @route   POST /api/queue/token
// @desc    Issue a new queue token (for walk-ins)
router.post('/token', verifyToken, queueController.issueToken);

// @route   GET /api/queue/status/:providerId
// @desc    Get current queue status (now serving, people waiting)
router.get('/status/:providerId', queueController.getQueueStatus);

// @route   GET /api/queue/user-info
// @desc    Get current user position and token in queue
router.get('/user-info', verifyToken, queueController.getUserQueueInfo);

// @route   PUT /api/queue/status
// @desc    Update token status (used by providers/admin)
router.put('/status', verifyToken, isProvider, queueController.updateTokenStatus);

// @route   GET /api/queue/provider-view
// @desc    Get all active tokens for active provider (dashboard)
router.get('/provider-view', verifyToken, isProvider, queueController.getProviderQueue);

module.exports = router;
