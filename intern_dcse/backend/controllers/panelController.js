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

// Get review schedules for the logged-in panel member
exports.getPanelReviewSchedules = async (req, res) => {
    try {
        // Check if the logged-in user is an internal panel member
        if (req.user.role !== 'panel' || req.user.memberType !== 'internal') {
            return res.status(403).json({ message: 'Access Denied: Only internal panel members can view review schedules.' });
        }

        const panelMemberId = req.user.id;

        // Find the panel(s) the current user is a member of
        const panels = await Panel.find({ members: panelMemberId });

        if (panels.length === 0) {
            return res.json([]); // No panels found for this user
        }

        const panelIds = panels.map(panel => panel._id);

        // Find TimeTables where the panel is one of the panels the user belongs to
        // and the schedule has been notified by the admin
        const reviewSchedules = await TimeTable.find({
            panel: { $in: panelIds },
            status: 'scheduled', // Only fetch scheduled reviews for display
            isNotified: true // Only fetch schedules that have been notified by admin
        })
        .populate({
            path: 'panel',
            select: 'name members',
            model: 'Panel'
        })
        .populate({
            path: 'team', // Changed from 'teams' to 'team'
            select: 'teamName teamLeader members',
            populate: [
                { path: 'teamLeader', select: 'name username' },
                { path: 'members', select: 'name username' }
            ]
        });

        res.json(reviewSchedules);
    } catch (error) {
        console.error('Error fetching panel review schedules:', error);
        res.status(500).json({ message: 'Error fetching panel review schedules', error: error.message });
    }
};

// Get teams assigned to the logged-in panel member's panel(s)
exports.getAssignedTeamsForPanel = async (req, res) => {
    try {
        const panelMemberId = req.user.id;
        console.log('Panel member ID:', panelMemberId);

        // Find the panel(s) the current user is a member of
        const panels = await Panel.find({ members: panelMemberId });
        console.log('Found panels for user:', panels.length);

        if (panels.length === 0) {
            console.log('No panels found for user');
            return res.json([]); // No panels found for this user
        }

        const panelIds = panels.map(panel => panel._id);
        console.log('Panel IDs:', panelIds);

        // Find all team-panel assignments for these panels
        const TeamPanelAssignment = require('../models/TeamPanelAssignment');
        const assignments = await TeamPanelAssignment.find({ 
            panel: { $in: panelIds } 
        }).populate({
            path: 'teams',
            populate: [
                {
                    path: 'teamLeader',
                    select: 'username name'
                },
                {
                    path: 'members',
                    select: 'username name'
                },
                {
                    path: 'guide',
                    select: 'username name'
                }
            ]
        });

        console.log('Found assignments:', assignments.length);

        // Extract teams from assignments
        const assignedTeams = assignments.flatMap(assignment => 
            assignment.teams.map(team => ({
                ...team.toObject(),
                panelName: panels.find(p => p._id.toString() === assignment.panel.toString())?.name
            }))
        );

        console.log('Total assigned teams:', assignedTeams.length);
        res.json(assignedTeams);
    } catch (error) {
        console.error('Error fetching assigned teams for panel:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
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

// External member: Get viva-only schedules for panels the user belongs to
exports.getVivaSchedulesForExternal = async (req, res) => {
    try {
        const userId = req.user.id;
        const panels = await Panel.find({ members: userId });
        if (panels.length === 0) return res.json([]);
        const panelIds = panels.map(p => p._id);

        const query = {
            panel: { $in: panelIds },
            status: 'scheduled',
            isNotified: true,
            $or: [
                { type: /viva/i },
                { slotType: /viva/i },
                { name: /viva/i }
            ]
        };

        const vivaSchedules = await TimeTable.find(query)
            .populate({ path: 'panel', select: 'name members', model: 'Panel' })
            .populate({
                path: 'team',
                select: 'teamName teamLeader members',
                populate: [
                    { path: 'teamLeader', select: 'name username' },
                    { path: 'members', select: 'name username' }
                ]
            });
        res.json(vivaSchedules);
    } catch (error) {
        console.error('Error fetching viva schedules for external:', error);
        res.status(500).json({ message: 'Error fetching viva schedules', error: error.message });
    }
};

// Submit marks for a team (Panel)
exports.submitMarks = async (req, res) => {
    try {
        const { teamId, studentId, mark1, mark2, mark3, mark4 } = req.body;
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

        if (!team.members.includes(studentId)) {
            return res.status(400).json({ message: 'Student is not a member of this team.' });
        }

        const mark = await Mark.findOneAndUpdate(
            { student: studentId, team: teamId, markedBy: panelMemberId },
            {
                mark1,
                mark2,
                mark3,
                mark4,
                totalMarks: totalMarks,
                percentage: percentage,
                role: 'panel'
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        res.json({ message: 'Marks submitted successfully', mark });
    } catch (error) {
        console.error('Error submitting marks:', error);
        res.status(500).json({ message: 'Failed to submit marks' });
    }
};

// External member: Submit viva mark (0-100). Stored scaled to 40 in Mark model
exports.submitVivaMarksExternal = async (req, res) => {
    try {
        const { teamId, studentId, viva } = req.body;
        const externalUserId = req.user.id;

        const panels = await Panel.find({ members: externalUserId });
        if (panels.length === 0) {
            return res.status(403).json({ message: 'Unauthorized: Not associated with any panel.' });
        }
        const panelIds = panels.map(p => p._id);

        const team = await Team.findOne({ _id: teamId, panel: { $in: panelIds } });
        if (!team) {
            return res.status(403).json({ message: 'Unauthorized: Team not assigned to your panel.' });
        }
        if (!team.members.includes(studentId)) {
            return res.status(400).json({ message: 'Student is not a member of this team.' });
        }

        const vivaScore = Math.max(0, Math.min(100, Number.isFinite(viva) ? viva : 0));
        // Scale 0-100 viva to 0-40 to fit existing Mark model
        const scaled = Math.round(vivaScore * 0.4);

        const mark = await Mark.findOneAndUpdate(
            { student: studentId, team: teamId, markedBy: externalUserId },
            {
                mark1: scaled,
                mark2: 0,
                mark3: 0,
                mark4: 0,
                totalMarks: scaled,
                percentage: (scaled / 40) * 100,
                role: 'panel'
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        res.json({ message: 'Viva mark submitted successfully', mark });
    } catch (error) {
        console.error('Error submitting viva mark (external):', error);
        res.status(500).json({ message: 'Failed to submit viva mark' });
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
            if (mark.student) {
                const studentId = mark.student.toString();
                formattedMarks[studentId] = {
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

        // Find the coordinator's panel
        const coordinatorId = req.user.id;
        const panel = await Panel.findOne({ coordinator: coordinatorId });
        if (!panel) {
            return res.status(404).json({ message: 'No panel found for this coordinator.' });
        }
        // Get all teams for this panel
        const teams = await Team.find({ panel: panel._id });

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