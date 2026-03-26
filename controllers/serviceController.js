const Service = require('../models/Service');
const Provider = require('../models/Provider');

const serviceController = {
    // Get all categories
    getCategories: async (req, res) => {
        try {
            const categories = await Service.getCategories();
            res.json(categories);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error fetching categories' });
        }
    },

    // Get providers by category ID
    getProvidersByCategory: async (req, res) => {
        const { categoryId } = req.params;
        try {
            const providers = await Provider.findByCategory(categoryId);
            res.json(providers);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error fetching providers by category' });
        }
    },

    // Get all services offered by a provider
    getProviderServices: async (req, res) => {
        const { providerId } = req.params;
        try {
            const services = await Service.findByProvider(providerId);
            res.json(services);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error fetching provider services' });
        }
    },

    addService: async (req, res) => {
        const { category_id, name, description, price } = req.body;
        let provider_id = req.user.provider_id;

        try {
            // If missing, look up by user id
            if (!provider_id) {
                const provider = await Provider.findByUserId(req.user.id);
                if (!provider) return res.status(403).json({ message: 'User is not a professional provider' });
                provider_id = provider.id;
            }

            const serviceId = await Service.create({ provider_id, category_id, name, description, price });
            res.status(201).json({ message: 'Service added successfully', serviceId });
        } catch (error) {
            console.error('Add Service Error:', error);
            res.status(500).json({ message: 'Error adding service' });
        }
    },

    // Search providers by query (optional implementation)
    searchProviders: async (req, res) => {
        const { query } = req.query;
        // Simple mock of search logic
        try {
            const providers = await Provider.findAllApproved();
            const filtered = providers.filter(p => 
                p.service_type.toLowerCase().includes(query.toLowerCase()) || 
                p.name.toLowerCase().includes(query.toLowerCase())
            );
            res.json(filtered);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error during search' });
        }
    },

    // Get individual provider profile (Public)
    getProviderDetails: async (req, res) => {
        const { id } = req.params;
        try {
            const Provider = require('../models/Provider');
            const provider = await Provider.findById(id);
            if (!provider) return res.status(404).json({ message: 'Provider not found' });
            res.json(provider);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error fetching provider details' });
        }
    },

    discoverProviders: async (req, res) => {
        try {
            const providers = await Provider.findAllApproved();
            res.json(providers);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error discovering providers' });
        }
    },

    // Update Provider Profile
    updateProviderProfile: async (req, res) => {
        const { service_type, location, description } = req.body;
        let provider_id = req.user.provider_id;

        try {
            if (!provider_id) {
                const provider = await Provider.findByUserId(req.user.id);
                if (!provider) return res.status(403).json({ message: 'User is not a provider' });
                provider_id = provider.id;
            }

            const affected = await Provider.updateProfile(provider_id, { service_type, location, description });
            res.json({ message: 'Profile updated successfully', affectedRows: affected });
        } catch (error) {
            console.error('Update Profile Error:', error);
            res.status(500).json({ message: 'Error updating provider profile' });
        }
    }
};

module.exports = serviceController;
