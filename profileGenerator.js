class ProfileGenerator {
    static generate(user) {
        const themeColors = {
            dark: {
                bg: '#0a0a0a',
                primary: '#36038f',
                secondary: '#2a026b'
            },
            light: {
                bg: '#f5f5f5',
                primary: '#36038f',
                secondary: '#2a026b'
            },
            purple: {
                bg: '#1a0a2e',
                primary: '#8b5cf6',
                secondary: '#7c3aed'
            }
        };

        const theme = themeColors[user.theme] || themeColors.dark;

        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>@${user.displayName} - Brook.sh</title>
            <meta name="description" content="${user.bio}">
            <meta property="og:title" content="@${user.displayName}">
            <meta property="og:description" content="${user.bio}">
            <meta property="og:url" content="https://brook.sh/${user.username}">
            <meta property="og:type" content="profile">
            <link rel="icon" type="image/png" href="https://i.postimg.cc/VLhBBn9h/void-animated.png">
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }

                body {
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                    background: ${theme.bg};
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
                    border: 2px solid ${theme.primary}80;
                    text-align: center;
                    max-width: 500px;
                    width: 90%;
                    box-shadow: 0 0 30px ${theme.primary}66;
                    position: relative;
                    z-index: 1;
                }

                .profile-picture {
                    width: 120px;
                    height: 120px;
                    border-radius: 50%;
                    margin: 0 auto 20px;
                    border: 4px solid ${theme.primary};
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
                    filter: drop-shadow(${theme.primary} 0 0 4px);
                }

                .display-name {
                    font-size: 18px;
                    color: rgba(255, 255, 255, 0.7);
                    margin-bottom: 20px;
                }

                .bio {
                    font-size: 16px;
                    color: rgba(255, 255, 255, 0.8);
                    margin-bottom: 30px;
                    line-height: 1.5;
                }

                .verified-badge {
                    display: inline-block;
                    background: ${theme.primary};
                    color: white;
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 10px;
                    font-weight: 600;
                    text-transform: uppercase;
                    margin-left: 8px;
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
                    color: ${theme.primary};
                }

                .stat-label {
                    font-size: 12px;
                    color: rgba(255, 255, 255, 0.6);
                    text-transform: uppercase;
                }

                .social-links {
                    display: flex;
                    justify-content: center;
                    gap: 15px;
                    margin-bottom: 20px;
                }

                .social-link {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 40px;
                    height: 40px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    color: #ffffff;
                    text-decoration: none;
                    transition: all 0.2s ease;
                }

                .social-link:hover {
                    background: ${theme.primary};
                    transform: translateY(-2px);
                }

                .join-date {
                    font-size: 12px;
                    color: rgba(255, 255, 255, 0.5);
                    margin-bottom: 20px;
                }

                .back-home {
                    background: ${theme.primary};
                    color: white;
                    border: none;
                    border-radius: 8px;
                    padding: 10px 20px;
                    text-decoration: none;
                    font-weight: 600;
                    transition: background 0.2s ease;
                }

                .back-home:hover {
                    background: ${theme.secondary};
                }

                @media (max-width: 768px) {
                    .profile-container {
                        padding: 30px 20px;
                        margin: 20px;
                    }

                    .username {
                        font-size: 24px;
                    }

                    .stats {
                        flex-direction: column;
                        gap: 15px;
                    }
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
                
                <div class="username">
                    @${user.displayName}
                    ${user.isVerified ? '<span class="verified-badge">Verified</span>' : ''}
                </div>
                
                <div class="display-name">brook.sh/${user.username}</div>
                
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
                
                ${this.generateSocialLinks(user.socialLinks)}
                
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
                // Increment profile view
                fetch('/user/view/${user.username}', { method: 'POST' })
                    .catch(err => console.log('View tracking failed'));
            </script>
        </body>
        </html>
        `;
    }

    static generateSocialLinks(socialLinks) {
        if (!socialLinks || Object.keys(socialLinks).length === 0) {
            return '';
        }

        const links = [];
        
        if (socialLinks.discord) {
            links.push(`<a href="${socialLinks.discord}" class="social-link" target="_blank">💬</a>`);
        }
        if (socialLinks.twitter) {
            links.push(`<a href="${socialLinks.twitter}" class="social-link" target="_blank">🐦</a>`);
        }
        if (socialLinks.github) {
            links.push(`<a href="${socialLinks.github}" class="social-link" target="_blank">⚡</a>`);
        }
        if (socialLinks.website) {
            links.push(`<a href="${socialLinks.website}" class="social-link" target="_blank">🌐</a>`);
        }

        return links.length > 0 ? `<div class="social-links">${links.join('')}</div>` : '';
    }
}

module.exports = ProfileGenerator;