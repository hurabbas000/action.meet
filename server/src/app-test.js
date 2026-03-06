const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Basic middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
}));

app.use(express.json());

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

// Test endpoints
app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'Backend is working!',
        data: {
            features: [
                'User Authentication',
                'Team Management', 
                'Meeting Scheduling',
                'Agenda Management',
                'Task Tracking',
                'Notifications',
                'Recurring Meetings'
            ]
        }
    });
});

// Mock auth endpoint
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    // Mock authentication
    if (email && password) {
        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: 'mock-user-id',
                    name: 'Test User',
                    email: email,
                    role: 'host'
                },
                token: 'mock-jwt-token'
            }
        });
    } else {
        res.status(400).json({
            success: false,
            message: 'Email and password required'
        });
    }
});

// Mock meetings endpoint
app.get('/api/meetings', (req, res) => {
    res.json({
        success: true,
        data: {
            meetings: [
                {
                    id: '1',
                    title: 'Weekly Standup',
                    scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000),
                    status: 'upcoming',
                    completionRate: 75,
                    totalTasks: 8,
                    completedTasks: 6
                },
                {
                    id: '2', 
                    title: 'Q2 Strategy Review',
                    scheduledFor: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
                    status: 'recurring',
                    completionRate: 45,
                    totalTasks: 16,
                    completedTasks: 9
                }
            ]
        }
    });
});

// Create meeting endpoint
app.post('/api/meetings', (req, res) => {
    const { title, scheduledFor } = req.body;
    
    if (title && scheduledFor) {
        const newMeeting = {
            id: Date.now().toString(),
            title: title,
            scheduledFor: new Date(scheduledFor),
            status: 'scheduled',
            createdAt: new Date().toISOString(),
            completionRate: 0,
            totalTasks: 0,
            completedTasks: 0
        };
        
        res.status(201).json({
            success: true,
            message: 'Meeting created successfully',
            data: { meeting: newMeeting }
        });
    } else {
        res.status(400).json({
            success: false,
            message: 'Title and scheduledFor are required'
        });
    }
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found'
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});

// Start server
const PORT = 3003;
app.listen(PORT, () => {
    console.log(`🚀 ActionMeet Test Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 API available at: http://localhost:${PORT}/api`);
    console.log(`📚 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/test`);
});

module.exports = app;
