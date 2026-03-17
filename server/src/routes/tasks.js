const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

/**
 * @route   GET /api/tasks/my
 * @desc    Fetch all agenda tasks assigned specifically to the authenticated user
 * @access  Private
 */
router.get('/my', authenticate, async (req, res) => {
    try {
        const Agenda = require('../models/Agenda');
        
        // Find agenda items where user is responsible or has action items
        const query = {
            $or: [
                { 'responsiblePerson.user': req.userId },
                { 'actionItems.assignedTo': req.userId }
            ],
            status: { $ne: 'cancelled' }
        };

        const tasks = await Agenda.find(query)
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
