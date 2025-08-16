class ProfileGenerator {
    static generate(user) {
        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>@${user.displayName} - Brook.sh</title>
            <meta name="description" content="${user.bio}">
            <link rel="icon" type="image/png" href="https://i.postimg.cc/VLhBBn9h/void-animated.png">
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }

                body {
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                    background: #0a0a0a;
                    color: #ffffff;
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow-x: hidden;
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
                    border: 2px solid #36038f80;
                    text-align: center;
                    max-width: 500px;
                    width: 90%;
                    box-shadow: 0 0 30px #36038f66;
                    position: relative;
                    z-index: 1;
                }

                .profile-picture {
                    width: 120px;
                    height: 120px;
                    border-radius: 50%;
                    margin: 0 auto 20px;
                    border: 4px solid #36038f;
                    overflow: hidden;
                }

                .profile-picture img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .username {
                    font-size: 32px;
                    font-weight: 600;
                    margin-bottom: 10px;
                    filter: drop-shadow(#36038f 0 0 4px);
                }

                .bio {
                    font-size: 16px;
                    color: rgba(255, 255, 255, 0.8);
                    margin-bottom: 30px;
                    line-height: 1.5;
                }

                .stats {
                    display: flex;
                    justify-content: space-around;
                    margin-bottom: 30px;
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

                .join-date {
                    font-size: 12px;
                    color: rgba(255, 255, 255, 0.5);
                    margin-bottom: 20px;
                }

                .back-home {
                    background: #36038f;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    padding: 10px 20px;
                    text-decoration: none;
                    font-weight: 600;
                    transition: background 0.2s ease;
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
                <div class="profile-picture">
                    <img src="${user.profilePicture}" alt="${user.displayName}'s Profile Picture">
                </div>
                
                <div class="username">@${user.displayName}</div>
                <div class="bio">${user.bio}</div>
                
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
                
                <div class="join-date">
                    Member since ${user.createdAt.toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    })}
                </div>
                
                <a href="/" class="back-home">← Back to Home</a>
            </div>

            <script>
                fetch('/user/view/${user.username}', { method: 'POST' })
                    .catch(err => console.log('View tracking failed'));
            </script>
        </body>
        </html>
        `;
    }
}

module.exports = ProfileGenerator;