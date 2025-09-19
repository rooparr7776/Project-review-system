const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Import the User model

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here-change-in-production';

module.exports = async (req, res, next) => {
    try {
        console.log('Auth middleware - Headers:', req.headers.authorization);
        console.log('Auth middleware - JWT_SECRET being used:', JWT_SECRET);
        const token = req.header('Authorization').replace('Bearer ', '');
        console.log('Auth middleware - Token received:', token.substring(0, 20) + '...');
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('Auth middleware - Decoded token:', decoded);
        console.log('Auth middleware - Role from token:', decoded.role);
        
        // Fetch the user from the database to get all current user data, including review period dates
        const user = await User.findById(decoded.id);
        if (!user) {
            console.log('Auth middleware - User not found');
            return res.status(401).json({ message: 'User not found, authentication failed' });
        }
        
        console.log('Auth middleware - User found:', user.username);
        console.log('Auth middleware - User roles:', user.roles);

        // Attach the user object and ensure id is set correctly
        req.user = user;
        req.user.id = user._id;
        req.user.role = decoded.role; // Set the role from token
        req.user.team = decoded.team; // Set the team from token
        
        // If no specific role in token but user has faculty roles, use faculty
        if (!req.user.role && user.roles.some(r => ['guide', 'panel', 'coordinator'].includes(r.role))) {
            req.user.role = 'faculty';
            console.log('Auth middleware - Auto-assigned faculty role from user roles');
        }
        // If no specific role in token but user has coordinator roles, use coordinator
        else if (!req.user.role && user.roles.some(r => r.role === 'coordinator')) {
            req.user.role = 'coordinator';
            const coordinatorRole = user.roles.find(r => r.role === 'coordinator');
            req.user.team = coordinatorRole.team;
            console.log('Auth middleware - Auto-assigned coordinator role from user roles');
        }
        
        console.log('Auth middleware - Final req.user.role:', req.user.role);
        next();
    } catch (error) {
        console.log('Auth middleware - Error:', error.message);
        res.status(401).json({ message: 'Please authenticate' });
    }
}; 