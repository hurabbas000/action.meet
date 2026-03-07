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

/**
 * @route   GET /api/agenda/meeting/:meetingId
 * @desc    Get all agenda items for a specific meeting
 * @access  Private (Meeting Host or Participants)
 */
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

/**
 * @route   POST /api/agenda
 * @desc    Create a new agenda item / task
 * @access  Private (Meeting Host only)
 */
router.post('/', [
    authenticate,
    body('title').trim().isLength({ min: 2, max: 200 }).withMessage('Title must be between 2 and 200 characters'),
    body('meeting').notEmpty().withMessage('Valid meeting ID is required'),
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

        // Explicitly enforce that only the Meeting Host can create agendas/tasks
        const isHost = meetingDoc.host.toString() === req.userId;
        if (!isHost) {
            return res.status(403).json({ success: false, message: 'Only the meeting host can create agenda items and assign tasks.' });
        }

        const agenda = await Agenda.create({
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
            await agenda.save();
        }
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

/**
 * @route   PUT /api/agenda/:id
 * @desc    Update an agenda item or update task status
 * @access  Private (Host: full update. Assignee: status update only)
 */
router.put('/:id', authenticate, async (req, res) => {
    try {
        const agenda = await Agenda.findById(req.params.id);
        if (!agenda) {
            return res.status(404).json({ success: false, message: 'Agenda item not found' });
        }

        // Role-Based Access Control logic
        const meeting = await Meeting.findById(agenda.meeting);
        const isHost = meeting.host.toString() === req.userId;
        const isAssignee = agenda.responsiblePerson?.user?.toString() === req.userId;

        // Verify user is at least a participant in the meeting
        const hasAccess = isHost || meeting.participants.some(p => p.user.toString() === req.userId);
        if (!hasAccess) {
            return res.status(403).json({ success: false, message: 'Access denied to this meeting' });
        }

        // If the user isn't the host and hasn't been assigned this task, forbid access
        if (!isHost && !isAssignee) {
            return res.status(403).json({ success: false, message: 'Only meeting hosts or task assignees can modify tasks' });
        }

        const updates = req.body;
        
        // If the user is an assignee but NOT the host, they can ONLY update the status to complete tasks
        if (!isHost) {
            const allowedUpdates = ['status'];
            const updateKeys = Object.keys(updates);
            const isValidOperation = updateKeys.every(update => allowedUpdates.includes(update));
            if (!isValidOperation) {
                return res.status(403).json({ success: false, message: 'Members can only update the status of tasks assigned to them.' });
            }
        }

        // Apply whitelisted updates
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

/**
 * @route   DELETE /api/agenda/:id
 * @desc    Delete an agenda item
 * @access  Private (Meeting Host only)
 */
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const agenda = await Agenda.findById(req.params.id);
        if (!agenda) {
            return res.status(404).json({ success: false, message: 'Agenda item not found' });
        }

        // Check if user is meeting host strictly
        const meeting = await Meeting.findById(agenda.meeting);
        const isHost = meeting.host.toString() === req.userId;

        if (!isHost) {
            return res.status(403).json({ success: false, message: 'Only the meeting host can delete agenda items' });
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
