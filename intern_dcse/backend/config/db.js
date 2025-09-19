const mongoose = require('mongoose');

// Load env vars from current directory's .env file
require('dotenv').config();

const connectDB = async () => {
    try {
        console.log('MONGO_URI:', process.env.MONGO_URI);
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000, // 5 seconds timeout
            socketTimeoutMS: 45000 // 45 seconds
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error('MongoDB Connection Error:', error.message);
        if (process.env.MONGO_URI) {
            console.error('Connection String:', process.env.MONGO_URI.replace(/:[^:@]+@/, ':****@')); // Hide password in logs
        } else {
            console.error('MONGO_URI environment variable is not set');
        }
        console.error('Please check your internet connection and MongoDB Atlas cluster status');
        process.exit(1);
    }
};

module.exports = connectDB; 