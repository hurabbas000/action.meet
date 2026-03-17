const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

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
