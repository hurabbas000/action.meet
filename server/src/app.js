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

// Force Mock Mode if no remote DB is provided (Local DB is missing on this machine)
if (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes('localhost')) {
    global.MOCK_DATABASE = true;
    console.log('🚀 INITIALIZING IN MOCK DATABASE MODE');
}

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
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdnjs.cloudflare.com", "https://*.firebaseapp.com", "https://*.googleapis.com"],
            "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            "font-src": ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            "img-src": ["'self'", "data:", "https://*.googleusercontent.com", "https://*.firebaseapp.com"],
            "connect-src": ["'self'", "https://*.googleapis.com", "https://*.firebaseapp.com", "/api"]
        },
    },
}));
app.use(mongoSanitize());
app.use(hpp());

// CORS configuration
app.use(cors({
    origin: function(origin, callback) {
        // Allow all localhost origins, file:// (null), and Railway
        if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin === 'null' || origin.includes('railway.app')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
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
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Database connection — uses a persistent local DB folder so data survives restarts
const path = require('path');
const fs = require('fs');

const connectDB = async () => {
    try {
        let dbUri = process.env.MONGODB_URI;

        if (!dbUri || dbUri.includes('localhost')) {
            const { MongoMemoryServer } = require('mongodb-memory-server');

            // Persist DB data so users/meetings survive server restarts
            const dbPath = path.join(__dirname, '../../.mongo-test-db');
            if (!fs.existsSync(dbPath)) fs.mkdirSync(dbPath, { recursive: true });

            const mongoServer = await MongoMemoryServer.create({
                instance: {
                    dbPath,
                    storageEngine: 'wiredTiger'
                }
            });

            dbUri = mongoServer.getUri();
            console.log('✅ Using persistent MongoDB (local storage)');
        }

        await mongoose.connect(dbUri);
        console.log('✅ Connected to MongoDB');

        // Auto-seed if empty
        const User = require('./models/User');
        if (await User.countDocuments() === 0) {
            console.log('🌱 Database is empty. Auto-seeding dummy data...');
            const bcrypt = require('bcryptjs');
            const Team = require('./models/Team');
            const Meeting = require('./models/Meeting');
            const Agenda = require('./models/Agenda');

            const pwd = await bcrypt.hash('password123', 10);
            const users = await User.insertMany([
              { name: 'Alice Admin', email: 'alice@test.com', password: pwd, role: 'admin', isActive: true },
              { name: 'Bob Builder', email: 'bob@test.com', password: pwd, role: 'member', isActive: true },
              { name: 'Charlie CEO', email: 'charlie@test.com', password: pwd, role: 'admin', isActive: true },
              { name: 'Diana Design', email: 'diana@test.com', password: pwd, role: 'member', isActive: true },
              { name: 'Eddie Engineer', email: 'eddie@test.com', password: pwd, role: 'member', isActive: true },
              { name: 'Fiona Finance', email: 'fiona@test.com', password: pwd, role: 'member', isActive: true },
              { name: 'George Growth', email: 'george@test.com', password: pwd, role: 'member', isActive: true },
              { name: 'Hannah HR', email: 'hannah@test.com', password: pwd, role: 'member', isActive: true }
            ]);

            const team1 = await Team.create({
              name: 'Frontend Engineering', description: 'The team building the ActionMeet web app.', createdBy: users[0]._id,
              members: [{ user: users[0]._id, role: 'admin', joinedAt: new Date(), isActive: true }, { user: users[1]._id, role: 'member', joinedAt: new Date(), isActive: true }]
            });
            
            const team2 = await Team.create({
              name: 'Executive Leadership', description: 'High-level strategy planning.', createdBy: users[2]._id,
              members: [{ user: users[2]._id, role: 'admin', joinedAt: new Date(), isActive: true }, { user: users[0]._id, role: 'member', joinedAt: new Date(), isActive: true }]
            });

            const now = new Date();
            const futureDate = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
            const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);

            const m1 = await Meeting.create({
              title: 'Weekly UI Sync', description: 'Sync on the latest dashboard redesign.', host: users[0]._id, team: team1._id,
              participants: [{ user: users[1]._id, status: 'confirmed' }, { user: users[3]._id, status: 'invited' }],
              scheduledFor: futureDate, meetingType: 'recurring', status: 'scheduled'
            });

            const m2 = await Meeting.create({
              title: 'Q1 Kickoff Review', description: 'Past meeting to review Q1 metrics.', host: users[2]._id,
              participants: [{ user: users[0]._id, status: 'attended' }],
              scheduledFor: pastDate, meetingType: 'regular', status: 'completed'
            });

            const agendas = await Agenda.insertMany([
              { meeting: m1._id, title: 'Finalize Dark Mode CSS', description: 'Check color palette.', status: 'open', responsiblePerson: { user: users[0]._id }, order: 1, createdBy: users[0]._id },
              { meeting: m1._id, title: 'Add Member API Integration', description: 'Hook up modal.', status: 'open', responsiblePerson: { user: users[1]._id }, order: 2, createdBy: users[0]._id },
              { meeting: m2._id, title: 'Review Revenue Numbers', description: 'Check MRR.', status: 'completed', responsiblePerson: { user: users[2]._id }, order: 1, createdBy: users[2]._id },
              { meeting: m2._id, title: 'Investigate server crash', description: 'Port 3001.', status: 'open', responsiblePerson: { user: users[0]._id }, order: 2, createdBy: users[2]._id }
            ]);

            m1.agendaPoints = [agendas[0]._id, agendas[1]._id]; await m1.save();
            m2.agendaPoints = [agendas[2]._id, agendas[3]._id]; await m2.save();

            console.log('✅ Auto-seed complete. Login with alice@test.com / password123');
        }

    } catch (err) {
        console.error('❌ MongoDB connection error:', err.message);
        console.warn('🚀 SWITCHING TO MOCK DATABASE MODE (In-Memory Only)');
        console.warn('⚠️ No local MongoDB installation found. Data will not persist.');
        global.MOCK_DATABASE = true;
    }
};

if (!global.MOCK_DATABASE) {
    connectDB();
} else {
    console.log('🚀 RUNNING IN MOCK MODE: Database connection skipped.');
}

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

// Serve static frontend files (Railway/Production)
const publicPath = path.join(__dirname, '../../client/public');
app.use(express.static(publicPath));

// Catch-all: serve index.html for any non-API routes
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(publicPath, 'index.html'));
});

// 404 handler for API
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
