const express = require('express');
const router = express.Router();
const availabilityController = require('../controllers/availabilityController');
const { verifyToken, isProvider } = require('../middleware/authMiddleware');

// Public: Get provider availability slots
router.get('/:providerId', availabilityController.getProviderSlots);

// Provider only: Set availability slots
router.post('/', verifyToken, isProvider, availabilityController.setSlots);

// Provider only: Delete a slot
router.delete('/:id', verifyToken, isProvider, availabilityController.deleteSlot);

// Provider only: Toggle a slot's availability
router.put('/:id/toggle', verifyToken, isProvider, availabilityController.toggleSlot);

module.exports = router;
