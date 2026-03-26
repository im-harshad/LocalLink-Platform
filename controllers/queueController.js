const QueueToken = require('../models/QueueToken');

const queueController = {
    // Generate next token (useful for walk-ins if provider can manually add)
    issueToken: async (req, res) => {
        const { provider_id } = req.body;
        const user_id = req.user.id; // Corrected: user_id of the visitor

        try {
            const token_number = await QueueToken.getNextToken(provider_id);
            const tokenId = await QueueToken.create({ provider_id, user_id, token_number });
            res.status(201).json({ 
                message: 'Queue token issued successfully', 
                token_number, 
                tokenId 
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error issuing token' });
        }
    },

    // Get current queue status for provider
    getQueueStatus: async (req, res) => {
        const { providerId } = req.params;
        try {
            const status = await QueueToken.getQueueStatus(providerId);
            res.json(status);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error fetching queue status' });
        }
    },

    // Get user wait time/position
    getUserQueueInfo: async (req, res) => {
        const user_id = req.user.id;
        try {
            const token = await QueueToken.getUserToken(user_id);
            if (!token) {
                return res.json({ inQueue: false });
            }

            const position = await QueueToken.getUserPosition(token.provider_id, token.token_number);
            const status = await QueueToken.getQueueStatus(token.provider_id);

            res.json({
                inQueue: true,
                token_number: token.token_number,
                position: position,
                status: token.status,
                provider_name: token.provider_name,
                service_type: token.service_type,
                serving_now: status.serving_token
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error fetching user queue info' });
        }
    },

    // Provider updates token status (Served/Done) - With Security Check
    updateTokenStatus: async (req, res) => {
        const { tokenId, status } = req.body;
        const userId = req.user.id; // Logged in provider's user ID

        try {
            const Provider = require('../models/Provider');
            const provider = await Provider.findByUserId(userId);
            if (!provider) return res.status(403).json({ message: 'Only authorized professionals can manage the queue' });

            const token = await QueueToken.findById(tokenId);
            if (!token || token.provider_id !== provider.id) {
                return res.status(403).json({ message: 'Security Breach: Unauthorized queue update attempt' });
            }

            const result = await QueueToken.updateStatus(tokenId, status);
            res.json({ message: 'Token status updated successfully', affectedRows: result });
        } catch (error) {
            console.error('Update Token Status Error:', error);
            res.status(500).json({ message: 'Secure queue update failed' });
        }
    },

    // Get all today's queue for provider (Authenticated Only)
    getProviderQueue: async (req, res) => {
        try {
            const Provider = require('../models/Provider');
            let providerId = req.user.provider_id;

            // Fail-safe: Resolve if missing in token
            if (!providerId) {
                const provider = await Provider.findByUserId(req.user.id);
                if (!provider) return res.status(403).json({ message: 'Access restricted to service providers' });
                providerId = provider.id;
            }

            const queue = await QueueToken.getProviderQueue(providerId);
            res.json(queue);
        } catch (error) {
            console.error('Fetch Provider Queue Error:', error);
            res.status(500).json({ message: 'Secure queue retrieval failed' });
        }
    }
};

module.exports = queueController;
