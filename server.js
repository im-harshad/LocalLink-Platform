const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const xss = require('xss-clean');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const path = require('path');
const jwt = require('jsonwebtoken');

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

// ─── Socket.io Setup ───────────────────────────────────────────────────────────
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Make io globally accessible so controllers can emit events
global.io = io;

io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));
    try {
        const user = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = user;
        next();
    } catch (err) {
        next(new Error('Invalid token'));
    }
});

io.on('connection', (socket) => {
    const userId = socket.user.id;
    const userRole = socket.user.role;

    // Join personal room
    socket.join(`user_${userId}`);

    // If provider, join their provider room too
    if (userRole === 'provider' && socket.user.provider_id) {
        socket.join(`provider_${socket.user.provider_id}`);
    }

    console.log(`[Socket.io] User connected: ${userId} (${userRole})`);

    socket.on('disconnect', () => {
        console.log(`[Socket.io] User disconnected: ${userId}`);
    });

    // Ping-pong for connection health check
    socket.on('ping_server', () => {
        socket.emit('pong_server', { timestamp: Date.now() });
    });
});

// ─── Security Middlewares ──────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(xss());
app.use(hpp());
app.use(cookieParser());

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes.' }
});
app.use('/api/', limiter);

// Standard Middlewares
app.use(cors({ origin: '*', credentials: true }));
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/views', express.static(path.join(__dirname, 'views')));

// ─── Import Routes ─────────────────────────────────────────────────────────────
const authRoutes = require('./routes/authRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const queueRoutes = require('./routes/queueRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const availabilityRoutes = require('./routes/availabilityRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const loyaltyRoutes = require('./routes/loyaltyRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// ─── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api/notifications', notificationRoutes);

// Root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/index.html'));
});

// 404 Handler for API Routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ success: false, message: 'Endpoint not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'An unexpected error occurred on our server.';
    console.error(`[Platform ERROR] ${new Date().toISOString()}:`, { url: req.originalUrl, method: req.method, stack: err.stack });
    res.status(statusCode).json({ success: false, message, error: process.env.NODE_ENV === 'development' ? err.stack : undefined });
});

// Port configuration — use the HTTP server (not app.listen!) for Socket.io
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 LocalLink Pro running on http://localhost:${PORT}`);
    console.log(`⚡ Socket.io real-time engine active`);
});
