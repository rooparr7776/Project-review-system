import React, { useEffect, useState } from 'react';
import axios from 'axios';

const ExternalReviewSchedules = () => {
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchSchedules = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get('/api/panels/review-schedules/viva', { headers: { Authorization: `Bearer ${token}` } });
                setSchedules(res.data || []);
                setError('');
            } catch (err) {
                const status = err.response?.status;
                if (status === 401 || status === 403) {
                    setSchedules([]);
                    setError('');
                } else {
                    setError('Failed to fetch schedules');
                }
            } finally {
                setLoading(false);
            }
        };
        fetchSchedules();
    }, []);

    if (loading) return <div className="p-4">Loading...</div>;
    if (error) return <div className="p-4 text-red-600">{error}</div>;

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-6">Viva Schedules</h2>
            {schedules.length === 0 ? (
                <p>No viva schedules available.</p>
            ) : (
                <div className="space-y-4">
                    {schedules.map(s => (
                        <div key={s._id} className="border rounded-lg p-4 bg-gray-50">
                            <h4 className="text-lg font-semibold mb-2">{s.name || 'Viva Session'}</h4>
                            <p className="text-sm text-gray-600">Team: {s.team?.teamName || 'N/A'}</p>
                            <p className="text-sm text-gray-600">Panel: {s.panel?.name || 'N/A'}</p>
                            <p className="text-sm text-gray-600">
                                <span className="font-medium">Time:</span> {new Date(s.startTime).toLocaleString()} - {new Date(s.endTime).toLocaleString()}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ExternalReviewSchedules;


