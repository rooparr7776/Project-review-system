const express = require('express');
const router = express.Router();
const panelAssignmentController = require('../controllers/panelAssignmentController');
const auth = require('../middleware/auth');

// Get all panel assignments
router.get('/', auth, panelAssignmentController.getAllAssignments);

// Get all panels and teams for assignment
router.get('/panels-teams', auth, panelAssignmentController.getPanelsAndTeams);

// Create panel assignments
router.post('/', auth, panelAssignmentController.createAssignments);

module.exports = router; 