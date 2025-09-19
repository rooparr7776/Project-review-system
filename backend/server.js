// Load environment variables
require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();

// Connect to database with default URI if MONGO_URI is not provided
const connectDB = require('./config/db');
if (!process.env.MONGO_URI) {
    process.env.MONGO_URI = 'mongodb://localhost:27017/project-review-system';
    console.log('Using default MongoDB URI: mongodb://localhost:27017/project-review-system');
}
if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'your-secret-key-here-change-in-production';
    console.log('Using default JWT_SECRET');
}
connectDB();

// Middleware
// Enable CORS for frontend dev hosts (adjust ports as needed)
// Enable CORS for frontend on ports 3001 and 3002
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
    credentials: true,
}));
app.use(express.json());

// General request logger
app.use((req, res, next) => {
    console.log(`Incoming request: ${req.method} ${req.originalUrl}`);
    next();
});

// Routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const teamRoutes = require('./routes/team');
const panelRoutes = require('./routes/panel');
const panelAssignmentRoutes = require('./routes/panelAssignment');
const guideRoutes = require('./routes/guide');
const studentRoutes = require('./routes/student');
const signatureRoutes = require('./routes/signatures');
const documentRoutes = require('./routes/simpleDocument'); // Using simple version for testing
// const internalExaminerRoutes = require('./routes/internalExaminer'); // Temporarily disabled
const externalExaminerRoutes = require('./routes/externalExaminer');

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/panels', panelRoutes);
app.use('/api/panel-assignments', panelAssignmentRoutes);
app.use('/api/guide', guideRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/signatures', signatureRoutes);
app.use('/api/documents', documentRoutes);
// app.use('/api/internal-examiner', internalExaminerRoutes); // Temporarily disabled
app.use('/api/external-examiner', externalExaminerRoutes);

// Serve static files
app.use('/uploads', express.static('uploads'));

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
    // ... existing code ...
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});