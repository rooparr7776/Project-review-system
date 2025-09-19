import React, { useState, useEffect } from 'react';
import axios from 'axios';

const GuideReview = () => {
    const [reviewSchedules, setReviewSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                const schedulesRes = await axios.get('http://localhost:5000/api/guide/review-schedules', { headers: { Authorization: `Bearer ${token}` } });
                setReviewSchedules(schedulesRes.data);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching review schedules:', err);
                setError('Failed to fetch review schedules. Please try again later.');
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return <div className="text-center p-4">Loading...</div>;
    if (error) return <div className="text-red-500 text-center p-4">{error}</div>;

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Your Assigned Review Schedules</h2>
            {reviewSchedules.length === 0 ? (
                <p className="text-gray-500">No review schedules have been assigned to you yet.</p>
            ) : (
                <div className="space-y-4">
                    {reviewSchedules.map(schedule => (
                        <div key={schedule._id} className="border rounded-lg p-4 bg-gray-50 hover:shadow-lg transition-shadow">
                            <h4 className="text-lg font-semibold mb-2 text-indigo-600">{schedule.name} ({schedule.type})</h4>
                            <p className="text-sm text-gray-700">
                                <span className="font-semibold">Team:</span> {schedule.team?.teamName || 'N/A'}
                            </p>
                            <p className="text-sm text-gray-700">
                                <span className="font-semibold">Panel:</span> {schedule.panel?.name || 'N/A'}
                            </p>
                            <p className="text-sm text-gray-700">
                                <span className="font-semibold">Time:</span> {new Date(schedule.startTime).toLocaleString()} - {new Date(schedule.endTime).toLocaleString()}
                            </p>
                            <p className="text-sm text-gray-700">
                                <span className="font-semibold">Duration:</span> {schedule.duration} minutes
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default GuideReview; 