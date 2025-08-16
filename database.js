const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // For local MongoDB:
        await mongoose.connect('mongodb://localhost:27017/brooksh', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        // Or for MongoDB Atlas, replace with your connection string:
        // await mongoose.connect('mongodb+srv://username:password@cluster.mongodb.net/brooksh', {
        //     useNewUrlParser: true,
        //     useUnifiedTopology: true
        // });
        
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

connectDB();

module.exports = mongoose;