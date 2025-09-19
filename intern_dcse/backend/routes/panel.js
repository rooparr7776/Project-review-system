const express = require('express');
const router = express.Router();
const panelController = require('../controllers/panelController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const attendanceController = require('../controllers/attendanceController');

// Admin-only routes for panel management
router.get('/', auth, authorize(['admin']), panelController.getAllPanels);
router.post('/', auth, authorize(['admin']), panelController.createPanel);
router.put('/:id', auth, authorize(['admin']), panelController.updatePanel);
router.delete('/:id', auth, authorize(['admin']), panelController.deletePanel);

// Panel member routes (allow external to view assigned teams of their panels too)
router.get('/assigned-teams', auth, authorize(['panel', 'external']), panelController.getAssignedTeamsForPanel);

// Review schedules for panel members
router.get('/review-schedules', auth, authorize(['panel', 'external']), panelController.getPanelReviewSchedules);
router.get('/review-schedules/viva', auth, authorize(['external', 'panel']), panelController.getVivaSchedulesForExternal);

// Availability routes for panel members
router.get('/availability', auth, authorize(['panel']), panelController.getPanelAvailability);
router.post('/availability', auth, authorize(['panel']), panelController.submitPanelAvailability);

// New route for fetching public review period dates
router.get('/review-period-dates', auth, panelController.getReviewPeriodDatesPublic);

// New route for submitting marks
router.post('/marks', auth, authorize(['panel']), panelController.submitMarks);
router.post('/marks/viva', auth, authorize(['external', 'panel']), panelController.submitVivaMarksExternal);

// New route for getting marks
router.get('/marks', auth, authorize(['panel']), panelController.getMarks);

// Coordinator scheduling routes
router.post('/coordinator/generate-slots', auth, authorize(['coordinator']), panelController.generateSlotsForCoordinator);
router.post('/coordinator/assign-slots', auth, authorize(['coordinator']), panelController.assignSlotsForCoordinator);
router.get('/coordinator/allotted-schedules', auth, authorize(['coordinator']), panelController.getAllottedSchedulesForCoordinator);

// New route for checking attendance
router.post('/attendance/check', auth, attendanceController.checkAttendanceForTeams);

// New route for checking schedule existence
router.post('/check-schedule-exists', auth, attendanceController.checkPreviousScheduleExists);

module.exports = router; 