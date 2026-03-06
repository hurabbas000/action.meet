const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'ActionMeet API is running',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/meetings', (req, res) => {
    // Mock data for now - in real app this would come from Firebase
    const meetings = [
        {
            id: 'weekly-standup',
            title: 'Weekly Standup',
            date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            status: 'upcoming',
            completionRate: 75,
            totalTasks: 8,
            completedTasks: 6
        },
        {
            id: 'strategy-review',
            title: 'Q2 Strategy Review',
            date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'recurring',
            completionRate: 45,
            totalTasks: 16,
            completedTasks: 9
        }
    ];
    
    res.json(meetings);
});

app.post('/api/meetings', (req, res) => {
    const { title, date } = req.body;
    
    // Mock meeting creation
    const newMeeting = {
        id: Date.now().toString(),
        title: title,
        date: date,
        status: 'scheduled',
        createdAt: new Date().toISOString(),
        completionRate: 0,
        totalTasks: 0,
        completedTasks: 0
    };
    
    console.log('Meeting created:', newMeeting);
    res.status(201).json(newMeeting);
});

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 ActionMeet Server running on http://localhost:${PORT}`);
    console.log(`📁 Frontend available at: http://localhost:3000`);
    console.log(`🔗 API available at: http://localhost:${PORT}/api`);
});
