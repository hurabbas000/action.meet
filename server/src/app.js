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
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// 1. Force Mock Mode if no remote DB is provided
if (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes('localhost')) {
    global.MOCK_DATABASE = true;
    console.log('🚀 INITIALIZING IN MOCK DATABASE MODE');
}

// 2. Database connection & Seeding Logic
const seedData = async () => {
    try {
        const User = require('./models/User');
        if (await User.countDocuments() === 0) {
            console.log('🌱 Database is empty. Auto-seeding dummy data...');
            const bcrypt = require('bcryptjs');
            const Team = require('./models/Team');
            const Meeting = require('./models/Meeting');
            const Agenda = require('./models/Agenda');

            const pwd = await bcrypt.hash('password123', 10);
            const AliceId = 'user_alice_admin_123';
            const BobId = 'user_bob_builder_456';
            const CharlieId = 'user_charlie_ceo_789';
            const DianaId = 'user_diana_design_012';

            const users = await User.insertMany([
              { _id: AliceId, name: 'Alice Admin', email: 'alice@test.com', password: pwd, role: 'admin', isActive: true },
              { _id: BobId, name: 'Bob Builder', email: 'bob@test.com', password: pwd, role: 'member', isActive: true },
              { _id: CharlieId, name: 'Charlie CEO', email: 'charlie@test.com', password: pwd, role: 'admin', isActive: true },
              { _id: DianaId, name: 'Diana Design', email: 'diana@test.com', password: pwd, role: 'member', isActive: true },
              { name: 'Eddie Engineer', email: 'eddie@test.com', password: pwd, role: 'member', isActive: true },
              { name: 'Fiona Finance', email: 'fiona@test.com', password: pwd, role: 'member', isActive: true },
              { name: 'George Growth', email: 'george@test.com', password: pwd, role: 'member', isActive: true },
              { name: 'Hannah HR', email: 'hannah@test.com', password: pwd, role: 'member', isActive: true }
            ]);

            const team1 = await Team.create({
              _id: 'team_frontend_123',
              name: 'Frontend Engineering', description: 'The team building the ActionMeet web app.', createdBy: AliceId,
              members: [{ user: AliceId, role: 'admin', joinedAt: new Date(), isActive: true }, { user: BobId, role: 'member', joinedAt: new Date(), isActive: true }]
            });
            
            const team2 = await Team.create({
              _id: 'team_leadership_456',
              name: 'Executive Leadership', description: 'High-level strategy planning.', createdBy: CharlieId,
              members: [{ user: CharlieId, role: 'admin', joinedAt: new Date(), isActive: true }, { user: AliceId, role: 'member', joinedAt: new Date(), isActive: true }]
            });

            const now = new Date();
            const futureDate = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
            const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);

            const m1 = await Meeting.create({
              _id: 'meeting_ui_sync_123',
              title: 'Weekly UI Sync', description: 'Sync on the latest dashboard redesign.', host: AliceId, team: 'team_frontend_123',
              participants: [{ user: BobId, status: 'confirmed' }, { user: DianaId, status: 'invited' }],
              scheduledFor: futureDate, meetingType: 'recurring', status: 'scheduled'
            });

            const m2 = await Meeting.create({
              _id: 'meeting_kickoff_456',
              title: 'Q1 Kickoff Review', description: 'Past meeting to review Q1 metrics.', host: CharlieId,
              participants: [{ user: AliceId, status: 'attended' }],
              scheduledFor: pastDate, meetingType: 'regular', status: 'completed'
            });

            const agendas = await Agenda.insertMany([
              { meeting: m1._id, title: 'Finalize Dark Mode CSS', description: 'Check color palette.', status: 'open', responsiblePerson: { user: AliceId }, order: 1, createdBy: AliceId },
              { meeting: m1._id, title: 'Add Member API Integration', description: 'Hook up modal.', status: 'open', responsiblePerson: { user: BobId }, order: 2, createdBy: AliceId },
              { meeting: m2._id, title: 'Review Revenue Numbers', description: 'Check MRR.', status: 'completed', responsiblePerson: { user: CharlieId }, order: 1, createdBy: CharlieId },
              { meeting: m2._id, title: 'Investigate server crash', description: 'Port 3001.', status: 'open', responsiblePerson: { user: AliceId }, order: 2, createdBy: CharlieId }
            ]);

            m1.agendaPoints = [agendas[0]._id, agendas[1]._id]; await m1.save();
            m2.agendaPoints = [agendas[2]._id, agendas[3]._id]; await m2.save();

            console.log('✅ Auto-seed complete. Login with alice@test.com / password123');
        }
    } catch (err) {
        console.error('❌ Seeding error:', err.message);
    }
};

const connectDB = async () => {
    try {
        let dbUri = process.env.MONGODB_URI;

        if (!dbUri || dbUri.includes('localhost')) {
            if (global.MOCK_DATABASE) {
                console.log('🚀 Skipping MongoDB Memory Server (Directly using Mock Mode)');
                await seedData();
                return;
            }
            const { MongoMemoryServer } = require('mongodb-memory-server');
            const dbPath = path.join(__dirname, '../../.mongo-test-db');
            if (!fs.existsSync(dbPath)) fs.mkdirSync(dbPath, { recursive: true });
            const mongoServer = await MongoMemoryServer.create({
                instance: { dbPath, storageEngine: 'wiredTiger' }
            });
            dbUri = mongoServer.getUri();
            console.log('✅ Using persistent MongoDB (local storage)');
        }

        await mongoose.connect(dbUri);
        console.log('✅ Connected to MongoDB');
        await seedData();
    } catch (err) {
        console.error('❌ MongoDB connection error:', err.message);
        console.warn('🚀 SWITCHING TO MOCK DATABASE MODE (In-Memory Only)');
        global.MOCK_DATABASE = true;
        await seedData();
    }
};

// 3. Initialize DB/Mock
if (!global.MOCK_DATABASE) {
    connectDB();
} else {
    console.log('🚀 RUNNING IN MOCK MODE: Database connection skipped.');
    seedData();
}

// 4. Import routes (AFTER global.MOCK_DATABASE is set)
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const teamRoutes = require('./routes/team');
const meetingRoutes = require('./routes/meetings');
const agendaRoutes = require('./routes/agenda');
const taskRoutes = require('./routes/tasks');
const notificationRoutes = require('./routes/notifications');
const recurringRoutes = require('./routes/recurring');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

// 5. Middleware Setup
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdnjs.cloudflare.com", "https://*.firebaseapp.com", "https://*.googleapis.com"],
            "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            "font-src": ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            "img-src": ["'self'", "data:", "https://*.googleusercontent.com", "https://*.firebaseapp.com"],
            "connect-src": ["'self'", "http://localhost:3001", "http://127.0.0.1:3001", "https://*.googleapis.com", "https://*.firebaseapp.com"],
            "script-src-attr": ["'unsafe-inline'"]
        },
    },
}));
app.use(mongoSanitize());
app.use(hpp());
app.use(cors({
    origin: function(origin, callback) {
        if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin === 'null' || origin.includes('railway.app')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);
app.use(express.json({ limit: '5mb' }));

app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        console.error('❌ Malformed JSON Request:', err.message);
        return res.status(400).json({ success: false, message: 'Malformed JSON in request body' });
    }
    next();
});
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(compression());
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// 6. Routes Setup
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'ActionMeet API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/agenda', agendaRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/recurring', recurringRoutes);

const publicPath = path.join(__dirname, '../../client/public');
app.use(express.static(publicPath));
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(publicPath, 'index.html'));
});

app.use(notFound);
app.use(errorHandler);

// 7. Start Server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 ActionMeet Server running on port ${PORT}`);
    console.log(`🔗 API available at: http://localhost:${PORT}/api`);
});

module.exports = app;

