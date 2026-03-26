const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const { verifyToken, isProvider } = require('../middleware/authMiddleware');

const { serviceValidation } = require('../middleware/validationMiddleware');

// @route   GET /api/services/categories
// @desc    Get all service categories
router.get('/categories', serviceController.getCategories);

// @route   GET /api/services/category/:categoryId
// @desc    Get all providers by category
router.get('/category/:categoryId', serviceController.getProvidersByCategory);

// @route   GET /api/services/provider/:providerId
// @desc    Get all services for a specific provider
router.get('/provider/:providerId', serviceController.getProviderServices);

// @route   GET /api/services/search
// @desc    Simple search for services
router.get('/search', serviceController.searchProviders);

// @route   POST /api/services
// @desc    Add a new service (Provider only)
router.post('/', verifyToken, isProvider, serviceValidation, serviceController.addService);

// @route   GET /api/services/provider-info/:id
// @desc    Get detailed provider information (Public)
router.get('/provider-info/:id', serviceController.getProviderDetails);

// @route   GET /api/services/discover
// @desc    Get all providers (Public Discovery)
router.get('/discover', serviceController.discoverProviders);

// @route   PUT /api/services/profile
// @desc    Update provider profile (Category, Location, Description)
router.put('/profile', verifyToken, isProvider, serviceController.updateProviderProfile);

module.exports = router;
