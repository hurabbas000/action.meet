const express = require('express');
const Agenda = require('../models/Agenda');
const Meeting = require('../models/Meeting');
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

// Get agenda items for a meeting
router.get('/meeting/:meetingId', authenticate, async (req, res) => {
    try {
        const meeting = await Meeting.findById(req.params.meetingId);
        if (!meeting) {
            return res.status(404).json({ success: false, message: 'Meeting not found' });
        }

        // Check access
        const hasAccess = meeting.host.toString() === req.userId ||
            meeting.participants.some(p => p.user.toString() === req.userId);

        if (!hasAccess) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const agendaItems = await Agenda.find({ meeting: req.params.meetingId })
            .populate('responsiblePerson.user', 'name email')
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email')
            .sort({ order: 1 });

        res.json({
            success: true,
            data: { agendaItems }
        });
    } catch (error) {
        console.error('Get agenda error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Create agenda item
router.post('/', [
    authenticate,
    body('title').trim().isLength({ min: 2, max: 200 }).withMessage('Title must be between 2 and 200 characters'),
    body('meeting').isMongoId().withMessage('Valid meeting ID is required'),
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

        const { title, description, meeting, priority = 'medium', estimatedDuration, responsiblePerson } = req.body;

        // Check meeting access
        const meetingDoc = await Meeting.findById(meeting);
        if (!meetingDoc) {
            return res.status(404).json({ success: false, message: 'Meeting not found' });
        }

        const hasAccess = meetingDoc.host.toString() === req.userId ||
            meetingDoc.participants.some(p => p.user.toString() === req.userId);

        if (!hasAccess) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const agenda = new Agenda({
            title,
            description,
            meeting,
            priority,
            estimatedDuration,
            createdBy: req.userId
        });

        if (responsiblePerson) {
            agenda.responsiblePerson = {
                user: responsiblePerson,
                assignedAt: new Date(),
                assignedBy: req.userId
            };
        }

        await agenda.save();
        await agenda.populate('responsiblePerson.user', 'name email');
        await agenda.populate('createdBy', 'name email');

        res.status(201).json({
            success: true,
            message: 'Agenda item created successfully',
            data: { agenda }
        });
    } catch (error) {
        console.error('Create agenda error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Update agenda item
router.put('/:id', authenticate, async (req, res) => {
    try {
        const agenda = await Agenda.findById(req.params.id);
        if (!agenda) {
            return res.status(404).json({ success: false, message: 'Agenda item not found' });
        }

        // Check meeting access
        const meeting = await Meeting.findById(agenda.meeting);
        const hasAccess = meeting.host.toString() === req.userId ||
            meeting.participants.some(p => p.user.toString() === req.userId);

        if (!hasAccess) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const updates = req.body;
        Object.keys(updates).forEach(key => {
            if (key !== 'createdBy' && key !== 'meeting') {
                agenda[key] = updates[key];
            }
        });

        agenda.updatedBy = req.userId;
        await agenda.save();
        await agenda.populate('responsiblePerson.user', 'name email');

        res.json({
            success: true,
            message: 'Agenda item updated successfully',
            data: { agenda }
        });
    } catch (error) {
        console.error('Update agenda error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Delete agenda item
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const agenda = await Agenda.findById(req.params.id);
        if (!agenda) {
            return res.status(404).json({ success: false, message: 'Agenda item not found' });
        }

        // Check if user created it or is meeting host
        const meeting = await Meeting.findById(agenda.meeting);
        const canDelete = agenda.createdBy.toString() === req.userId || meeting.host.toString() === req.userId;

        if (!canDelete) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        await Agenda.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'Agenda item deleted successfully'
        });
    } catch (error) {
        console.error('Delete agenda error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

module.exports = router;
