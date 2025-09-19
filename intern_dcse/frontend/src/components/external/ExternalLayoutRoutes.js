import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ExternalDashboard from './ExternalDashboard';
import ExternalAssignedTeams from './ExternalAssignedTeams';
import ExternalReviewSchedules from './ExternalReviewSchedules';
import ExternalVivaMarking from './ExternalVivaMarking';
import GuideMe from '../GuideMe';

const ExternalLayoutRoutes = () => (
    <Routes>
        <Route path="/external-dashboard" element={<ExternalDashboard />}>
            <Route path="assigned-teams" element={<ExternalAssignedTeams />} />
            <Route path="review-schedules" element={<ExternalReviewSchedules />} />
            <Route path="mark-viva" element={<ExternalVivaMarking />} />
            <Route path="guide-me" element={<GuideMe userRole="panel" />} />
        </Route>
    </Routes>
);

export default ExternalLayoutRoutes;


