const express = require('express');
const Meeting = require('../models/Meeting');
const Agenda = require('../models/Agenda');
const RecurringMeeting = require('../models/RecurringMeeting');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Middleware to verify authentication (simplified for demo)
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

// Get all meetings for current user
router.get('/', authenticate, async (req, res) => {
    try {
        const { page = 1, limit = 10, status, type, startDate, endDate } = req.query;
        
        const query = {
            $or: [
                { host: req.userId },
                { 'participants.user': req.userId }
            ]
        };

        // Filter by status
        if (status) {
            query.status = status;
        }

        // Filter by meeting type
        if (type) {
            query.meetingType = type;
        }

        // Filter by date range
        if (startDate || endDate) {
            query.scheduledFor = {};
            if (startDate) query.scheduledFor.$gte = new Date(startDate);
            if (endDate) query.scheduledFor.$lte = new Date(endDate);
        }

        const meetings = await Meeting.find(query)
            .populate('host', 'name email')
            .populate('participants.user', 'name email')
            .populate('team', 'name')
            .sort({ scheduledFor: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Meeting.countDocuments(query);

        res.json({
            success: true,
            data: {
                meetings,
                pagination: {
                    current: parseInt(page),
                    total: Math.ceil(total / limit),
                    count: total
                }
            }
        });
    } catch (error) {
        console.error('Get meetings error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Get single meeting with details
router.get('/:id', authenticate, async (req, res) => {
    try {
        const meeting = await Meeting.findById(req.params.id)
            .populate('host', 'name email')
            .populate('participants.user', 'name email phone')
            .populate('team', 'name')
            .populate('agenda')
            .populate('parentMeeting', 'title scheduledFor')
            .populate('followUpMeetings', 'title scheduledFor status');

        if (!meeting) {
            return res.status(404).json({ success: false, message: 'Meeting not found' });
        }

        // Check if user has access
        const hasAccess = meeting.host._id.toString() === req.userId ||
            meeting.participants.some(p => p.user._id.toString() === req.userId);

        if (!hasAccess) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        res.json({
            success: true,
            data: { meeting }
        });
    } catch (error) {
        console.error('Get meeting error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Create new meeting
router.post('/', [
    authenticate,
    body('title').trim().isLength({ min: 2, max: 200 }).withMessage('Title must be between 2 and 200 characters'),
    body('scheduledFor').isISO8601().withMessage('Please provide a valid date'),
    body('duration').optional().isInt({ min: 15, max: 480 }).withMessage('Duration must be between 15 and 480 minutes'),
    body('location').optional().trim().isLength({ max: 200 }).withMessage('Location cannot exceed 200 characters'),
    body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation errors',
                errors: errors.array()
            });
        }

        const {
            title,
            description,
            scheduledFor,
            duration = 60,
            location,
            meetingType = 'regular',
            team,
            participants = [],
            settings = {}
        } = req.body;

        // Create meeting
        const meetingData = {
            title,
            description,
            scheduledFor: new Date(scheduledFor),
            duration,
            location,
            meetingType,
            host: req.userId,
            participants: [
                { user: req.userId, status: 'confirmed', invitedAt: new Date() },
                ...participants.map(userId => ({
                    user: userId,
                    status: 'invited',
                    invitedAt: new Date()
                }))
            ],
            settings: {
                autoCarryForward: true,
                sendReminders: true,
                reminderTime: 24,
                ...settings
            }
        };

        if (team) meetingData.team = team;

        const meeting = new Meeting(meetingData);
        await meeting.save();

        // Populate and return
        await meeting.populate('host', 'name email');
        await meeting.populate('participants.user', 'name email');

        res.status(201).json({
            success: true,
            message: 'Meeting created successfully',
            data: { meeting }
        });
    } catch (error) {
        console.error('Create meeting error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Update meeting
router.put('/:id', [
    authenticate,
    body('title').optional().trim().isLength({ min: 2, max: 200 }).withMessage('Title must be between 2 and 200 characters'),
    body('scheduledFor').optional().isISO8601().withMessage('Please provide a valid date'),
    body('duration').optional().isInt({ min: 15, max: 480 }).withMessage('Duration must be between 15 and 480 minutes')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation errors',
                errors: errors.array()
            });
        }

        const meeting = await Meeting.findById(req.params.id);
        if (!meeting) {
            return res.status(404).json({ success: false, message: 'Meeting not found' });
        }

        // Check if user is host
        if (meeting.host.toString() !== req.userId) {
            return res.status(403).json({ success: false, message: 'Only meeting host can update meeting' });
        }

        const updates = req.body;
        Object.keys(updates).forEach(key => {
            if (key !== 'participants' && key !== 'host') {
                meeting[key] = updates[key];
            }
        });

        await meeting.save();
        await meeting.populate('host', 'name email');
        await meeting.populate('participants.user', 'name email');

        res.json({
            success: true,
            message: 'Meeting updated successfully',
            data: { meeting }
        });
    } catch (error) {
        console.error('Update meeting error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Add participant to meeting
router.post('/:id/participants', [
    authenticate,
    body('userId').isMongoId().withMessage('Valid user ID is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation errors',
                errors: errors.array()
            });
        }

        const meeting = await Meeting.findById(req.params.id);
        if (!meeting) {
            return res.status(404).json({ success: false, message: 'Meeting not found' });
        }

        // Check if user is host
        if (meeting.host.toString() !== req.userId) {
            return res.status(403).json({ success: false, message: 'Only meeting host can add participants' });
        }

        await meeting.addParticipant(req.body.userId);
        await meeting.populate('participants.user', 'name email');

        res.json({
            success: true,
            message: 'Participant added successfully',
            data: { meeting }
        });
    } catch (error) {
        console.error('Add participant error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update participant status
router.put('/:id/participants/:userId', [
    authenticate,
    body('status').isIn(['confirmed', 'declined', 'attended', 'absent']).withMessage('Invalid status')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation errors',
                errors: errors.array()
            });
        }

        const meeting = await Meeting.findById(req.params.id);
        if (!meeting) {
            return res.status(404).json({ success: false, message: 'Meeting not found' });
        }

        // Check if user is participant or host
        const isParticipant = meeting.participants.some(p => p.user.toString() === req.userId);
        const isHost = meeting.host.toString() === req.userId;

        if (!isParticipant && !isHost) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        await meeting.updateParticipantStatus(req.params.userId, req.body.status);
        await meeting.populate('participants.user', 'name email');

        res.json({
            success: true,
            message: 'Participant status updated successfully',
            data: { meeting }
        });
    } catch (error) {
        console.error('Update participant status error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete meeting
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const meeting = await Meeting.findById(req.params.id);
        if (!meeting) {
            return res.status(404).json({ success: false, message: 'Meeting not found' });
        }

        // Check if user is host
        if (meeting.host.toString() !== req.userId) {
            return res.status(403).json({ success: false, message: 'Only meeting host can delete meeting' });
        }

        // Check if meeting has already started
        if (meeting.scheduledFor <= new Date()) {
            return res.status(400).json({ success: false, message: 'Cannot delete meeting that has already started' });
        }

        await Meeting.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'Meeting deleted successfully'
        });
    } catch (error) {
        console.error('Delete meeting error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Get meeting statistics
router.get('/:id/statistics', authenticate, async (req, res) => {
    try {
        const meeting = await Meeting.findById(req.params.id)
            .populate('agenda');

        if (!meeting) {
            return res.status(404).json({ success: false, message: 'Meeting not found' });
        }

        // Check access
        const hasAccess = meeting.host.toString() === req.userId ||
            meeting.participants.some(p => p.user.toString() === req.userId);

        if (!hasAccess) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        // Calculate statistics
        const stats = {
            totalAgendaItems: meeting.agenda.length,
            completedAgendaItems: meeting.agenda.filter(a => a.status === 'completed').length,
            openAgendaItems: meeting.agenda.filter(a => a.status === 'open').length,
            inProgressAgendaItems: meeting.agenda.filter(a => a.status === 'in-progress').length,
            totalParticipants: meeting.participants.length,
            confirmedParticipants: meeting.participants.filter(p => p.status === 'confirmed').length,
            attendedParticipants: meeting.participants.filter(p => p.status === 'attended').length
        };

        stats.completionRate = stats.totalAgendaItems > 0 ? 
            Math.round((stats.completedAgendaItems / stats.totalAgendaItems) * 100) : 0;

        res.json({
            success: true,
            data: { statistics: stats }
        });
    } catch (error) {
        console.error('Get meeting statistics error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

module.exports = router;
