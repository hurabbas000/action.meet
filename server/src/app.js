const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');
const hpp = require('hpp');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const teamRoutes = require('./routes/team');
const meetingRoutes = require('./routes/meetings');
const agendaRoutes = require('./routes/agenda');
const taskRoutes = require('./routes/tasks');
const notificationRoutes = require('./routes/notifications');
const recurringRoutes = require('./routes/recurring');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const { notFound } = require('./middleware/errorHandler');

const app = express();

// Security middleware
app.use(helmet());
app.use(mongoSanitize());
app.use(hpp());

// CORS configuration
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'https://yourapp.railway.app'],
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/actionmeet', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch((err) => console.error('❌ MongoDB connection error:', err));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'ActionMeet API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0'
    });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/agenda', agendaRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/recurring', recurringRoutes);

// 404 handler
app.use(notFound);

// Error handling middleware
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 ActionMeet Server running on port ${PORT}`);
    console.log(`� Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 API available at: http://localhost:${PORT}/api`);
    console.log(`� API Documentation: http://localhost:${PORT}/api/health`);
});

module.exports = app;
