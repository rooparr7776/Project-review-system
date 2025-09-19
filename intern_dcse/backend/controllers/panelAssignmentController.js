const TeamPanelAssignment = require('../models/TeamPanelAssignment');
const Panel = require('../models/Panel');
const Team = require('../models/Team');

// Get all panel assignments
exports.getAllAssignments = async (req, res) => {
    try {
        const assignments = await TeamPanelAssignment.find()
            .populate('panel', 'name members')
            .populate({
                path: 'teams',
                populate: [
                    { path: 'members', select: 'username name' },
                    { path: 'teamLeader', select: 'username name' }
                ]
            });
        res.json(assignments);
    } catch (error) {
        console.error('Error fetching panel assignments:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get all panels and teams for assignment
exports.getPanelsAndTeams = async (req, res) => {
    try {
        // Populate members to get username, name, and memberType for display
        const panels = await Panel.find().populate('members', 'username name memberType');
        let teams = await Team.find()
            .populate('members', 'username name')
            .populate('teamLeader', 'username name')
            .populate('guidePreference', 'username name');
        
        // Only include formed teams: must have a leader and at least one member
        teams = teams.filter(team => team.teamLeader && Array.isArray(team.members) && team.members.length > 0);

        console.log('Fetched and filtered teams:', teams); // Debug log
        
        res.json({ panels, teams });
    } catch (error) {
        console.error('Error fetching panels and teams:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Create panel assignments
exports.createAssignments = async (req, res) => {
    try {
        const { assignments } = req.body; // Array of { panelId, teamIds }
        
        // Clear existing assignments
        await TeamPanelAssignment.deleteMany({});

        // Clear panel assignments from all teams first
        await Team.updateMany({}, { $unset: { panel: 1 } });
        
        // Create new assignments and update teams
        const newAssignments = await Promise.all(
            assignments.map(async ({ panelId, teamIds }) => {
                const assignment = new TeamPanelAssignment({
                    panel: panelId,
                    teams: teamIds
                });
                await assignment.save();

                // Update each team with the assigned panel
                await Team.updateMany(
                    { _id: { $in: teamIds } },
                    { $set: { panel: panelId } }
                );

                return assignment;
            })
        );
        
        res.status(201).json({ 
            message: 'Panel assignments created successfully!',
            assignments: newAssignments
        });
    } catch (error) {
        console.error('Error creating panel assignments:', error);
        res.status(500).json({ message: 'Server error' });
    }
}; 