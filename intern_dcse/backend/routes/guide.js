const express = require('express');
const router = express.Router();
const guideController = require('../controllers/guideController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

// Guide-specific routes
router.get('/team-requests', auth, authorize(['guide']), guideController.getGuideRequests);
router.post('/team-requests/accept', auth, authorize(['guide']), guideController.acceptRequest);
router.post('/team-requests/reject', auth, authorize(['guide']), guideController.rejectRequest);

// Review functionality routes
router.get('/approved-teams', auth, authorize(['guide']), guideController.getApprovedTeams);
router.post('/request-timetable', auth, authorize(['guide']), guideController.requestTimeTable);

// Availability routes
router.get('/availability', auth, authorize(['guide']), guideController.getGuideAvailability);
router.post('/availability', auth, authorize(['guide']), guideController.submitGuideAvailability);

// New route to get review schedules for a guide
router.get('/review-schedules', auth, authorize(['guide']), guideController.getGuideReviewSchedules);

// New route for fetching public guide selection dates
router.get('/selection-dates', auth, guideController.getGuideSelectionDatesPublic);

// New route for getting assigned teams
router.get('/assigned-teams', auth, guideController.getAssignedTeams);

// New route for getting review period dates
router.get('/review-period-dates', auth, guideController.getReviewPeriodDatesPublic);

// New route for getting daily attendance
router.get('/daily-attendance', auth, guideController.getDailyAttendance);

// New route for uploading attendance
router.post('/upload-attendance', auth, guideController.uploadAttendance);

// New route for submitting marks
router.post('/marks', auth, authorize(['guide']), guideController.submitMarks);

// New route for getting marks
router.get('/marks', auth, authorize(['guide']), guideController.getMarks);

// Final report routes
router.get('/reports', auth, authorize(['guide']), guideController.getReportsForGuide);
router.put('/reports/:reportId/approve', auth, authorize(['guide']), guideController.approveReport);
router.get('/reports/:reportId/download', auth, authorize(['guide']), guideController.downloadReport);

module.exports = router; 