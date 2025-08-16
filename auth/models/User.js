const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        minlength: 3,
        maxlength: 20,
        match: /^[a-zA-Z0-9_-]+$/,
        lowercase: true
    },
    displayName: {
        type: String,
        required: true,
        minlength: 3,
        maxlength: 20
    },
    email: {
        type: String,
        required: true,
        unique: true,
        match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        lowercase: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    bio: {
        type: String,
        maxlength: 200,
        default: 'Welcome to my profile!'
    },
    profilePicture: {
        type: String,
        default: 'https://i.postimg.cc/909hW22m/my-pfp.gif'
    },
    theme: {
        type: String,
        enum: ['dark', 'light', 'purple'],
        default: 'dark'
    },
    socialLinks: {
        discord: String,
        twitter: String,
        github: String,
        website: String
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    profileViews: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastLogin: {
        type: Date,
        default: Date.now
    }
});

userSchema.index({ username: 1 });
userSchema.index({ email: 1 });

module.exports = mongoose.model('User', userSchema);