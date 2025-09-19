const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const Config = require('../models/Config');

// Catch-all logger for team routes
router.use((req, res, next) => {
    console.log(`Team Router: Request received for ${req.originalUrl}`);
    next();
});

router.get('/available-students', auth, teamController.getAvailableStudents);
router.get('/guides', auth, teamController.getGuides);
router.post('/create', auth, teamController.createTeam);
router.get('/my-team', auth, teamController.getUserTeam);
router.get('/my-assigned-panel', auth, teamController.getAssignedPanel);
router.post('/request-guide', auth, teamController.requestGuide);
router.delete('/my-team', auth, teamController.deleteMyTeam);

router.post('/report/upload', auth, upload, teamController.uploadReport);
router.get('/report/status', auth, teamController.getReportStatus);

// New route for fetching max team size for public (student) view
router.get('/max-team-size', auth, teamController.getMaxTeamSizePublic);

// Public route to get config (teamFormationOpen, etc.)
router.get('/config/public', async (req, res) => {
    try {
        const config = await Config.findOne();
        res.json({
            teamFormationOpen: config ? config.teamFormationOpen : true,
            maxTeamSize: config ? config.maxTeamSize : 4
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching config' });
    }
});

module.exports = router; 