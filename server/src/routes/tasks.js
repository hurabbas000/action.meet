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

/**
 * @route   GET /api/tasks/my
 * @desc    Fetch all agenda tasks assigned specifically to the authenticated user
 * @access  Private
 */
router.get('/my', authenticate, async (req, res) => {
    try {
        const Agenda = require('../models/Agenda');
        
        // Find agenda items where user is responsible or has action items
        const tasks = await Agenda.find({
            $or: [
                { 'responsiblePerson.user': req.userId },
                { 'actionItems.assignedTo': req.userId }
            ]
        })
        .populate('meeting', 'title scheduledFor')
        .populate('responsiblePerson.user', 'name email')
        .sort({ 'actionItems.dueDate': 1 });

        res.json({
            success: true,
            data: { tasks }
        });
    } catch (error) {
        console.error('Get tasks error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

module.exports = router;
