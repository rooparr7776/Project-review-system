const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Team = require('../models/Team');
const Panel = require('../models/Panel');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here-change-in-production';

// Function to get user's active roles based on team assignments
const getUserActiveRoles = async (userId) => {
    const activeRoles = [];
    
    try {
        // Check if user is assigned as a guide to any team
        const guideTeams = await Team.find({ guidePreference: userId }).select('_id');
        for (const t of guideTeams) {
            activeRoles.push({ role: 'guide', team: t._id.toString() });
        }
        
        // Check if user is a member of any panel that's assigned to teams
        const userPanels = await Panel.find({ members: userId }).select('_id');
        if (userPanels.length > 0) {
            const panelIds = userPanels.map(p => p._id);
            const teamsWithPanels = await Team.find({ panel: { $in: panelIds } }).select('_id');
            for (const t of teamsWithPanels) {
                activeRoles.push({ role: 'panel', team: t._id.toString() });
            }
        }
        
        // Check if user is assigned as coordinator to any team
        const coordinatorTeams = await Team.find({ coordinator: userId }).select('_id');
        for (const t of coordinatorTeams) {
            activeRoles.push({ role: 'coordinator', team: t._id.toString() });
        }
        
        // If no active roles found, return at least the primary role
        if (activeRoles.length === 0) {
            const user = await User.findById(userId);
            if (user && user.roles && user.roles.length > 0) {
                activeRoles.push({ role: user.roles[0].role, team: null });
            }
        }
        
        // Ensure all faculty roles are present at least once with null team
        const rolesToEnsure = ['guide', 'panel', 'coordinator'];
        const ensuredRoles = [...activeRoles];
        for (const roleName of rolesToEnsure) {
            if (!ensuredRoles.some(r => r.role === roleName)) {
                ensuredRoles.push({ role: roleName, team: null });
            }
        }
        return ensuredRoles;
    } catch (error) {
        console.error('Error getting user active roles:', error);
        // Fallback to user's potential roles if there's an error
        const user = await User.findById(userId);
        return user?.roles || [];
    }
};
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body; // Only username and password
        console.log('Login attempt:', { username }); // Debug log

        // Find user by username only
        const user = await User.findOne({ username });
        console.log('User found:', user ? 'Yes' : 'No'); // Debug log
        
        if (!user) {
            console.log('Login failed: User not found'); // Debug log
            return res.status(401).json({ 
                message: 'Invalid credentials' 
            });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        console.log('Password match:', isMatch ? 'Yes' : 'No'); // Debug log
        
        if (!isMatch) {
            console.log('Login failed: Invalid password'); // Debug log
            return res.status(401).json({ 
                message: 'Invalid credentials' 
            });
        }

        // Get the first role for the user (primary role)
        const firstRole = user.roles[0];
        if (!firstRole) {
            return res.status(403).json({ message: 'User has no assigned roles.' });
        }

        // For faculty users, include all faculty roles with team mapping (null if none)
        let activeRoles = [];
        if (['guide', 'panel', 'coordinator'].includes(firstRole.role)) {
            activeRoles = await getUserActiveRoles(user._id);
        } else {
            // For non-faculty users, use their roles as is
            activeRoles = user.roles;
        }

        // Set the primary role for the user (this will be used by the frontend)
        user.role = firstRole.role;
        await user.save();
        const token = jwt.sign(
            {
                id: user._id,
                username: user.username,
                role: firstRole.role,
                team: firstRole.team || null
            },
            JWT_SECRET,
            { expiresIn: '1d' }
        );

        console.log('Login successful for user:', username, 'as', firstRole.role); // Debug log
        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                name: user.name,
                role: firstRole.role,  // Primary role
                team: firstRole.team || null,
                memberType: user.memberType || null,
                roles: activeRoles      // Only active/assigned roles
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            message: 'Server error during login' 
        });
    }
};

exports.registerPanel = async (req, res) => {
    try {
        const { username, password, memberType } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new panel user
        const user = new User({
            username,
            password: hashedPassword,
            roles: [{ role: 'panel', team: null }],
            memberType: memberType || null
        });

        await user.save();

        res.status(201).json({ message: 'Panel member created successfully!' });
    } catch (error) {
        console.error('Error registering panel member:', error);
        res.status(500).json({ message: 'Server error during panel member registration' });
    }
};

// Get faculty (guide and panel members)
exports.getFaculty = async (req, res) => {
    try {
        const faculty = await User.find({
            'roles.role': { $in: ['guide', 'panel'] }
        }).select('username roles memberType name');

        res.json(faculty);
    } catch (error) {
        console.error('Error fetching faculty:', error);
        res.status(500).json({ message: 'Server error fetching faculty' });
    }
};

exports.getProfile = async (req, res) => {
    try {
        // req.user is populated by the auth middleware
        const user = await User.findById(req.user.id).select('-password'); // Exclude password

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ message: 'Server error fetching profile' });
    }
};

// Admin: Get all users
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password'); // Exclude password
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Server error' });
    }
}; 