import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminManageReviewSchedules = () => {
    const [panels, setPanels] = useState([]);
    const [teams, setTeams] = useState([]);
    const [availabilities, setAvailabilities] = useState([]);
    const [reviewPeriodStart, setReviewPeriodStart] = useState('');
    const [reviewPeriodEnd, setReviewPeriodEnd] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [schedules, setSchedules] = useState([]);
    const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false);
    const [currentReviewPeriodStart, setCurrentReviewPeriodStart] = useState('');
    const [currentReviewPeriodEnd, setCurrentReviewPeriodEnd] = useState('');
    const [showCreateSlotModal, setShowCreateSlotModal] = useState(false);
    const [selectedTeamForSlot, setSelectedTeamForSlot] = useState(null);
    const [selectedPanelForSlot, setSelectedPanelForSlot] = useState(null);
    const [notificationMessage, setNotificationMessage] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const [panelsRes, teamsRes, availabilitiesRes, schedulesRes, reviewPeriodRes] = await Promise.all([
                axios.get('/api/admin/panels-with-members', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/api/admin/teams', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/api/admin/availabilities', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/api/admin/review-schedules', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/api/admin/review-period-dates', { headers: { Authorization: `Bearer ${token}` } })
            ]);

            console.log('Raw Availabilities Data:', availabilitiesRes.data);
            console.log('Raw Teams Data:', teamsRes.data);
            console.log('Raw Panels Data:', panelsRes.data);

            setPanels(panelsRes.data);
            setTeams(teamsRes.data);
            setAvailabilities(availabilitiesRes.data);
            setSchedules(schedulesRes.data);
            setCurrentReviewPeriodStart(reviewPeriodRes.data.startDate || '');
            setCurrentReviewPeriodEnd(reviewPeriodRes.data.endDate || '');
            setLoading(false);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Failed to fetch data');
            setLoading(false);
        }
    };

    const handleSetReviewPeriod = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/admin/review-period-dates', {
                startDate: reviewPeriodStart,
                endDate: reviewPeriodEnd
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSuccessMessage('Review period set successfully!');
            fetchData();
            setReviewPeriodStart('');
            setReviewPeriodEnd('');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            console.error('Error setting review period:', err);
            setError('Failed to set review period');
        }
    };

    const handleCreateSchedule = async () => {
        setIsGeneratingSchedule(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post('/api/admin/generate-schedules', {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSuccessMessage(response.data.message);
            fetchData();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            console.error('Error generating schedules:', err);
            setError(err.response?.data?.message || 'Failed to generate schedules');
        } finally {
            setIsGeneratingSchedule(false);
        }
    };

    const handleSendNotification = async (scheduleId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post('/api/admin/send-schedule-notification', { scheduleId }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotificationMessage(response.data.message);
            fetchData(); // Refresh data to show updated notification status
            setTimeout(() => setNotificationMessage(''), 3000);
        } catch (err) {
            console.error('Error sending notification:', err);
            setNotificationMessage(err.response?.data?.message || 'Failed to send notification.');
        }
    };

    // Group availabilities by team
    const groupAvailabilitiesByTeam = () => {
        const teamGroups = {};

        // First, create entries for all teams and populate assigned guide and panel members
        teams.forEach(team => {
            console.log('Processing team:', team.teamName, 'Panel:', team.panel);
            teamGroups[team._id] = {
                teamName: team.teamName,
                teamId: team._id,
                panelId: team.panel?._id,
                guide: team.guidePreference ? { user: team.guidePreference, availableSlots: [] } : null,
                panelMembers: (() => {
                    const uniquePanelMembersMap = new Map();
                    if (team.panel && team.panel.members) {
                        team.panel.members
                            .forEach(member => {
                                if (!uniquePanelMembersMap.has(member._id.toString())) {
                                    uniquePanelMembersMap.set(member._id.toString(), {
                                        user: member,
                                        availableSlots: [],
                                        isInternal: member.memberType === 'internal'
                                    });
                                }
                            });
                    }
                    return Array.from(uniquePanelMembersMap.values());
                })()
            };
        });

        // Then, populate with submitted availabilities where available
        availabilities.forEach(availability => {
            console.log('Processing availability:', availability);
            if (!availability.user || !availability.user._id) {
                console.warn('Skipping availability record with missing user or user._id:', availability);
                return;
            }
            const userId = availability.user._id.toString();
            
            if (availability.userRole === 'panel') {
                for (const teamId in teamGroups) {
                    const panelMemberEntry = teamGroups[teamId].panelMembers.find(pm => 
                        pm.user && pm.user._id?.toString() === userId
                    );
                    if (panelMemberEntry) {
                        // Aggregate slots, then deduplicate later
                        panelMemberEntry.availableSlots.push(...availability.availableSlots.map(slot => {
                            let transformedSlot;
                            if (typeof slot === 'string') {
                                transformedSlot = { startTime: new Date(slot).toISOString(), endTime: new Date(slot).toISOString() };
                            } else if (slot.startTime && slot.endTime) {
                                transformedSlot = { startTime: new Date(slot.startTime).toISOString(), endTime: new Date(slot.endTime).toISOString() };
                            } else {
                                transformedSlot = slot; // Fallback if unexpected format
                            }
                            return transformedSlot;
                        }));
                    }
                }
            } else if (availability.userRole === 'guide') {
                for (const teamId in teamGroups) {
                    const guideEntry = teamGroups[teamId].guide;
                    if (guideEntry && guideEntry.user && guideEntry.user._id?.toString() === userId) {
                        // Aggregate slots, then deduplicate later
                        guideEntry.availableSlots.push(...availability.availableSlots.map(slot => {
                            let transformedSlot;
                            if (typeof slot === 'string') {
                                transformedSlot = { startTime: new Date(slot).toISOString(), endTime: new Date(slot).toISOString() };
                            } else if (slot.startTime && slot.endTime) {
                                transformedSlot = { startTime: new Date(slot.startTime).toISOString(), endTime: new Date(slot.endTime).toISOString() };
                            } else {
                                transformedSlot = slot; // Fallback if unexpected format
                            }
                            return transformedSlot;
                        }));
                    }
                }
            }
        });

        // Final deduplication of availableSlots for all panel members and guides
        Object.values(teamGroups).forEach(group => {
            if (group.guide && group.guide.availableSlots.length > 0) {
                const uniqueGuideSlotsMap = new Map();
                group.guide.availableSlots.forEach(slot => {
                    // Ensure slot has startTime and endTime before creating key
                    const key = slot.startTime && slot.endTime ? `${slot.startTime}-${slot.endTime}` : null;
                    if (key) {
                        uniqueGuideSlotsMap.set(key, slot);
                    }
                });
                group.guide.availableSlots = Array.from(uniqueGuideSlotsMap.values()).map(slot => ({
                    startTime: new Date(slot.startTime),
                    endTime: new Date(slot.endTime)
                }));
            }

            group.panelMembers.forEach(pm => {
                if (pm.availableSlots.length > 0) {
                    const uniquePmSlotsMap = new Map();
                    pm.availableSlots.forEach(slot => {
                        // Ensure slot has startTime and endTime before creating key
                        const key = slot.startTime && slot.endTime ? `${slot.startTime}-${slot.endTime}` : null;
                        if (key) {
                            uniquePmSlotsMap.set(key, slot);
                        }
                    });
                    pm.availableSlots = Array.from(uniquePmSlotsMap.values()).map(slot => ({
                        startTime: new Date(slot.startTime),
                        endTime: new Date(slot.endTime)
                    }));
                }
            });
        });

        console.log('Final team groups:', teamGroups);
        return Object.values(teamGroups);
    };

    const handleCreateSlotForTeam = async (teamId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post('/api/admin/generate-slot-for-team', { teamId }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSuccessMessage(response.data.message);
            fetchData(); // Refresh data to show new schedule
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            console.error('Error generating slot for team:', err);
            setError(err.response?.data?.message || 'Failed to generate slot for team');
        }
    };

    if (loading) return <div className="text-center p-4">Loading data...</div>;
    if (error) return <div className="text-red-500 p-4">{error}</div>;

    const teamGroups = groupAvailabilitiesByTeam();

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-6">Manage Review Schedules</h2>

            {/* Set Review Period Form */}
            <div className="mb-8 p-4 border rounded-lg">
                <h3 className="text-xl font-semibold mb-4">Set Review Period</h3>
                {successMessage && (
                    <div className="mb-4 p-2 bg-green-100 text-green-700 rounded">
                        {successMessage}
                    </div>
                )}
                <form onSubmit={handleSetReviewPeriod} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Start Date:</label>
                        <input
                            type="date"
                            value={reviewPeriodStart}
                            onChange={(e) => setReviewPeriodStart(e.target.value)}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">End Date:</label>
                        <input
                            type="date"
                            value={reviewPeriodEnd}
                            onChange={(e) => setReviewPeriodEnd(e.target.value)}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                        Set Review Period
                    </button>
                </form>
                {currentReviewPeriodStart && currentReviewPeriodEnd && (
                    <p className="mt-4 text-gray-700">
                        Current Global Review Period: 
                        <span className="font-medium"> {new Date(currentReviewPeriodStart).toLocaleDateString()}</span> to 
                        <span className="font-medium"> {new Date(currentReviewPeriodEnd).toLocaleDateString()}</span>
                    </p>
                )}
            </div>

            {/* Team-wise Availabilities */}
            <div className="mt-8">
                <h3 className="text-xl font-semibold mb-4">Team-wise Availabilities</h3>
                {teamGroups.map(group => (
                    <div key={group.teamId} className="mb-6 p-4 border rounded-lg">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-lg font-medium">{group.teamName}</h4>
                            <button
                                onClick={() => handleCreateSlotForTeam(group.teamId)}
                                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                            >
                                Create Slot
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="font-medium">Guide: {group.guide?.user?.name || 'Not Assigned'}</p>
                                {group.guide?.user && group.guide.availableSlots.length > 0 && (
                                    <div className="mt-2 text-sm text-gray-600">
                                        <h5 className="font-semibold">Guide Availability:</h5>
                                        <div className="space-y-1">
                                            {group.guide.availableSlots.map((slot, index) => (
                                                <div key={index} className="p-2 bg-gray-100 rounded">
                                                    {new Date(slot.startTime).toLocaleString()} to {new Date(slot.endTime).toLocaleString()}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div>
                                <p className="font-medium">Panel Members: {group.panelMembers.length}</p>
                                {group.panelMembers.length > 0 && (
                                    <div className="mt-2 text-sm text-gray-600">
                                        <h5 className="font-semibold">Panel Member Availabilities:</h5>
                                        <div className="space-y-2">
                                            {group.panelMembers.map((pm, pmIndex) => (
                                                <div key={pmIndex} className="p-2 border rounded-md bg-white">
                                                    <p className="font-medium">{pm.user?.name || 'N/A'} ({pm.isInternal ? 'Internal' : 'External'}):</p>
                                                    {pm.availableSlots.length > 0 ? (
                                                        <div className="space-y-1 mt-1">
                                                            {pm.availableSlots.map((slot, index) => (
                                                                <div key={index} className="p-2 bg-gray-100 rounded">
                                                                    {new Date(slot.startTime).toLocaleString()} to {new Date(slot.endTime).toLocaleString()}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-gray-500">No availability submitted.</p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Generated Schedules Section */}
            <div>
                <h3 className="text-xl font-semibold mb-4">Generated Schedules</h3>
                {schedules.length === 0 ? (
                    <p>No schedules generated yet. </p>
                ) : (
                    <div className="space-y-4">
                        {schedules.map((schedule) => (
                            <div key={schedule._id} className="border rounded-lg p-4 bg-gray-50">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h4 className="text-lg font-semibold">{schedule.name} ({schedule.type})</h4>
                                        <p className="text-sm text-gray-600">
                                            Team: {schedule.team?.teamName}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            Panel: {schedule.panel?.name}
                                        </p>
                                        {schedule.description && (
                                            <p className="text-sm text-gray-600">
                                                Description: {schedule.description}
                                            </p>
                                        )}
                                    </div>
                                    <span className={`px-2 py-1 rounded text-sm ${
                                        schedule.status === 'scheduled' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                        {schedule.status}
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm font-medium mb-1">Start Time:</p>
                                        <p className="text-sm">
                                            {new Date(schedule.startTime).toLocaleString()}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium mb-1">End Time:</p>
                                        <p className="text-sm">
                                            {new Date(schedule.endTime).toLocaleString()}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium mb-1">Duration:</p>
                                        <p className="text-sm">
                                            {schedule.duration} minutes
                                        </p>
                                    </div>
                                </div>
                                {!schedule.isNotified && (
                                    <button
                                        onClick={() => handleSendNotification(schedule._id)}
                                        className="mt-3 px-4 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700"
                                    >
                                        Send Notification
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminManageReviewSchedules; 