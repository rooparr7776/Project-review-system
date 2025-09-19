import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PanelReviewSchedules = () => {
    const [user, setUser] = useState(null);
    const [reviewSchedules, setReviewSchedules] = useState([]);
    const [reviewPeriodStartDate, setReviewPeriodStartDate] = useState('');
    const [reviewPeriodEndDate, setReviewPeriodEndDate] = useState('');
    const [availableSlots, setAvailableSlots] = useState([]);
    const [newSlotStartTime, setNewSlotStartTime] = useState('');
    const [newSlotEndTime, setNewSlotEndTime] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const [schedulesRes, userRes, availabilityRes] = await Promise.all([
                axios.get('/api/panels/review-schedules', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/api/auth/profile', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/api/panels/availability', { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setReviewSchedules(schedulesRes.data);
            setReviewPeriodStartDate(userRes.data.reviewPeriodStartDate || '');
            setReviewPeriodEndDate(userRes.data.reviewPeriodEndDate || '');
            setAvailableSlots(availabilityRes.data.availableSlots || []);
            setLoading(false);
        } catch (err) {
            const status = err.response?.status;
            if (status === 401 || status === 403) {
                setReviewSchedules([]);
                setAvailableSlots([]);
                setError('');
            } else {
                console.error('Error fetching data:', err);
                setError('Failed to fetch data');
            }
            setLoading(false);
        }
    };

    const handleAddSlot = () => {
        if (newSlotStartTime && newSlotEndTime) {
            const newStart = new Date(newSlotStartTime);
            const newEnd = new Date(newSlotEndTime);
            const periodStart = new Date(reviewPeriodStartDate);
            const periodEnd = new Date(reviewPeriodEndDate);

            if (newStart < periodStart || newEnd > periodEnd || newStart >= newEnd) {
                alert('Availability slot must be within the global review period and start time must be before end time.');
                return;
            }
            setAvailableSlots([...availableSlots, { startTime: newStart, endTime: newEnd }]);
            setNewSlotStartTime('');
            setNewSlotEndTime('');
        }
    };

    const handleRemoveSlot = (index) => {
        setAvailableSlots(availableSlots.filter((_, i) => i !== index));
    };

    const handleSubmitAvailability = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/panels/availability', { availableSlots }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSuccessMessage('Availability submitted successfully!');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            console.error('Error submitting availability:', err);
            setError('Failed to submit availability');
        }
    };

    if (loading) return <div className="text-center p-4">Loading review schedules...</div>;
    if (error) return <div className="text-red-500 p-4">{error}</div>;

    if (user && (user.role !== 'panel' || user.memberType !== 'internal')) {
        return (
            <div className="bg-white p-6 rounded-lg shadow text-center">
                <h2 className="text-2xl font-bold mb-4">Unauthorized Access</h2>
                <p className="text-red-500">You do not have permission to view this page.</p>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-6">Panel Review Schedules</h2>
            {/* Panel Assigned Review Schedules Section */}
            <h3 className="text-xl font-semibold mb-4">Your Assigned Review Schedules</h3>
            {reviewSchedules.length === 0 ? (
                <p>No review schedules assigned to your panel yet.</p>
            ) : (
                <div className="space-y-4">
                    {reviewSchedules.map(schedule => (
                        <div key={schedule._id} className="border rounded-lg p-4 bg-gray-50">
                            <h4 className="text-lg font-semibold mb-2">Review: {schedule.name} ({schedule.type})</h4>
                            <p className="text-sm text-gray-600">Team: {schedule.team?.teamName || 'N/A'}</p>
                            <p className="text-sm text-gray-600">Panel: {schedule.panel?.name || 'N/A'}</p>
                            <p className="text-sm text-gray-600">
                                <span className="font-medium">Time:</span> {new Date(schedule.startTime).toLocaleString()} - {new Date(schedule.endTime).toLocaleString()}
                            </p>
                            <p className="text-sm text-gray-600">
                                <span className="font-medium">Duration:</span> {schedule.duration} minutes
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PanelReviewSchedules; 