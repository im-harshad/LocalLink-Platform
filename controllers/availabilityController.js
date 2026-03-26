const db = require('../config/db');

const availabilityController = {

    // GET /api/availability/:providerId?month=2024-03
    // Returns all slots for a provider in a given month
    getProviderSlots: async (req, res) => {
        const { providerId } = req.params;
        const { month } = req.query; // format: YYYY-MM

        try {
            let query = `SELECT * FROM provider_availability WHERE provider_id = ?`;
            const params = [providerId];

            if (month) {
                query += ` AND date LIKE ?`;
                params.push(`${month}%`);
            } else {
                // Default: next 30 days
                query += ` AND date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)`;
            }

            query += ` ORDER BY date ASC, start_time ASC`;
            const [slots] = await db.query(query, params);
            res.json({ success: true, slots });
        } catch (error) {
            console.error('Get slots error:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch slots' });
        }
    },

    // POST /api/availability — Provider sets their available slots
    setSlots: async (req, res) => {
        const user_id = req.user.id;
        const { slots } = req.body; // Array of { date, start_time, end_time, slot_duration, max_slots, is_available }

        if (!Array.isArray(slots) || slots.length === 0) {
            return res.status(400).json({ success: false, message: 'Slots array is required' });
        }

        try {
            // Get provider_id from user_id
            const [providers] = await db.query('SELECT id FROM providers WHERE user_id = ?', [user_id]);
            if (!providers.length) return res.status(403).json({ success: false, message: 'Provider profile not found' });
            const providerId = providers[0].id;

            const results = [];
            for (const slot of slots) {
                const { date, start_time, end_time, slot_duration = 60, max_slots = 1, is_available = 1 } = slot;
                if (!date || !start_time || !end_time) continue;

                await db.query(
                    `INSERT INTO provider_availability (provider_id, date, start_time, end_time, slot_duration, max_slots, is_available)
                     VALUES (?, ?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE end_time=VALUES(end_time), max_slots=VALUES(max_slots), is_available=VALUES(is_available)`,
                    [providerId, date, start_time, end_time, slot_duration, max_slots, is_available ? 1 : 0]
                );
                results.push({ date, start_time, end_time });
            }

            res.json({ success: true, message: `${results.length} slot(s) saved`, slots: results });
        } catch (error) {
            console.error('Set slots error:', error);
            res.status(500).json({ success: false, message: 'Failed to save availability' });
        }
    },

    // DELETE /api/availability/:id — Remove a slot
    deleteSlot: async (req, res) => {
        const user_id = req.user.id;
        const { id } = req.params;

        try {
            const [providers] = await db.query('SELECT id FROM providers WHERE user_id = ?', [user_id]);
            if (!providers.length) return res.status(403).json({ success: false, message: 'Provider not found' });
            const providerId = providers[0].id;

            const [result] = await db.query(
                'DELETE FROM provider_availability WHERE id = ? AND provider_id = ?',
                [id, providerId]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'Slot not found or unauthorized' });
            }

            res.json({ success: true, message: 'Slot removed' });
        } catch (error) {
            console.error('Delete slot error:', error);
            res.status(500).json({ success: false, message: 'Failed to delete slot' });
        }
    },

    // PUT /api/availability/:id/toggle — Toggle availability
    toggleSlot: async (req, res) => {
        const user_id = req.user.id;
        const { id } = req.params;

        try {
            const [providers] = await db.query('SELECT id FROM providers WHERE user_id = ?', [user_id]);
            if (!providers.length) return res.status(403).json({ success: false, message: 'Provider not found' });
            const providerId = providers[0].id;

            await db.query(
                'UPDATE provider_availability SET is_available = NOT is_available WHERE id = ? AND provider_id = ?',
                [id, providerId]
            );

            res.json({ success: true, message: 'Slot toggled' });
        } catch (error) {
            console.error('Toggle slot error:', error);
            res.status(500).json({ success: false, message: 'Toggle failed' });
        }
    }
};

module.exports = availabilityController;
