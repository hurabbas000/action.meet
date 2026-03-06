const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Basic middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'https://actionmeet.up.railway.app'],
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

// Mock signup endpoint
app.post('/api/auth/signup', (req, res) => {
    const { name, email, password } = req.body;
    
    // Mock validation
    if (!name || !email || !password) {
        return res.status(400).json({
            success: false,
            message: 'All fields are required'
        });
    }
    
    // Mock user creation
    res.json({
        success: true,
        message: 'Account created successfully',
        data: {
            user: {
                id: 'new-user-id',
                name: name,
                email: email,
                role: 'host'
            },
            token: 'mock-jwt-token-new-user'
        }
    });
});

// Mock users database (for demo)
const mockUsers = [
    { id: 'user1', name: 'John Doe', email: 'john@example.com', role: 'host' },
    { id: 'user2', name: 'Jane Smith', email: 'jane@example.com', role: 'member' },
    { id: 'user3', name: 'Mike Johnson', email: 'mike@example.com', role: 'member' },
    { id: 'user4', name: 'Sarah Wilson', email: 'sarah@example.com', role: 'member' }
];

// Mock meetings database (for demo)
let mockMeetings = [
    {
        id: '1',
        title: 'Weekly Standup',
        description: 'Daily team sync meeting',
        scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: 'upcoming',
        completionRate: 75,
        totalTasks: 8,
        completedTasks: 6,
        host: { id: 'user1', name: 'John Doe', email: 'john@example.com' },
        participants: [
            { user: { id: 'user1', name: 'John Doe', email: 'john@example.com' }, status: 'confirmed' },
            { user: { id: 'user2', name: 'Jane Smith', email: 'jane@example.com' }, status: 'confirmed' },
            { user: { id: 'user3', name: 'Mike Johnson', email: 'mike@example.com' }, status: 'invited' }
        ]
    },
    {
        id: '2', 
        title: 'Q2 Strategy Review',
        description: 'Quarterly planning and review',
        scheduledFor: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        status: 'recurring',
        completionRate: 45,
        totalTasks: 16,
        completedTasks: 9,
        host: { id: 'user1', name: 'John Doe', email: 'john@example.com' },
        participants: [
            { user: { id: 'user1', name: 'John Doe', email: 'john@example.com' }, status: 'confirmed' },
            { user: { id: 'user4', name: 'Sarah Wilson', email: 'sarah@example.com' }, status: 'invited' }
        ]
    }
];

// Get meetings for current user
app.get('/api/meetings', (req, res) => {
    // Get current user from token (simplified for demo)
    const currentUser = mockUsers[0]; // John Doe as current user
    
    // Filter meetings where user is host or participant
    const userMeetings = mockMeetings.filter(meeting => {
        const isHost = meeting.host.id === currentUser.id;
        const isParticipant = meeting.participants.some(p => p.user.id === currentUser.id);
        return isHost || isParticipant;
    });
    
    res.json({
        success: true,
        data: {
            meetings: userMeetings,
            currentUser: currentUser
        }
    });
});

// Get available users to add to meetings
app.get('/api/users/search', (req, res) => {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
        return res.status(400).json({
            success: false,
            message: 'Search query must be at least 2 characters'
        });
    }
    
    const filteredUsers = mockUsers.filter(user => 
        user.name.toLowerCase().includes(q.toLowerCase()) ||
        user.email.toLowerCase().includes(q.toLowerCase())
    );
    
    res.json({
        success: true,
        data: { users: filteredUsers }
    });
});

// Create meeting endpoint
app.post('/api/meetings', (req, res) => {
    const { title, description, scheduledFor, duration = 60, participants = [] } = req.body;
    
    if (title && scheduledFor) {
        // Get current user (simplified for demo)
        const currentUser = mockUsers[0]; // John Doe as current user
        
        const newMeeting = {
            id: Date.now().toString(),
            title: title,
            description: description || '',
            scheduledFor: new Date(scheduledFor),
            duration: duration,
            status: 'scheduled',
            createdAt: new Date().toISOString(),
            completionRate: 0,
            totalTasks: 0,
            completedTasks: 0,
            host: currentUser,
            participants: [
                { user: currentUser, status: 'confirmed' },
                ...participants.map(userId => {
                    const user = mockUsers.find(u => u.id === userId);
                    return user ? { user, status: 'invited' } : null;
                }).filter(p => p !== null)
            ]
        };
        
        mockMeetings.push(newMeeting);
        
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

// Add participant to meeting
app.post('/api/meetings/:id/participants', (req, res) => {
    const { userId } = req.body;
    const meetingId = req.params.id;
    
    const meeting = mockMeetings.find(m => m.id === meetingId);
    if (!meeting) {
        return res.status(404).json({
            success: false,
            message: 'Meeting not found'
        });
    }
    
    const user = mockUsers.find(u => u.id === userId);
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found'
        });
    }
    
    // Check if user is already a participant
    const existingParticipant = meeting.participants.find(p => p.user.id === userId);
    if (existingParticipant) {
        return res.status(400).json({
            success: false,
            message: 'User is already a participant'
        });
    }
    
    meeting.participants.push({ user, status: 'invited' });
    
    res.json({
        success: true,
        message: 'Participant added successfully',
        data: { meeting }
    });
});

// Update participant status
app.put('/api/meetings/:id/participants/:userId', (req, res) => {
    const { status } = req.body;
    const { id: meetingId, userId } = req.params;
    
    const meeting = mockMeetings.find(m => m.id === meetingId);
    if (!meeting) {
        return res.status(404).json({
            success: false,
            message: 'Meeting not found'
        });
    }
    
    const participant = meeting.participants.find(p => p.user.id === userId);
    if (!participant) {
        return res.status(404).json({
            success: false,
            message: 'Participant not found'
        });
    }
    
    participant.status = status;
    
    res.json({
        success: true,
        message: 'Participant status updated successfully',
        data: { meeting }
    });
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
const PORT = 3004;
app.listen(PORT, () => {
    console.log(`🚀 ActionMeet Test Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 API available at: http://localhost:${PORT}/api`);
    console.log(`📚 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/test`);
});

module.exports = app;
