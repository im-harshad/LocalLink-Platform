const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

const authMiddleware = {
    // Middleware to verify JWT token
    verifyToken: (req, res, next) => {
        const token = req.headers['authorization']?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'Access denied. No token provided.' });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
            next();
        } catch (error) {
            res.status(403).json({ message: 'Invalid token.' });
        }
    },

    // Middleware to check if user is admin
    isAdmin: (req, res, next) => {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin role required.' });
        }
        next();
    },

    // Middleware to check if user is provider
    isProvider: (req, res, next) => {
        if (req.user.role !== 'provider' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Provider role required.' });
        }
        next();
    },

    // Middleware to check if user is customer
    isCustomer: (req, res, next) => {
        if (req.user.role !== 'customer') {
            return res.status(403).json({ message: 'Access denied. Customer role required.' });
        }
        next();
    }
};

module.exports = authMiddleware;
