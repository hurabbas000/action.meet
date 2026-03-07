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

// Create recurring meeting
router.post('/', [
    authenticate,
    body('title').trim().isLength({ min: 2, max: 200 }).withMessage('Title must be between 2 and 200 characters'),
    body('scheduledFor').isISO8601().withMessage('Please provide a valid start date'),
    body('recurrence.type').isIn(['daily', 'weekly', 'bi-weekly', 'monthly', 'custom']).withMessage('Invalid recurrence type')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, message: 'Validation errors', errors: errors.array() });
        }

        const {
            title, description, scheduledFor,
            recurrence, team, participants = [],
            settings = {}
        } = req.body;
        
        const recurringData = {
            title,
            description,
            host: req.userId,
            recurrence: {
                type: recurrence.type,
                interval: parseInt(recurrence.interval || 1, 10),
                dayOfWeek: recurrence.dayOfWeek !== undefined ? parseInt(recurrence.dayOfWeek, 10) : undefined,
                dayOfMonth: recurrence.dayOfMonth !== undefined ? parseInt(recurrence.dayOfMonth, 10) : undefined,
                endDate: recurrence.endDate ? new Date(recurrence.endDate) : undefined,
                maxOccurrences: recurrence.maxOccurrences ? parseInt(recurrence.maxOccurrences, 10) : undefined
            },
            meetingSettings: {
                duration: settings.duration || 60,
                defaultParticipants: [
                    req.userId, 
                    ...participants
                ],
                autoCarryForward: settings.autoCarryForward !== false,
                sendReminders: settings.sendReminders !== false
            },
            nextMeetingDate: new Date(scheduledFor),
            createdBy: req.userId
        };

        if (team) recurringData.team = team;

        const recurringMeeting = await RecurringMeeting.create(recurringData);
        
        // Auto-create the very first meeting instance
        const firstMeeting = await recurringMeeting.createNextMeeting();

        res.status(201).json({
            success: true,
            message: 'Recurring meeting created successfully',
            data: { 
                recurringMeeting,
                firstMeeting
            }
        });
    } catch (error) {
        console.error('Create recurring meeting error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

module.exports = router;
