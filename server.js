require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory storage for users (no database needed)
const users = [];

// Middleware
app.use(express.json());
app.use(express.static('.'));

// Register route
app.post('/auth/register', (req, res) => {
    const { username, email, password } = req.body;
    
    console.log(`Registration attempt: ${username} (${email})`);
    
    // Basic validation
    if (!username || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    if (username.length < 3 || username.length > 20) {
        return res.status(400).json({ error: 'Username must be 3-20 characters' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check for duplicates
    const existingUsername = users.find(user => user.username.toLowerCase() === username.toLowerCase());
    if (existingUsername) {
        return res.status(400).json({ error: 'Username already taken' });
    }

    const existingEmail = users.find(user => user.email.toLowerCase() === email.toLowerCase());
    if (existingEmail) {
        return res.status(400).json({ error: 'Email already registered' });
    }

    // Create user
    const newUser = {
        id: users.length + 1,
        username: username.toLowerCase(),
        displayName: username,
        email: email.toLowerCase(),
        password: password,
        createdAt: new Date(),
        profileViews: 0
    };

    users.push(newUser);
    console.log(`New user registered: ${username}`);

    res.status(201).json({
        message: 'Account created successfully',
        username: newUser.username,
        redirectUrl: `/${newUser.username}`
    });
});

// User profile page
app.get('/:username', (req, res) => {
    const { username } = req.params;
    
    // Skip static files
    if (username.includes('.') || username === 'auth' || username === 'user') {
        return res.status(404).send('Not found');
    }
    
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) {
        return res.status(404).send(`
            <div style="text-align: center; margin-top: 100px; font-family: Arial; color: white; background: #0a0a0a; min-height: 100vh;">
                <h1>User not found</h1>
                <p>The profile @${username} doesn't exist.</p>
                <a href="/login" style="color: #36038f;">Create an account</a>
            </div>
        `);
    }

    // Increment profile views
    user.profileViews++;

    // Generate profile page
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>@${user.displayName} - Brook.sh</title>
            <link rel="icon" type="image/png" href="https://i.postimg.cc/VLhBBn9h/void-animated.png">
            <style>
                body {
                    font-family: 'Inter', sans-serif;
                    background: #0a0a0a;
                    color: #ffffff;
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0;
                }
                .background {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: -1;
                    overflow: hidden;
                }
                .background video {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    opacity: 0.3;
                }
                .profile-container {
                    background: rgba(0, 0, 0, 0.4);
                    backdrop-filter: blur(20px);
                    border-radius: 25px;
                    padding: 40px;
                    border: 2px solid rgba(54, 3, 143, 0.5);
                    text-align: center;
                    max-width: 500px;
                    box-shadow: 0 0 30px rgba(54, 3, 143, 0.4);
                }
                .username {
                    font-size: 48px;
                    margin-bottom: 20px;
                    filter: drop-shadow(#36038f 0 0 4px);
                }
                .stats {
                    display: flex;
                    justify-content: space-around;
                    margin: 30px 0;
                    padding: 20px 0;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }
                .stat-item {
                    text-align: center;
                }
                .stat-value {
                    font-size: 24px;
                    font-weight: 600;
                    color: #36038f;
                }
                .stat-label {
                    font-size: 12px;
                    color: rgba(255, 255, 255, 0.6);
                    text-transform: uppercase;
                }
                .back-home {
                    background: #36038f;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    padding: 10px 20px;
                    text-decoration: none;
                    font-weight: 600;
                    margin-top: 20px;
                    display: inline-block;
                }
                .back-home:hover {
                    background: #2a026b;
                }
            </style>
        </head>
        <body>
            <div class="background">
                <video autoplay muted loop playsinline>
                    <source src="https://r2.guns.lol/509c0c10-9e4d-4778-b983-0d08820d84a8.mp4" type="video/mp4">
                </video>
            </div>
            <div class="profile-container">
                <div class="username">@${user.displayName}</div>
                <p>Welcome to ${user.displayName}'s profile!</p>
                <div class="stats">
                    <div class="stat-item">
                        <div class="stat-value">${user.profileViews}</div>
                        <div class="stat-label">Views</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${Math.floor((Date.now() - user.createdAt) / (1000 * 60 * 60 * 24))}</div>
                        <div class="stat-label">Days</div>
                    </div>
                </div>
                <p style="font-size: 12px; color: rgba(255, 255, 255, 0.5); margin-bottom: 20px;">
                    Member since ${user.createdAt.toLocaleDateString()}
                </p>
                <a href="/" class="back-home">← Back to Home</a>
            </div>
        </body>
        </html>
    `);
});

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:3000`);
    console.log(`Login page: http://localhost:3000/login`);
    console.log(`Total users: ${users.length}`);
});
