require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Database file paths (separate sensitive data)
const USERS_PATH = path.join(__dirname, 'data', 'users.json');
const CREDENTIALS_PATH = path.join(__dirname, 'data', 'credentials.json');

// Ensure data directory exists
const dataDir = path.dirname(USERS_PATH);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Load users from JSON database (public profile data only)
function loadUsers() {
    try {
        if (fs.existsSync(USERS_PATH)) {
            const data = fs.readFileSync(USERS_PATH, 'utf8');
            return JSON.parse(data);
        }
        return [];
    } catch (error) {
        console.error('Error loading users:', error);
        return [];
    }
}

// Load credentials from separate JSON database (sensitive data)
function loadCredentials() {
    try {
        if (fs.existsSync(CREDENTIALS_PATH)) {
            const data = fs.readFileSync(CREDENTIALS_PATH, 'utf8');
            return JSON.parse(data);
        }
        return [];
    } catch (error) {
        console.error('Error loading credentials:', error);
        return [];
    }
}

// Save users to JSON database (public data only)
function saveUsers(users) {
    try {
        fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2));
        console.log('Users database updated');
    } catch (error) {
        console.error('Error saving users:', error);
    }
}

// Save credentials to separate JSON database (sensitive data)
function saveCredentials(credentials) {
    try {
        fs.writeFileSync(CREDENTIALS_PATH, JSON.stringify(credentials, null, 2));
        console.log('Credentials database updated');
    } catch (error) {
        console.error('Error saving credentials:', error);
    }
}

// Initialize data from databases
let users = loadUsers();
let credentials = loadCredentials();

// Middleware
app.use(express.json());

// Block access to data directory
app.use('/data', (req, res) => {
    res.status(403).json({ error: 'Access denied' });
});

// Serve static files (but exclude data directory)
app.use(express.static('.', {
    dotfiles: 'deny',
    index: false,
    redirect: false
}));

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

// Username availability check route
app.get('/auth/check-username/:username', (req, res) => {
    const { username } = req.params;
    
    console.log(`Checking username: ${username}`);
    
    // Basic validation
    if (username.length < 3 || username.length > 20) {
        return res.json({ available: false, reason: 'Invalid length' });
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        return res.json({ available: false, reason: 'Invalid characters' });
    }

    const reservedUsernames = ['admin', 'api', 'www', 'mail', 'ftp', 'login', 'register', 'auth', 'user', 'data'];
    if (reservedUsernames.includes(username.toLowerCase())) {
        return res.json({ available: false, reason: 'Reserved username' });
    }

    // Check if username already exists
    const existingUser = users.find(user => user.username.toLowerCase() === username.toLowerCase());
    if (existingUser) {
        return res.json({ available: false, reason: 'Username taken' });
    }

    res.json({ available: true });
});

// Login route
app.post('/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    console.log(`Login attempt: ${email}`);
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user credentials by email
    const userCredential = credentials.find(c => c.email.toLowerCase() === email.toLowerCase());
    if (!userCredential) {
        return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Check password (in production, compare hashed passwords)
    if (userCredential.password !== password) {
        return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Find user profile data
    const user = users.find(u => u.uid === userCredential.uid);
    if (!user) {
        return res.status(400).json({ error: 'User profile not found' });
    }

    res.json({
        message: 'Login successful',
        token: 'temp-token-' + user.uid,
        username: user.username,
        redirectUrl: `/${user.username}`
    });
});

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

    // Check for duplicates in users
    const existingUsername = users.find(user => user.username.toLowerCase() === username.toLowerCase());
    if (existingUsername) {
        return res.status(400).json({ error: 'Username already taken' });
    }

    // Check for duplicates in credentials
    const existingEmail = credentials.find(cred => cred.email.toLowerCase() === email.toLowerCase());
    if (existingEmail) {
        return res.status(400).json({ error: 'Email already registered' });
    }

    // Generate new UID
    const newUID = users.length + 1;

    // Create user profile (public data)
    const newUser = {
        uid: newUID,
        username: username.toLowerCase(),
        alias: username, // Display name/alias
        createdAt: new Date().toISOString(),
        profileViews: 0,
        lastUpdated: new Date().toISOString()
    };

    // Create user credentials (sensitive data)
    const newCredential = {
        uid: newUID,
        email: email.toLowerCase(),
        password: password // In production, hash this!
    };

    // Add to arrays
    users.push(newUser);
    credentials.push(newCredential);
    
    // Save to separate JSON databases
    saveUsers(users);
    saveCredentials(credentials);
    
    console.log(`New user registered: ${username} (UID: ${newUID})`);

    res.status(201).json({
        message: 'Account created successfully',
        username: newUser.username,
        redirectUrl: `/${newUser.username}`
    });
});

// Update alias route (for future use)
app.put('/auth/update-alias', (req, res) => {
    const { username, newAlias, token } = req.body;
    
    // Basic auth check (implement proper JWT in production)
    if (!token || !token.startsWith('temp-token-')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const user = users.find(u => u.username === username);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    // Update alias
    user.alias = newAlias;
    user.lastUpdated = new Date().toISOString();
    
    // Save to JSON database
    saveUsers(users);
    
    console.log(`User ${username} updated alias to: ${newAlias}`);
    
    res.json({ message: 'Alias updated successfully' });
});

// User profile page
app.get('/:username', (req, res) => {
    const { username } = req.params;
    
    // Skip static files AND reserved routes
    if (username.includes('.') || username === 'auth' || username === 'user' || username === 'login' || username === 'data') {
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

    // Increment profile views and save to database
    user.profileViews++;
    user.lastUpdated = new Date().toISOString();
    saveUsers(users);

    const daysSinceCreation = Math.floor((Date.now() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24));

    // Generate profile page with tooltip on username
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>@${user.alias} - Brook.sh</title>
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
                    position: relative;
                    cursor: pointer;
                }
                
                /* Tooltip styles */
                .username::after {
                    content: "User ID: ${user.uid}";
                    position: absolute;
                    bottom: 100%;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(0, 0, 0, 0.9);
                    color: #36038f;
                    padding: 8px 12px;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 500;
                    white-space: nowrap;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.3s ease;
                    border: 1px solid rgba(54, 3, 143, 0.5);
                    z-index: 1000;
                    margin-bottom: 5px;
                }
                
                .username::before {
                    content: "";
                    position: absolute;
                    bottom: 100%;
                    left: 50%;
                    transform: translateX(-50%);
                    border: 6px solid transparent;
                    border-top-color: rgba(54, 3, 143, 0.5);
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.3s ease;
                    margin-bottom: -1px;
                    z-index: 1000;
                }
                
                .username:hover::after,
                .username:hover::before {
                    opacity: 1;
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
                <div class="username">@${user.alias}</div>
                <p>Welcome to ${user.alias}'s profile!</p>
                <div class="stats">
                    <div class="stat-item">
                        <div class="stat-value">${user.profileViews}</div>
                        <div class="stat-label">Views</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${daysSinceCreation}</div>
                        <div class="stat-label">Days</div>
                    </div>
                </div>
                <p style="font-size: 12px; color: rgba(255, 255, 255, 0.5); margin-bottom: 20px;">
                    Member since ${new Date(user.createdAt).toLocaleDateString()}
                </p>
                <a href="/" class="back-home">← Back to Home</a>
            </div>
        </body>
        </html>
    `);
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:3000`);
    console.log(`Login page: http://localhost:3000/login`);
    console.log(`Total users: ${users.length}`);
});
