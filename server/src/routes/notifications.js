const express = require('express');
const router = express.Router();

// Middleware to verify authentication
const authenticate = async (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ success: false, message: 'No token provided' });
    }
    
    try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.userId = decoded.userId;
        next();
    } catch (error) {
        res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

// Get user notifications
router.get('/', authenticate, async (req, res) => {
    try {
        const store = require('../db/mockStore');
        const notifications = (store.notifications || [])
            .filter(n => (n.user?._id || n.user || '').toString() === req.userId.toString())
            .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        const unreadCount = notifications.filter(n => !n.isRead).length;

        res.json({
            success: true,
            data: {
                notifications,
                unreadCount
            }
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

module.exports = router;
