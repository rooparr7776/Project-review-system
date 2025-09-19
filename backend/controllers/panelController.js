const Panel = require('../models/Panel');
const User = require('../models/User');
const TimeTable = require('../models/TimeTable');
const Attendance = require('../models/Attendance');
const Team = require('../models/Team');
const Availability = require('../models/Availability');
const Config = require('../models/Config');
const Mark = require('../models/Mark');

// Get all panels
exports.getAllPanels = async (req, res) => {
    try {
        // Populate members to get user details including username, role, and memberType
        const panels = await Panel.find()
            .populate({
                path: 'members',
                select: 'username role memberType name' // Added 'name' here
            })
            .populate({
                path: 'coordinator',
                select: 'username name'
            });
        res.json(panels);
    } catch (error) {
        console.error('Error fetching panels:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Create a new panel
exports.createPanel = async (req, res) => {
    try {
        const { members, coordinator } = req.body;
        console.log('Received members for createPanel:', members);
        console.log('Received coordinator for createPanel:', coordinator);

        // Validate members: must have at least one member
        if (!members || members.length === 0) {
            return res.status(400).json({ message: 'Panel must have at least one member.' });
        }
        if (!coordinator) {
            return res.status(400).json({ message: 'Panel must have a coordinator.' });
        }
        // Validate for only one external member
        const memberDetails = await User.find({ '_id': { $in: members } });
        const externalMembers = memberDetails.filter(m => m.memberType === 'external');
        if (externalMembers.length > 1) {
            return res.status(400).json({ message: 'A panel can have at most one external member.' });
        }
        // Coordinator must not be in members
        if (members.includes(coordinator)) {
            return res.status(400).json({ message: 'Coordinator cannot be a panel member.' });
        }
        
        // Validate that coordinator is internal faculty
        const coordinatorDetails = await User.findById(coordinator);
        if (!coordinatorDetails || coordinatorDetails.memberType !== 'internal') {
            return res.status(400).json({ message: 'Coordinator must be an internal faculty member.' });
        }
        // Generate panel name based on current count
        const panelCount = await Panel.countDocuments({});
        const newPanelName = `Panel ${panelCount + 1}`;
        const newPanel = new Panel({
            name: newPanelName,
            members,
            coordinator
        });
        await newPanel.save();
        res.status(201).json({ message: 'Panel created successfully!', panel: newPanel });
    } catch (error) {
        console.error('Error creating panel:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Update an existing panel
exports.updatePanel = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, members, coordinator } = req.body;
        console.log('Received members for updatePanel:', members);
        console.log('Received coordinator for updatePanel:', coordinator);
        // if members are being updated, validate them
        if (members) {
            const memberDetails = await User.find({ '_id': { $in: members } });
            const externalMembers = memberDetails.filter(m => m.memberType === 'external');
            if (externalMembers.length > 1) {
                return res.status(400).json({ message: 'A panel can have at most one external member.' });
            }
        }
        // Coordinator must not be in members
        if (coordinator && members && members.includes(coordinator)) {
            return res.status(400).json({ message: 'Coordinator cannot be a panel member.' });
        }
        const panel = await Panel.findById(id);
        if (!panel) {
            return res.status(404).json({ message: 'Panel not found.' });
        }
        if (members !== undefined) {
            panel.members = members;
        }
        if (coordinator !== undefined) {
            panel.coordinator = coordinator;
        }
        await panel.save();
        res.json({ message: 'Panel updated successfully!', panel });
    } catch (error) {
        console.error('Error updating panel:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Delete a panel
exports.deletePanel = async (req, res) => {
    try {
        const { id } = req.params;

        const panel = await Panel.findById(id);
        if (!panel) {
            return res.status(404).json({ message: 'Panel not found.' });
        }

        await Panel.deleteOne({ _id: id }); // Use deleteOne or findByIdAndDelete
        res.json({ message: 'Panel deleted successfully!' });
    } catch (error) {
        console.error('Error deleting panel:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get review schedules for the logged-in user (panel member or guide)
exports.getPanelReviewSchedules = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        const rolesArray = Array.isArray(req.user.roles) ? req.user.roles.map(r => (typeof r === 'string' ? r : r.role)).filter(Boolean) : [];
        console.log('Review schedules - User ID:', userId, 'Role:', userRole);

        let reviewSchedules = [];

        // Prefer panel schedules if the user has panel role, even if primary token role is guide
        if (userRole === 'panel' || rolesArray.includes('panel')) {
            // For panel members, find review schedules for their panels
            console.log('User has panel role, finding review schedules for their panels');

            // Find the panel(s) the current user is a member of
            const panels = await Panel.find({ members: userId });

            if (panels.length === 0) {
                console.log('No panels found for panel member');
                return res.json([]);
            }

            const panelIds = panels.map(panel => panel._id);

            // Find TimeTables where the panel is one of the panels the user belongs to
            reviewSchedules = await TimeTable.find({
                panel: { $in: panelIds },
                status: 'scheduled',
                isNotified: true
            })
            .populate({
                path: 'panel',
                select: 'name members',
                model: 'Panel'
            })
            .populate({
                path: 'team',
                select: 'teamName teamLeader members',
                populate: [
                    { path: 'teamLeader', select: 'name username' },
                    { path: 'members', select: 'name username' }
                ]
            });
            
            console.log('Found review schedules for panel member:', reviewSchedules.length);
            // If external member, restrict to viva only
            if (req.user.memberType === 'external') {
                reviewSchedules = reviewSchedules.filter(s => s.slotType === 'viva');
            }
        } else if (userRole === 'guide' || rolesArray.includes('guide')) {
            // For guides, find review schedules for teams where they are the guide
            console.log('User is a guide, finding review schedules for their teams');
            const Team = require('../models/Team');
            const teams = await Team.find({ guidePreference: userId }).select('_id');
            const teamIds = teams.map(team => team._id);
            
            if (teamIds.length === 0) {
                console.log('No teams found for guide');
                return res.json([]);
            }

            reviewSchedules = await TimeTable.find({
                team: { $in: teamIds },
                status: 'scheduled',
                isNotified: true
            })
            .populate({
                path: 'panel',
                select: 'name members',
                model: 'Panel'
            })
            .populate({
                path: 'team',
                select: 'teamName teamLeader members',
                populate: [
                    { path: 'teamLeader', select: 'name username' },
                    { path: 'members', select: 'name username' }
                ]
            });
            
            console.log('Found review schedules for guide:', reviewSchedules.length);
        } else {
            console.log('User role not supported for review schedules:', userRole);
            return res.status(403).json({ message: 'Access denied for this role' });
        }

        res.json(reviewSchedules);
    } catch (error) {
        console.error('Error fetching panel review schedules:', error);
        res.status(500).json({ message: 'Error fetching panel review schedules', error: error.message });
    }
};

// Get teams assigned to the logged-in user (panel member or guide)
exports.getAssignedTeamsForPanel = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        const rolesArray = Array.isArray(req.user.roles) ? req.user.roles.map(r => (typeof r === 'string' ? r : r.role)).filter(Boolean) : [];
        console.log('User ID:', userId, 'Role:', userRole, 'Roles array:', rolesArray);

        let assignedTeams = [];

        if (userRole === 'panel' || rolesArray.includes('panel')) {
            // For panel members, find teams assigned to their panels using Team.panel for source of truth
            console.log('User is a panel member, finding teams assigned to their panels');
            const panels = await Panel.find({ members: userId });
            console.log('Found panels for user:', panels.length);

            if (panels.length === 0) {
                console.log('No panels found for user');
                return res.json([]);
            }

            const panelIds = panels.map(panel => panel._id);
            console.log('Panel IDs:', panelIds);

            const teams = await Team.find({ panel: { $in: panelIds } })
                .populate('teamLeader', 'username name')
                .populate('members', 'username name')
                .populate('guidePreference', 'username name')
                .populate('panel', 'name');

            const panelIdToName = new Map(panels.map(p => [p._id.toString(), p.name]));
            assignedTeams = teams.map(team => ({
                ...team.toObject(),
                panelName: panelIdToName.get(team.panel?._id?.toString() || team.panel?.toString() || '') || 'Panel'
            }));
        } else if (userRole === 'coordinator' || rolesArray.includes('coordinator')) {
            // For coordinators, find teams assigned to their coordinated panel
            console.log('User is a coordinator, finding teams for their panel');
            const panel = await Panel.findOne({ coordinator: userId });
            if (!panel) {
                console.log('No panel found for coordinator');
                return res.json([]);
            }
            const teams = await Team.find({ panel: panel._id })
                .populate('teamLeader', 'username name')
                .populate('members', 'username name')
                .populate('guidePreference', 'username name')
                .populate('panel', 'name');
            assignedTeams = teams.map(team => ({
                ...team.toObject(),
                panelName: panel.name
            }));
        } else if (userRole === 'guide' || rolesArray.includes('guide')) {
            // For guides, find teams where they are the guide
            console.log('User is a guide, finding teams where they are the guide');
            const Team = require('../models/Team');
            const teams = await Team.find({ guidePreference: userId })
                .populate('teamLeader', 'username name')
                .populate('members', 'username name')
                .populate('guidePreference', 'username name')
                .populate('panel', 'name');
            
            assignedTeams = teams.map(team => ({
                ...team.toObject(),
                panelName: 'Guide Assignment'
            }));
            console.log('Found teams for guide:', assignedTeams.length);
        } else {
            console.log('User role not supported:', userRole);
            return res.status(403).json({ message: 'Access denied for this role' });
        }

        // Fallback: if no teams resolved but client session indicates a team context
        if (assignedTeams.length === 0 && req.user.team) {
            try {
                const team = await Team.findById(req.user.team)
                    .populate('teamLeader', 'username name')
                    .populate('members', 'username name')
                    .populate('guidePreference', 'username name')
                    .populate('panel', 'name members coordinator');
                if (team) {
                    // Ensure the current user is allowed to see this team as panel member or coordinator
                    const isPanelMember = team.panel && Array.isArray(team.panel.members) && team.panel.members.some(m => m._id?.toString() === userId.toString());
                    const isCoordinator = team.panel && team.panel.coordinator && team.panel.coordinator.toString() === userId.toString();
                    if (isPanelMember || isCoordinator) {
                        assignedTeams = [{
                            ...team.toObject(),
                            panelName: team.panel?.name || 'Panel'
                        }];
                    }
                }
            } catch (e) {
                console.warn('Fallback team resolution failed:', e.message);
            }
        }

        console.log('Total assigned teams:', assignedTeams.length);
        res.json(assignedTeams);
    } catch (error) {
        console.error('Error fetching assigned teams for panel:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Debug helper to see what the server resolves for the current user
exports.debugAssignedData = async (req, res) => {
    try {
        const userId = req.user.id;
        const rolesArray = Array.isArray(req.user.roles) ? req.user.roles : [];
        const panelsAsMember = await Panel.find({ members: userId }).select('_id name');
        const panelAsCoordinator = await Panel.findOne({ coordinator: userId }).select('_id name');
        const teamByGuide = await Team.find({ guidePreference: userId }).select('_id teamName panel');
        const teamByPanels = await Team.find({ panel: { $in: panelsAsMember.map(p => p._id) } }).select('_id teamName panel');
        const teamByCoordinator = panelAsCoordinator ? await Team.find({ panel: panelAsCoordinator._id }).select('_id teamName panel') : [];
        res.json({
            user: { id: userId, role: req.user.role, roles: rolesArray },
            panelsAsMember,
            panelAsCoordinator,
            teamByGuide,
            teamByPanels,
            teamByCoordinator
        });
    } catch (e) {
        res.status(500).json({ message: 'debug failed', error: e.message });
    }
};

// Get panel member's availability
exports.getPanelAvailability = async (req, res) => {
    try {
        const panelMemberId = req.user.id;
        let availability = await Availability.findOne({ user: panelMemberId, userRole: 'panel' });

        if (!availability) {
            // If no availability document exists, return the review period dates from the user's profile
            return res.json({
                availableSlots: [],
                reviewPeriodStartDate: req.user.reviewPeriodStartDate || null,
                reviewPeriodEndDate: req.user.reviewPeriodEndDate || null,
            });
        }
        res.json(availability);
    } catch (error) {
        console.error('Error fetching panel member availability:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.submitPanelAvailability = async (req, res) => {
    try {
        const panelMemberId = req.user.id;
        const { availableSlots } = req.body;

        console.log('Debug: req.user.reviewPeriodStartDate', req.user.reviewPeriodStartDate);
        console.log('Debug: req.user.reviewPeriodEndDate', req.user.reviewPeriodEndDate);

        // Ensure review period dates are present in req.user
        if (!req.user.reviewPeriodStartDate || !req.user.reviewPeriodEndDate) {
            return res.status(400).json({
                message: 'Global review period not set by admin. Please ask an admin to set it.'
            });
        }

        // Validate availableSlots array structure if needed
        if (!Array.isArray(availableSlots)) {
            return res.status(400).json({ message: 'Available slots must be an array.' });
        }

        let availability = await Availability.findOne({ user: panelMemberId, userRole: 'panel' });

        if (!availability) {
            availability = new Availability({
                user: panelMemberId,
                userRole: 'panel',
                availableSlots: availableSlots,
                reviewPeriodStartDate: req.user.reviewPeriodStartDate,
                reviewPeriodEndDate: req.user.reviewPeriodEndDate
            });
        } else {
            availability.availableSlots = availableSlots;
            availability.reviewPeriodStartDate = req.user.reviewPeriodStartDate;
            availability.reviewPeriodEndDate = req.user.reviewPeriodEndDate;
        }

        await availability.save();
        res.json({ message: 'Availability submitted successfully!', availability });

    } catch (error) {
        console.error('Error submitting panel member availability:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get global review period dates for public view
exports.getReviewPeriodDatesPublic = async (req, res) => {
    try {
        const config = await Config.findOne();
        if (!config) {
            return res.status(404).json({ message: 'Configuration not found' });
        }
        res.json({
            startDate: config.reviewPeriodStartDate,
            endDate: config.reviewPeriodEndDate,
        });
    } catch (error) {
        console.error('Error fetching public review period dates:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Submit marks for a team (Panel)
exports.submitMarks = async (req, res) => {
    try {
        const { teamId, studentId, mark1, mark2, mark3, mark4, slotType } = req.body;

        // Validate slotType
        const validSlotTypes = ['review1', 'review2', 'review3', 'viva'];
        if (!slotType || !validSlotTypes.includes(slotType)) {
            return res.status(400).json({ message: 'Invalid or missing slotType. Expected one of review1, review2, review3, viva.' });
        }

        // External examiners can only mark Viva
        if (req.user.memberType === 'external' && slotType !== 'viva') {
            return res.status(403).json({ message: 'External panel members can only mark Viva.' });
        }
        const panelMemberId = req.user.id;

        const totalMarks = mark1 + mark2 + mark3 + mark4;
        const percentage = (totalMarks / 40) * 100;

        const panels = await Panel.find({ members: panelMemberId });
        if (panels.length === 0) {
            return res.status(403).json({ message: 'Unauthorized: Panel member not associated with any panel.' });
        }
        const panelIds = panels.map(p => p._id);

        const team = await Team.findOne({ _id: teamId, panel: { $in: panelIds } });
        if (!team) {
            return res.status(403).json({ message: 'Unauthorized: Team not assigned to your panel.' });
        }

        // Check if student is either a team member or the team leader
        const isTeamMember = Array.isArray(team.members) && team.members.some(m => m && m.toString() === String(studentId));
        const isTeamLeader = team.teamLeader && team.teamLeader.toString() === String(studentId);
        
        if (!isTeamMember && !isTeamLeader) {
            return res.status(400).json({ message: 'Student is not a member of this team.' });
        }

        const mark = await Mark.findOneAndUpdate(
            { student: studentId, team: teamId, markedBy: panelMemberId, slotType },
            {
                mark1,
                mark2,
                mark3,
                mark4,
                totalMarks: totalMarks,
                percentage: percentage,
                role: 'panel',
                slotType
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        res.json({ message: 'Marks submitted successfully', mark });
    } catch (error) {
        console.error('Error submitting marks:', error);
        res.status(500).json({ message: 'Failed to submit marks' });
    }
};

// Get marks for teams assigned to the panel
exports.getMarks = async (req, res) => {
    try {
        const panelMemberId = req.user.id;

        const panels = await Panel.find({ members: panelMemberId });
        if (panels.length === 0) {
            return res.json({});
        }
        const panelIds = panels.map(p => p._id);

        const assignedTeams = await Team.find({ panel: { $in: panelIds } }).select('_id');
        const teamIds = assignedTeams.map(team => team._id);

        const marks = await Mark.find({ team: { $in: teamIds }, markedBy: panelMemberId });

        const formattedMarks = {};
        marks.forEach(mark => {
            if (mark.student && mark.slotType) {
                const studentId = mark.student.toString();
                if (!formattedMarks[studentId]) formattedMarks[studentId] = {};
                formattedMarks[studentId][mark.slotType] = {
                    mark1: mark.mark1,
                    mark2: mark.mark2,
                    mark3: mark.mark3,
                    mark4: mark.mark4,
                    totalMarks: mark.totalMarks,
                    percentage: mark.percentage,
                };
            }
        });

        res.json(formattedMarks);
    } catch (error) {
        console.error('Error fetching marks:', error);
        res.status(500).json({ message: 'Failed to fetch marks' });
    }
};

// Coordinator: Generate slots for review scheduling
exports.generateSlotsForCoordinator = async (req, res) => {
    try {
        const { slotType, date, startTime, endTime, duration, forenoonOrAfternoon } = req.body;
        // slotType: 'review1', 'review2', etc.
        // date: 'YYYY-MM-DD', startTime/endTime: 'HH:mm' (24h)
        // duration: in minutes
        // forenoonOrAfternoon: 'forenoon' | 'afternoon' (for info only)

        console.log('🔍 Coordinator slot generation request:', {
            coordinatorId: req.user.id,
            slotType,
            date,
            startTime,
            endTime,
            duration
        });

        // Find the coordinator's panel
        const coordinatorId = req.user.id;
        const panel = await Panel.findOne({ coordinator: coordinatorId });
        if (!panel) {
            console.log('❌ No panel found for coordinator:', coordinatorId);
            return res.status(404).json({ message: 'No panel found for this coordinator. Please ensure you are assigned as a coordinator to a panel.' });
        }
        
        console.log('✅ Found panel for coordinator:', panel._id, panel.name);
        
        // Get all teams for this panel
        const teams = await Team.find({ panel: panel._id })
            .populate('teamLeader', 'username name')
            .populate('members', 'username name')
            .populate('guidePreference', 'username name');
        
        console.log('✅ Found teams for panel:', teams.length);

        // Validate review sequence
        const TimeTable = require('../models/TimeTable');
        const validationErrors = [];
        
        for (const team of teams) {
            // Check if previous reviews are scheduled
            if (slotType === 'review2') {
                const review1Exists = await TimeTable.findOne({ 
                    team: team._id, 
                    slotType: 'review1',
                    status: 'scheduled'
                });
                if (!review1Exists) {
                    validationErrors.push(`Team ${team.teamName}: Review 1 must be scheduled before Review 2`);
                }
            } else if (slotType === 'review3') {
                const review1Exists = await TimeTable.findOne({ 
                    team: team._id, 
                    slotType: 'review1',
                    status: 'scheduled'
                });
                const review2Exists = await TimeTable.findOne({ 
                    team: team._id, 
                    slotType: 'review2',
                    status: 'scheduled'
                });
                if (!review1Exists) {
                    validationErrors.push(`Team ${team.teamName}: Review 1 must be scheduled before Review 3`);
                }
                if (!review2Exists) {
                    validationErrors.push(`Team ${team.teamName}: Review 2 must be scheduled before Review 3`);
                }
            } else if (slotType === 'viva') {
                const review1Exists = await TimeTable.findOne({ 
                    team: team._id, 
                    slotType: 'review1',
                    status: 'scheduled'
                });
                const review2Exists = await TimeTable.findOne({ 
                    team: team._id, 
                    slotType: 'review2',
                    status: 'scheduled'
                });
                const review3Exists = await TimeTable.findOne({ 
                    team: team._id, 
                    slotType: 'review3',
                    status: 'scheduled'
                });
                if (!review1Exists) {
                    validationErrors.push(`Team ${team.teamName}: Review 1 must be scheduled before Viva`);
                }
                if (!review2Exists) {
                    validationErrors.push(`Team ${team.teamName}: Review 2 must be scheduled before Viva`);
                }
                if (!review3Exists) {
                    validationErrors.push(`Team ${team.teamName}: Review 3 must be scheduled before Viva`);
                }
            }
        }
        
        if (validationErrors.length > 0) {
            return res.status(400).json({ 
                message: 'Review sequence validation failed',
                errors: validationErrors
            });
        }

        // Generate slots
        const slots = [];
        const baseDate = new Date(date);
        const [startHour, startMinute] = startTime.split(':').map(Number);
        const [endHour, endMinute] = endTime.split(':').map(Number);
        let current = new Date(baseDate);
        current.setHours(startHour, startMinute, 0, 0);
        const end = new Date(baseDate);
        end.setHours(endHour, endMinute, 0, 0);
        while (current < end) {
            const slotStart = new Date(current);
            const slotEnd = new Date(current.getTime() + duration * 60000);
            if (slotEnd > end) break;
            slots.push({
                start: slotStart,
                end: slotEnd
            });
            current = slotEnd;
        }
        
        console.log('✅ Generated slots:', slots.length);
        res.json({ slots, teams });
    } catch (error) {
        console.error('Error generating slots:', error);
        res.status(500).json({ message: 'Server error generating slots' });
    }
};

// Coordinator: Assign slots to teams
exports.assignSlotsForCoordinator = async (req, res) => {
    try {
        const { slotType, assignments } = req.body;
        // assignments: [{ teamId, slot: { start, end } }]
        const coordinatorId = req.user.id;
        const panel = await Panel.findOne({ coordinator: coordinatorId });
        if (!panel) {
            return res.status(404).json({ message: 'No panel found for this coordinator.' });
        }
        
        const teamIds = assignments.map(a => a.teamId);
        const teams = await Team.find({ '_id': { $in: teamIds } }).select('_id teamName');
        const teamMap = new Map(teams.map(t => [t._id.toString(), t.teamName]));

        // Validate review sequence before creating schedules
        const TimeTable = require('../models/TimeTable');
        const validationErrors = [];
        
        for (const assign of assignments) {
            const teamId = assign.teamId;
            const teamName = teamMap.get(teamId) || 'Unknown Team';
            
            // Check if previous reviews are scheduled
            if (slotType === 'review2') {
                const review1Exists = await TimeTable.findOne({ 
                    team: teamId, 
                    slotType: 'review1',
                    status: 'scheduled'
                });
                if (!review1Exists) {
                    validationErrors.push(`Team ${teamName}: Review 1 must be scheduled before Review 2`);
                }
            } else if (slotType === 'review3') {
                const review1Exists = await TimeTable.findOne({ 
                    team: teamId, 
                    slotType: 'review1',
                    status: 'scheduled'
                });
                const review2Exists = await TimeTable.findOne({ 
                    team: teamId, 
                    slotType: 'review2',
                    status: 'scheduled'
                });
                if (!review1Exists) {
                    validationErrors.push(`Team ${teamName}: Review 1 must be scheduled before Review 3`);
                }
                if (!review2Exists) {
                    validationErrors.push(`Team ${teamName}: Review 2 must be scheduled before Review 3`);
                }
            } else if (slotType === 'viva') {
                const review1Exists = await TimeTable.findOne({ 
                    team: teamId, 
                    slotType: 'review1',
                    status: 'scheduled'
                });
                const review2Exists = await TimeTable.findOne({ 
                    team: teamId, 
                    slotType: 'review2',
                    status: 'scheduled'
                });
                const review3Exists = await TimeTable.findOne({ 
                    team: teamId, 
                    slotType: 'review3',
                    status: 'scheduled'
                });
                if (!review1Exists) {
                    validationErrors.push(`Team ${teamName}: Review 1 must be scheduled before Viva`);
                }
                if (!review2Exists) {
                    validationErrors.push(`Team ${teamName}: Review 2 must be scheduled before Viva`);
                }
                if (!review3Exists) {
                    validationErrors.push(`Team ${teamName}: Review 3 must be scheduled before Viva`);
                }
            }
        }
        
        if (validationErrors.length > 0) {
            return res.status(400).json({ 
                message: 'Review sequence validation failed',
                errors: validationErrors
            });
        }

        // Create schedules if validation passes
        for (const assign of assignments) {
            const teamName = teamMap.get(assign.teamId) || 'Unknown Team';
            await TimeTable.create({
                name: `${slotType} for ${teamName}`,
                description: `${slotType} scheduled by coordinator`,
                panel: panel._id,
                team: assign.teamId,
                startTime: assign.slot.start,
                endTime: assign.slot.end,
                duration: (new Date(assign.slot.end) - new Date(assign.slot.start)) / 60000,
                slotType,
                slotAssignedBy: coordinatorId,
                type: 'Team Review',
                status: 'scheduled',
                isNotified: true
            });
        }
        res.json({ message: 'Slots assigned successfully!' });
    } catch (error) {
        console.error('Error assigning slots:', error);
        res.status(500).json({ message: 'Server error assigning slots' });
    }
};

// Coordinator: Get all allotted schedules
exports.getAllottedSchedulesForCoordinator = async (req, res) => {
    try {
        const coordinatorId = req.user.id;
        const schedules = await TimeTable.find({ slotAssignedBy: coordinatorId })
            .populate('team', 'teamName')
            .populate({
                path: 'panel',
                select: 'name members',
                populate: {
                    path: 'members',
                    select: 'username name memberType'
                }
            });
        res.json(schedules);
    } catch (error) {
        console.error('Error fetching allotted schedules for coordinator:', error);
        res.status(500).json({ message: 'Server error fetching allotted schedules' });
    }
};