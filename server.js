require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// API secret key for internal requests
const API_SECRET = process.env.API_SECRET || 'brook-sh-internal-api-key-2024';

// Device and session management
let deviceSessions = new Map();
let activeTokens = new Map();

// Generate device fingerprint
function generateDeviceFingerprint(req) {
    const userAgent = req.headers['user-agent'] || '';
    const acceptLanguage = req.headers['accept-language'] || '';
    const acceptEncoding = req.headers['accept-encoding'] || '';
    
    const fingerprint = crypto
        .createHash('sha256')
        .update(userAgent + acceptLanguage + acceptEncoding)
        .digest('hex')
        .substring(0, 16);
    
    return fingerprint;
}

// Create secure device session
function createDeviceSession(uid, deviceFingerprint, rememberDevice = false) {
    const sessionId = crypto.randomBytes(32).toString('hex');
    const sessionToken = crypto.randomBytes(32).toString('hex');
    
    const sessionData = {
        uid,
        deviceFingerprint,
        sessionToken,
        created: Date.now(),
        lastUsed: Date.now(),
        rememberDevice,
        expiresAt: rememberDevice 
            ? Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days for remembered devices
            : Date.now() + (24 * 60 * 60 * 1000) // 24 hours for regular sessions
    };
    
    deviceSessions.set(sessionId, sessionData);
    
    // Clean up expired sessions
    cleanupExpiredSessions();
    
    // Save to file
    saveSessions();
    
    return { sessionId, sessionToken };
}

// Validate device session
function validateDeviceSession(sessionId, sessionToken, deviceFingerprint) {
    const session = deviceSessions.get(sessionId);
    
    if (!session) {
        return null;
    }
    
    // Check if session expired
    if (Date.now() > session.expiresAt) {
        deviceSessions.delete(sessionId);
        saveSessions();
        return null;
    }
    
    // Check if device fingerprint matches
    if (session.deviceFingerprint !== deviceFingerprint) {
        deviceSessions.delete(sessionId);
        saveSessions();
        return null;
    }
    
    // Check if session token matches
    if (session.sessionToken !== sessionToken) {
        deviceSessions.delete(sessionId);
        saveSessions();
        return null;
    }
    
    // Update last used
    session.lastUsed = Date.now();
    saveSessions();
    
    return session.uid;
}

// Clean up expired sessions
function cleanupExpiredSessions() {
    const now = Date.now();
    let cleaned = false;
    for (let [sessionId, session] of deviceSessions) {
        if (now > session.expiresAt) {
            deviceSessions.delete(sessionId);
            cleaned = true;
        }
    }
    if (cleaned) {
        saveSessions();
    }
}

// Revoke device session (for logout)
function revokeDeviceSession(sessionId) {
    deviceSessions.delete(sessionId);
    saveSessions();
}

// Load API data
function loadAPIData() {
    try {
        const apiDataPath = path.join(__dirname, 'api-data.json');
        
        // Check if file exists
        if (!fs.existsSync(apiDataPath)) {
            console.log('API data file not found, creating default...');
            const defaultData = { users: [], credentials: [] };
            fs.writeFileSync(apiDataPath, JSON.stringify(defaultData, null, 2), 'utf8');
            return defaultData;
        }
        
        // Read file and remove BOM if present
        const rawData = fs.readFileSync(apiDataPath, 'utf8');
        const cleanData = rawData.replace(/^\uFEFF/, ''); // Remove BOM
        
        // Try to parse JSON
        const apiData = JSON.parse(cleanData);
        
        // Validate structure
        if (!apiData.users || !apiData.credentials) {
            throw new Error('Invalid API data structure');
        }
        
        return apiData;
    } catch (error) {
        console.error('Error loading API data:', error);
        
        // Create clean default file
        const defaultData = { users: [], credentials: [] };
        try {
            const apiDataPath = path.join(__dirname, 'api-data.json');
            fs.writeFileSync(apiDataPath, JSON.stringify(defaultData, null, 2), 'utf8');
            console.log('Created clean API data file');
        } catch (writeError) {
            console.error('Failed to create clean API data file:', writeError);
        }
        
        return defaultData;
    }
}

// Save API data
function saveAPIData(data) {
    try {
        const apiDataPath = path.join(__dirname, 'api-data.json');
        fs.writeFileSync(apiDataPath, JSON.stringify(data, null, 2), 'utf8');
        console.log('API data saved successfully');
    } catch (error) {
        console.error('Error saving API data:', error);
    }
}

// Generate secure token
function generateSecureToken(uid) {
    const timestamp = Date.now();
    const random = crypto.randomBytes(16).toString('hex');
    const hash = crypto.createHash('sha256').update(`${uid}-${timestamp}-${random}`).digest('hex');
    return `brook_${hash.substring(0, 32)}`;
}

// Parse token to get UID (you'll need to store token-to-UID mapping)
function createUserToken(uid) {
    const token = generateSecureToken(uid);
    activeTokens.set(token, { uid, created: Date.now() });
    
    // Clean up old tokens (optional)
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    for (let [key, value] of activeTokens) {
        if (value.created < oneDayAgo) {
            activeTokens.delete(key);
        }
    }
    
    // Save to file
    saveSessions();
    
    return token;
}

function validateToken(token) {
    if (!token || !activeTokens.has(token)) {
        return null;
    }
    
    const tokenData = activeTokens.get(token);
    return tokenData.uid;
}

// Middleware
app.use(express.json());

// PROTECTED API ENDPOINT - Only accessible with secret header
app.get('/api.json', (req, res) => {
    const authHeader = req.headers['x-api-secret'];
    const referer = req.headers.referer;
    const host = req.headers.host;
    
    // Check if request is from your own domain OR has the secret key
    const isFromOwnDomain = referer && (referer.includes(host) || referer.includes('brook.sh'));
    const hasValidSecret = authHeader === API_SECRET;
    
    if (!isFromOwnDomain && !hasValidSecret) {
        return res.status(403).json({ error: 'Access denied' });
    }
    
    // Return API data
    const apiData = loadAPIData();
    res.json(apiData);
});

// Helper function to fetch your own API - FIXED
async function fetchInternalAPI() {
    try {
        // Use direct function call instead of HTTP request
        return loadAPIData();
    } catch (error) {
        console.error('Internal API fetch error:', error);
        return { users: [], credentials: [] };
    }
}

// Serve static files (but block sensitive files)
app.use('/api-data.json', (req, res) => {
    res.status(403).json({ error: 'Access denied' });
});

app.use('/sessions.json', (req, res) => {
    res.status(403).json({ error: 'Access denied' });
});

app.use(express.static('.', {
    dotfiles: 'deny',
    index: false,
    redirect: false
}));

// Serve main page
app.get('/', (req, res) => {
    let indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    
    const autoLoginScript = `
    <script>
        // Check device session instead of direct token
        const sessionId = localStorage.getItem('brook_session_id');
        const sessionData = localStorage.getItem('brook_session');
        const savedUsername = localStorage.getItem('brook_username');
        
        if (sessionId && sessionData && savedUsername) {
            try {
                const session = JSON.parse(atob(sessionData));
                
                fetch('/auth/verify-device', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        sessionId: sessionId,
                        sessionToken: session.sessionToken
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.valid) {
                        // User has valid device session, show username
                        const authLink = document.querySelector('#auth-link') || document.querySelector('a[href="/login"]');
                        if (authLink) {
                            authLink.textContent = '@' + savedUsername;
                            authLink.href = '/account';
                            authLink.style.color = '#36038f';
                            authLink.style.fontWeight = '600';
                        }
                    } else {
                        // Session expired, clear everything
                        localStorage.removeItem('brook_session_id');
                        localStorage.removeItem('brook_session');
                        localStorage.removeItem('brook_username');
                        
                        const authLink = document.querySelector('#auth-link') || document.querySelector('a[href="/login"]');
                        if (authLink) {
                            authLink.textContent = 'Login';
                            authLink.href = '/login';
                            authLink.style.color = '';
                            authLink.style.fontWeight = '';
                        }
                    }
                })
                .catch(error => {
                    // Error checking session, reset to login
                    localStorage.clear();
                    const authLink = document.querySelector('#auth-link') || document.querySelector('a[href="/login"]');
                    if (authLink) {
                        authLink.textContent = 'Login';
                        authLink.href = '/login';
                    }
                });
            } catch (error) {
                localStorage.clear();
            }
        }
    </script>
    `;
    
    indexHtml = indexHtml.replace('</body>', autoLoginScript + '</body>');
    res.send(indexHtml);
});

// Auto-login check route
app.get('/auth/check', async (req, res) => {
    const token = req.query.token || req.headers.authorization;
    
    if (!token || !token.startsWith('temp-token-')) {
        return res.json({ authenticated: false });
    }
    
    try {
        const uid = parseInt(token.replace('temp-token-', ''));
        const apiData = await fetchInternalAPI();
        const user = apiData.users.find(u => u.uid === uid);
        
        if (!user) {
            return res.json({ authenticated: false });
        }
        
        res.json({ 
            authenticated: true, 
            username: user.username,
            redirectUrl: `/account?token=${token}`
        });
    } catch (error) {
        res.json({ authenticated: false });
    }
});

// Serve login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

// Authentication middleware
async function requireAuth(req, res, next) {
    const token = req.query.token || req.headers.authorization;
    
    if (!token) {
        return res.redirect('/login');
    }
    
    try {
        const uid = validateToken(token);
        if (!uid) {
            return res.redirect('/login');
        }
        
        const apiData = await fetchInternalAPI();
        const user = apiData.users.find(u => u.uid === uid);
        
        if (!user) {
            return res.redirect('/login');
        }
        
        req.user = user;
        next();
    } catch (error) {
        return res.redirect('/login');
    }
}

// Serve account dashboard
app.get('/account', async (req, res) => {
    const tokenFromURL = req.query.token;
    
    // If no token in URL, serve page with device session check
    if (!tokenFromURL) {
        return res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Brook.sh - Account</title>
                <link rel="icon" type="image/png" href="https://i.postimg.cc/VLhBBn9h/void-animated.png">
            </head>
            <body>
                <script>
                    // Check for secure device session
                    const sessionId = localStorage.getItem('brook_session_id');
                    const sessionData = localStorage.getItem('brook_session');
                    
                    if (sessionId && sessionData) {
                        try {
                            const session = JSON.parse(atob(sessionData));
                            
                            // Verify device session with server
                            fetch('/auth/verify-device', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ 
                                    sessionId: sessionId,
                                    sessionToken: session.sessionToken
                                })
                            })
                            .then(response => response.json())
                            .then(data => {
                                if (data.valid) {
                                    // Create temporary access token for this session
                                    window.location.href = '/account?token=' + data.accessToken;
                                } else {
                                    // Session expired or invalid, clear and redirect
                                    localStorage.removeItem('brook_session_id');
                                    localStorage.removeItem('brook_session');
                                    localStorage.removeItem('brook_username');
                                    window.location.href = '/login';
                                }
                            })
                            .catch(error => {
                                window.location.href = '/login';
                            });
                        } catch (error) {
                            // Invalid session data
                            localStorage.clear();
                            window.location.href = '/login';
                        }
                    } else {
                        // No session, redirect to login
                        window.location.href = '/login';
                    }
                </script>
            </body>
            </html>
        `);
    }

    // Process token and serve account page
    try {
        const uid = validateToken(tokenFromURL);
        if (!uid) {
            return res.redirect('/login');
        }
        
        const apiData = await fetchInternalAPI();
        const user = apiData.users.find(u => u.uid === uid);
        
        if (!user) {
            return res.redirect('/login');
        }
        
        const daysSinceCreation = Math.floor((Date.now() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24));
        
        let accountHtml = fs.readFileSync(path.join(__dirname, 'account.html'), 'utf8');
        
        const templateVars = {
            '{{USERNAME}}': user.username,
            '{{DISPLAY_USERNAME}}': `@${user.username}`,
            '{{AVATAR_LETTER}}': user.username.charAt(0).toUpperCase(),
            '{{USER_UID}}': user.uid,
            '{{PROFILE_VIEWS}}': user.profileViews,
            '{{MEMBER_SINCE}}': new Date(user.createdAt).toLocaleDateString(),
            '{{PROFILE_LINK}}': `/${user.username}`,
            '{{DAYS_SINCE_CREATION}}': daysSinceCreation
        };
        
        Object.keys(templateVars).forEach(key => {
            accountHtml = accountHtml.replace(new RegExp(key, 'g'), templateVars[key]);
        });

        // Add script to clean URL and store token
        const cleanupScript = `
        <script>
            // Store token in localStorage and clean URL
            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('token');
            if (token) {
                localStorage.setItem('brook_auth_token', token);
                localStorage.setItem('brook_username', '${user.username}');
                // Clean URL without refreshing page
                window.history.replaceState({}, document.title, '/account');
            }
        </script>
        `;
        
        accountHtml = accountHtml.replace('</body>', cleanupScript + '</body>');
        
        res.send(accountHtml);
    } catch (error) {
        return res.redirect('/login');
    }
});

// Update the login route:

app.post('/auth/login', async (req, res) => {
    const { email, password, rememberDevice } = req.body;
    
    console.log(`Login attempt: ${email}`);
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const apiData = await fetchInternalAPI();
        
        const userCredential = apiData.credentials.find(c => c.email.toLowerCase() === email.toLowerCase());
        if (!userCredential) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        if (userCredential.password !== password) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        const user = apiData.users.find(u => u.uid === userCredential.uid);
        if (!user) {
            return res.status(400).json({ error: 'User profile not found' });
        }

        // Generate device fingerprint and create secure session
        const deviceFingerprint = generateDeviceFingerprint(req);
        const { sessionId, sessionToken } = createDeviceSession(user.uid, deviceFingerprint, rememberDevice);
        
        console.log(`Login successful for ${user.username} on device ${deviceFingerprint.substring(0, 8)}...`);

        // Create temporary display token (short-lived)
        const tempToken = createUserToken(user.uid);

        res.json({
            message: 'Login successful',
            token: tempToken, // This will be replaced by secure session
            username: user.username,
            sessionId: sessionId,
            sessionToken: sessionToken,
            redirectUrl: `/account`
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Update the register route to return clean redirect URL
app.post('/auth/register', async (req, res) => {
    const { username, email, password } = req.body;
    const usernameNormalized = username.toLowerCase();
    
    console.log(`Registration attempt: ${usernameNormalized} (${email})`);
    
    // Basic validation
    if (!username || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    if (usernameNormalized.length < 3 || usernameNormalized.length > 20) {
        return res.status(400).json({ error: 'Username must be 3-20 characters' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    try {
        const apiData = await fetchInternalAPI();
        
        const existingUsername = apiData.users.find(user => user.username === usernameNormalized);
        if (existingUsername) {
            return res.status(400).json({ error: 'Username already taken' });
        }

        const existingEmail = apiData.credentials.find(cred => cred.email.toLowerCase() === email.toLowerCase());
        if (existingEmail) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const newUID = apiData.users.length + 1;

        const newUser = {
            uid: newUID,
            username: usernameNormalized,
            alias: usernameNormalized,
            createdAt: new Date().toISOString(),
            profileViews: 0,
            lastUpdated: new Date().toISOString()
        };

        const newCredential = {
            uid: newUID,
            email: email.toLowerCase(),
            password: password
        };

        apiData.users.push(newUser);
        apiData.credentials.push(newCredential);
        
        saveAPIData(apiData);
        
        console.log(`New user registered: ${usernameNormalized} (UID: ${newUID})`);

        const token = createUserToken(newUID);

        res.status(201).json({
            message: 'Account created successfully',
            token: token,
            username: newUser.username,
            redirectUrl: `/account`  // Clean URL without token
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Username availability check
app.get('/auth/check-username/:username', async (req, res) => {
    const { username } = req.params;
    const usernameCheck = username.toLowerCase();
    
    console.log(`Checking username: ${usernameCheck}`);
    
    // Basic validation
    if (usernameCheck.length < 3 || usernameCheck.length > 20) {
        return res.json({ available: false, reason: 'Invalid length' });
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(usernameCheck)) {
        return res.json({ available: false, reason: 'Invalid characters' });
    }

    const reservedUsernames = ['admin', 'api', 'www', 'mail', 'ftp', 'login', 'register', 'auth', 'user', 'data', 'account'];
    if (reservedUsernames.includes(usernameCheck)) {
        return res.json({ available: false, reason: 'Reserved username' });
    }

    try {
        // Check via internal API
        const apiData = await fetchInternalAPI();
        const existingUser = apiData.users.find(user => user.username === usernameCheck);
        
        if (existingUser) {
            return res.json({ available: false, reason: 'Username taken' });
        }

        res.json({ available: true });
    } catch (error) {
        console.error('Username check error:', error);
        res.status(500).json({ available: false, reason: 'Database error' });
    }
});

// Update token verification route:
app.post('/auth/verify', async (req, res) => {
    const { token } = req.body;
    
    if (!token) {
        return res.json({ valid: false });
    }
    
    try {
        const uid = validateToken(token);
        if (!uid) {
            return res.json({ valid: false });
        }
        
        const apiData = await fetchInternalAPI();
        const user = apiData.users.find(u => u.uid === uid);
        
        if (!user) {
            return res.json({ valid: false });
        }
        
        res.json({ valid: true, username: user.username });
    } catch (error) {
        res.json({ valid: false });
    }
});

// User profile page
app.get('/:username', async (req, res) => {
    const { username } = req.params;
    const usernameNormalized = username.toLowerCase();
    
    // Skip static files AND reserved routes
    if (username.includes('.') || username === 'auth' || username === 'user' || username === 'login' || username === 'data' || username === 'account' || username === 'api') {
        return res.status(404).send('Not found');
    }
    
    try {
        // Fetch from internal API
        const apiData = await fetchInternalAPI();
        const user = apiData.users.find(u => u.username === usernameNormalized);
        
        if (!user) {
            return res.status(404).send(`
                <div style="text-align: center; margin-top: 100px; font-family: Arial; color: white; background: #0a0a0a; min-height: 100vh;">
                    <h1>User not found</h1>
                    <p>The profile @${usernameNormalized} doesn't exist.</p>
                    <a href="/login" style="color: #36038f;">Create an account</a>
                </div>
            `);
        }

        // Increment profile views and save
        user.profileViews++;
        user.lastUpdated = new Date().toISOString();
        saveAPIData(apiData);

        const daysSinceCreation = Math.floor((Date.now() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24));

        // Generate profile page HTML (same as before)
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
        
    } catch (error) {
        console.error('Profile lookup error:', error);
        res.status(500).send('Server error');
    }
});

// Debug route (REMOVE IN PRODUCTION or add admin check)
app.get('/debug', (req, res) => {
    // Only allow in development or with admin key
    const adminKey = req.query.admin;
    if (process.env.NODE_ENV === 'production' && adminKey !== process.env.ADMIN_KEY) {
        return res.status(403).json({ error: 'Access denied' });
    }
    
    const apiData = loadAPIData();
    res.json({
        message: 'API Debug Info',
        totalUsers: apiData.users.length,
        totalCredentials: apiData.credentials.length,
        // Only show usernames and UIDs, NO emails
        users: apiData.users.map(u => ({ uid: u.uid, username: u.username, profileViews: u.profileViews })),
        // Don't show any credential info in debug
        credentialsCount: apiData.credentials.length
    });
});

// Add new route for device session verification:

app.post('/auth/verify-device', async (req, res) => {
    const { sessionId, sessionToken } = req.body;
    
    if (!sessionId || !sessionToken) {
        return res.json({ valid: false });
    }
    
    try {
        // Generate device fingerprint for this request
        const deviceFingerprint = generateDeviceFingerprint(req);
        
        // Validate device session
        const uid = validateDeviceSession(sessionId, sessionToken, deviceFingerprint);
        
        if (!uid) {
            return res.json({ valid: false });
        }
        
        // Get user data
        const apiData = await fetchInternalAPI();
        const user = apiData.users.find(u => u.uid === uid);
        
        if (!user) {
            return res.json({ valid: false });
        }
        
        // Create temporary access token for this session
        const accessToken = createUserToken(uid);
        
        res.json({ 
            valid: true, 
            username: user.username,
            accessToken: accessToken
        });
    } catch (error) {
        res.json({ valid: false });
    }
});

// Add logout route to revoke device session
app.post('/auth/logout', (req, res) => {
    const { sessionId } = req.body;
    
    if (sessionId) {
        revokeDeviceSession(sessionId);
    }
    
    res.json({ success: true });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Protected API available at: /api.json`);
});
