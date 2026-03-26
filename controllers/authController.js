const User = require('../models/User');
const Provider = require('../models/Provider');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

const authController = {
    // User registration (With Auto-Provider Creation)
    register: async (req, res) => {
        const { name, email, password, role } = req.body;

        try {
            // Check if user already exists
            const existingUser = await User.findByEmail(email);
            if (existingUser) {
                return res.status(400).json({ message: 'User already exists' });
            }

            // Hash password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Create user
            const userId = await User.create({ name, email, password: hashedPassword, role });
            
            // If registering as a provider, create the provider profile immediately (Auto-Approved)
            if (role === 'provider') {
                await Provider.create({ 
                    user_id: userId, 
                    service_type: 'General Services', 
                    location: 'Local Neighborhood', 
                    description: 'New service provider' 
                });
                // Our DB update already sets default is_approved=1
            }

            res.status(201).json({ 
                message: 'User registered successfully',
                userId: userId
            });
        } catch (error) {
            console.error('Registration Error:', error);
            res.status(500).json({ message: 'Server error during registration' });
        }
    },

    // User login (With Profile Sync Fail-safe)
    login: async (req, res) => {
        const { email, password } = req.body;

        try {
            // Find user by email
            const user = await User.findByEmail(email);
            if (!user) {
                return res.status(400).json({ message: 'Invalid credentials' });
            }

            // Compare password
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({ message: 'Invalid credentials' });
            }

            // If provider, ensure profile exists (Self-Healing)
            let providerId = null;
            if (user.role === 'provider') {
                let provider = await Provider.findByUserId(user.id);
                
                // Fail-safe: Create if missing (fix for Dimpala's account)
                if (!provider) {
                    const newProviderId = await Provider.create({ 
                        user_id: user.id, 
                        service_type: 'General Services', 
                        location: 'Local Neighborhood', 
                        description: 'New service provider' 
                    });
                    providerId = newProviderId;
                } else {
                    providerId = provider.id;
                }
            }

            // Generate JWT token
            const payload = {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                provider_id: providerId
            };

            const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

            res.json({
                message: 'Login successful',
                token: token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    provider_id: providerId
                }
            });
        } catch (error) {
            console.error('Login Error:', error);
            res.status(500).json({ message: 'Server error during login' });
        }
    }
};

module.exports = authController;
