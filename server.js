const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Import auth routes
const authRoutes = require('./auth/authRoutes');
const userRoutes = require('./auth/userRoutes');

// Middleware
app.use(express.json());
app.use(express.static('.'));

// Database connection
require('./auth/database');

// Routes
app.use('/auth', authRoutes);
app.use('/user', userRoutes);

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'auth/login.html'));
});

// Dynamic user profiles
app.get('/:username', async (req, res) => {
    try {
        const User = require('./auth/models/User');
        const { username } = req.params;
        
        // Skip if it's a static file or API route
        if (username.includes('.') || username === 'auth' || username === 'user') {
            return res.status(404).send('Not found');
        }
        
        const user = await User.findOne({ username: username.toLowerCase() });
        if (!user) {
            return res.status(404).send('User not found');
        }

        const ProfileGenerator = require('./auth/profileGenerator');
        const profileHTML = ProfileGenerator.generate(user);
        res.send(profileHTML);

    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).send('Server error');
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Login page: http://localhost:${PORT}/login`);
});

// filepath: c:\Users\Milo\Desktop\website test\auth\database.js
const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/brooksh', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

connectDB();

module.exports = mongoose;