const express = require('express');
const Team = require('../models/Team');
const User = require('../models/User');
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

// Get all teams for current user
router.get('/', authenticate, async (req, res) => {
    try {
        const teams = await Team.find({
            $or: [
                { createdBy: req.userId },
                { 'members.user': req.userId, 'members.isActive': true }
            ]
        })
        .populate('createdBy', 'name email')
        .populate('members.user', 'name email phone')
        .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: { teams }
        });
    } catch (error) {
        console.error('Get teams error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Get single team
router.get('/:id', authenticate, async (req, res) => {
    try {
        const team = await Team.findById(req.params.id)
            .populate('createdBy', 'name email')
            .populate('members.user', 'name email phone');

        if (!team) {
            return res.status(404).json({ success: false, message: 'Team not found' });
        }

        // Check if user is member
        if (!team.isMember(req.userId)) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        res.json({
            success: true,
            data: { team }
        });
    } catch (error) {
        console.error('Get team error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Create new team
router.post('/', [
    authenticate,
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Team name must be between 2 and 100 characters'),
    body('description').optional().trim().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters')
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

        const { name, description, settings = {} } = req.body;

        // Create team
        const team = await Team.create({
            name,
            description,
            createdBy: req.userId,
            members: [{
                user: req.userId,
                role: 'admin',
                joinedAt: new Date(),
                isActive: true
            }],
            settings: {
                allowMemberInvite: false,
                defaultMeetingDuration: 60,
                timezone: 'UTC',
                ...settings
            }
        });
        await team.populate('createdBy', 'name email');
        await team.populate('members.user', 'name email');

        res.status(201).json({
            success: true,
            message: 'Team created successfully',
            data: { team }
        });
    } catch (error) {
        console.error('Create team error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Update team
router.put('/:id', [
    authenticate,
    body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Team name must be between 2 and 100 characters'),
    body('description').optional().trim().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters')
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

        const team = await Team.findById(req.params.id);
        if (!team) {
            return res.status(404).json({ success: false, message: 'Team not found' });
        }

        // Check if user is admin or creator
        const userRole = team.getUserRole(req.userId);
        if (!userRole || (userRole !== 'admin' && team.createdBy.toString() !== req.userId)) {
            return res.status(403).json({ success: false, message: 'Only team admins can update team' });
        }

        const { name, description, settings } = req.body;

        if (name) team.name = name;
        if (description) team.description = description;
        if (settings) team.settings = { ...team.settings, ...settings };

        await team.save();
        await team.populate('members.user', 'name email');

        res.json({
            success: true,
            message: 'Team updated successfully',
            data: { team }
        });
    } catch (error) {
        console.error('Update team error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Add member to team
router.post('/:id/members', [
    authenticate,
    body('userId').notEmpty().withMessage('Valid user ID is required'),
    body('role').optional().isIn(['admin', 'member', 'viewer']).withMessage('Invalid role')
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

        const team = await Team.findById(req.params.id);
        if (!team) {
            return res.status(404).json({ success: false, message: 'Team not found' });
        }

        // Check if user is admin or creator
        const userRole = team.getUserRole(req.userId);
        if (!userRole || (userRole !== 'admin' && team.createdBy.toString() !== req.userId)) {
            return res.status(403).json({ success: false, message: 'Only team admins can add members' });
        }

        // Check if user exists
        const user = await User.findById(req.body.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        await team.addMember(req.body.userId, req.body.role || 'member');
        await team.populate('members.user', 'name email');

        res.json({
            success: true,
            message: 'Member added successfully',
            data: { team }
        });
    } catch (error) {
        console.error('Add member error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Remove member from team
router.delete('/:id/members/:userId', authenticate, async (req, res) => {
    try {
        const team = await Team.findById(req.params.id);
        if (!team) {
            return res.status(404).json({ success: false, message: 'Team not found' });
        }

        // Check if user is admin or creator
        const userRole = team.getUserRole(req.userId);
        if (!userRole || (userRole !== 'admin' && team.createdBy.toString() !== req.userId)) {
            return res.status(403).json({ success: false, message: 'Only team admins can remove members' });
        }

        // Prevent removing the creator
        if (team.createdBy.toString() === req.params.userId) {
            return res.status(400).json({ success: false, message: 'Cannot remove team creator' });
        }

        await team.removeMember(req.params.userId);
        await team.populate('members.user', 'name email');

        res.json({
            success: true,
            message: 'Member removed successfully',
            data: { team }
        });
    } catch (error) {
        console.error('Remove member error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update member role
router.put('/:id/members/:userId', [
    authenticate,
    body('role').isIn(['admin', 'member', 'viewer']).withMessage('Invalid role')
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

        const team = await Team.findById(req.params.id);
        if (!team) {
            return res.status(404).json({ success: false, message: 'Team not found' });
        }

        // Check if user is admin or creator
        const userRole = team.getUserRole(req.userId);
        if (!userRole || (userRole !== 'admin' && team.createdBy.toString() !== req.userId)) {
            return res.status(403).json({ success: false, message: 'Only team admins can update member roles' });
        }

        // Find and update member
        const member = team.members.find(m => m.user.toString() === req.params.userId);
        if (!member) {
            return res.status(404).json({ success: false, message: 'Member not found' });
        }

        member.role = req.body.role;
        await team.save();
        await team.populate('members.user', 'name email');

        res.json({
            success: true,
            message: 'Member role updated successfully',
            data: { team }
        });
    } catch (error) {
        console.error('Update member role error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Search for users to add to team
router.get('/search/users', authenticate, async (req, res) => {
    try {
        const { q, limit = 10 } = req.query;

        let queryCriteria = { isActive: true };
        
        if (q && q.length >= 2) {
            queryCriteria = {
                $and: [
                    {
                        $or: [
                            { name: { $regex: q, $options: 'i' } },
                            { email: { $regex: q, $options: 'i' } }
                        ]
                    },
                    { isActive: true }
                ]
            };
        }

        const users = await User.find(queryCriteria)
        .select('name email phone')
        .limit(parseInt(limit));

        res.json({
            success: true,
            data: { users }
        });
    } catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

module.exports = router;
