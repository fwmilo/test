const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ error: 'Access denied' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(400).json({ error: 'Invalid token' });
    }
};

// Get user profile data
router.get('/profile', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Update user profile
router.put('/profile', verifyToken, async (req, res) => {
    try {
        const { bio, profilePicture, theme, socialLinks } = req.body;
        
        const updateData = {};
        if (bio !== undefined) updateData.bio = bio;
        if (profilePicture !== undefined) updateData.profilePicture = profilePicture;
        if (theme !== undefined) updateData.theme = theme;
        if (socialLinks !== undefined) updateData.socialLinks = socialLinks;

        const user = await User.findByIdAndUpdate(
            req.user.userId, 
            updateData, 
            { new: true }
        ).select('-password');

        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Increment profile views
router.post('/view/:username', async (req, res) => {
    try {
        const { username } = req.params;
        await User.findOneAndUpdate(
            { username: username.toLowerCase() },
            { $inc: { profileViews: 1 } }
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;