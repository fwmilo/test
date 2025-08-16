const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Register endpoint
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Validation
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Username validation
        if (username.length < 3 || username.length > 20) {
            return res.status(400).json({ error: 'Username must be 3-20 characters' });
        }

        if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
            return res.status(400).json({ 
                error: 'Username can only contain letters, numbers, hyphens, and underscores' 
            });
        }

        // Check reserved usernames
        const reservedUsernames = ['admin', 'api', 'www', 'mail', 'ftp', 'login', 'register', 'auth', 'user'];
        if (reservedUsernames.includes(username.toLowerCase())) {
            return res.status(400).json({ error: 'Username is reserved' });
        }

        // Password validation
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [
                { email: email.toLowerCase() }, 
                { username: username.toLowerCase() }
            ]
        });

        if (existingUser) {
            return res.status(400).json({ 
                error: existingUser.email === email.toLowerCase() ? 
                    'Email already registered' : 'Username already taken' 
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const user = new User({
            username: username.toLowerCase(),
            displayName: username,
            email: email.toLowerCase(),
            password: hashedPassword
        });

        await user.save();

        // Generate JWT
        const token = jwt.sign(
            { userId: user._id, username: user.username }, 
            JWT_SECRET, 
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'Account created successfully',
            token,
            username: user.username,
            redirectUrl: `/${user.username}`
        });

    } catch (error) {
        console.error('Registration error:', error);
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Username or email already exists' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login endpoint
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        const token = jwt.sign(
            { userId: user._id, username: user.username }, 
            JWT_SECRET, 
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            token,
            username: user.username,
            redirectUrl: `/${user.username}`
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Check username availability
router.get('/check-username/:username', async (req, res) => {
    try {
        const { username } = req.params;
        
        if (username.length < 3 || username.length > 20) {
            return res.json({ available: false, reason: 'Invalid length' });
        }

        if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
            return res.json({ available: false, reason: 'Invalid characters' });
        }

        const reservedUsernames = ['admin', 'api', 'www', 'mail', 'ftp', 'login', 'register', 'auth', 'user'];
        if (reservedUsernames.includes(username.toLowerCase())) {
            return res.json({ available: false, reason: 'Reserved username' });
        }

        const existingUser = await User.findOne({ username: username.toLowerCase() });
        res.json({ available: !existingUser });

    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;