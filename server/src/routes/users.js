const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

// Get user profile
router.get('/profile', authenticate, async (req, res) => {
    try {
        const User = require('../models/User');
        const user = await User.findById(req.userId).select('-password');
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({
            success: true,
            data: { user }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

module.exports = router;
