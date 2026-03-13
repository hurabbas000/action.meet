const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET || 'your-secret-key', {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
};

// Register user
router.post('/register', [
    body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('phone').optional().matches(/^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/).withMessage('Please provide a valid phone number')
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

        const { name, email, password, phone, role = 'member' } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Create new user
        const user = await User.create({
            name,
            email,
            password,
            phone,
            role,
            isActive: true
        });

        // Generate token
        const token = generateToken(user._id);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user: user.getProfile(),
                token
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Login user
router.post('/login', [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required')
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

        const { email, password } = req.body;

        // Find user with password
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Your account has been deactivated'
            });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Generate token
        const token = generateToken(user._id);

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: user.getProfile(),
                token
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get current user (protected route)
router.get('/me', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }

        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Your account has been deactivated'
            });
        }

        res.json({
            success: true,
            data: {
                user: user.getProfile()
            }
        });
    } catch (error) {
        console.error('Get current user error:', error);
        res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
});

// Update user profile
router.put('/profile', [
    body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
    body('phone').optional().matches(/^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/).withMessage('Please provide a valid phone number')
], async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation errors',
                errors: errors.array()
            });
        }

        const { name, phone, preferences, avatar } = req.body;

        if (name) user.name = name;
        if (phone) user.phone = phone;
        if (avatar) user.avatar = avatar;
        if (preferences) user.preferences = { ...user.preferences, ...preferences };

        await user.save();

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                user: user.getProfile()
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Change password
router.put('/password', [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const user = await User.findById(decoded.userId).select('+password');
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation errors',
                errors: errors.array()
            });
        }

        const { currentPassword, newPassword } = req.body;

        // Check current password
        const isCurrentPasswordValid = await user.comparePassword(currentPassword);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});


// ─── Update Profile (PUT /auth/profile) ───────────
router.put('/profile', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) return res.status(401).json({ success: false, message: 'No token provided' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const user = await User.findById(decoded.userId);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const { name, bio, email } = req.body;
        if (name && name.trim()) user.name = name.trim();
        if (bio !== undefined) user.bio = bio;
        if (email && email !== user.email) {
            const taken = await User.findOne({ email });
            if (taken) return res.status(400).json({ success: false, message: 'Email already in use' });
            user.email = email;
        }
        await user.save();
        res.json({ success: true, message: 'Profile updated', data: { user: user.getProfile() } });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

module.exports = router;
