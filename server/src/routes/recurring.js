const express = require('express');
const RecurringMeeting = require('../models/RecurringMeeting');
const { body, validationResult } = require('express-validator');

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

// Get recurring meetings for user
router.get('/', authenticate, async (req, res) => {
    try {
        const recurringMeetings = await RecurringMeeting.find({
            host: req.userId,
            isActive: true
        })
        .populate('host', 'name email')
        .populate('team', 'name')
        .sort({ nextMeetingDate: 1 });

        res.json({
            success: true,
            data: { recurringMeetings }
        });
    } catch (error) {
        console.error('Get recurring meetings error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

module.exports = router;
