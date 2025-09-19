import React, { useState, useEffect } from 'react';
import axios from 'axios';

const GuideAssignmentManagement = () => {
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [assigningTeamId, setAssigningTeamId] = useState(null);
    const [eligibleGuides, setEligibleGuides] = useState([]);
    const [selectedGuideId, setSelectedGuideId] = useState('');

    useEffect(() => {
        fetchTeams();
    }, []);

    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        return { Authorization: `Bearer ${token}` };
    };

    const fetchTeams = async () => {
        setLoading(true);
        setError('');
        setMessage('');
        try {
            const res = await axios.get('http://localhost:5000/api/admin/teams', { headers: getAuthHeaders() });
            setTeams(res.data || []);
        } catch (err) {
            console.error('Error fetching teams:', err);
            setError(err.response?.data?.message || 'Failed to fetch teams.');
        } finally {
            setLoading(false);
        }
    };

    const openAssignForTeam = async (teamId) => {
        try {
            setAssigningTeamId(teamId);
            setSelectedGuideId('');
            setEligibleGuides([]);
            const res = await axios.get(`http://localhost:5000/api/admin/eligible-guides-for-team/${teamId}`, { headers: getAuthHeaders() });
            setEligibleGuides(res.data || []);
        } catch (err) {
            console.error('Error fetching eligible guides:', err);
            setError(err.response?.data?.message || 'Failed to fetch eligible guides.');
            setAssigningTeamId(null);
        }
    };

    const assignGuide = async () => {
        if (!assigningTeamId || !selectedGuideId) return;
        try {
            await axios.post('http://localhost:5000/api/admin/assign-guide', { teamId: assigningTeamId, guideId: selectedGuideId }, { headers: getAuthHeaders() });
            setMessage('Guide assigned successfully.');
            setAssigningTeamId(null);
            setSelectedGuideId('');
            setEligibleGuides([]);
            fetchTeams();
        } catch (err) {
            console.error('Error assigning guide:', err);
            setError(err.response?.data?.message || 'Failed to assign guide.');
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64"><div className="text-lg text-gray-600">Loading...</div></div>;
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow space-y-6">
            <h2 className="text-2xl font-semibold mb-4">Teams Summary</h2>

            {message && (
                <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">{message}</div>
            )}
            {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>
            )}

            <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full bg-white">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team</th>
                            <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leader</th>
                            <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guide</th>
                            <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Panel</th>
                            <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {teams.map(team => (
                            <tr key={team._id}>
                                <td className="py-3 px-6 whitespace-nowrap">{team.teamName}</td>
                                <td className="py-3 px-6 whitespace-nowrap">{team.teamLeader ? `${team.teamLeader.name} (${team.teamLeader.username})` : '—'}</td>
                                <td className="py-3 px-6 whitespace-nowrap">{team.guidePreference ? (team.guidePreference.name || team.guidePreference.username) : '—'}</td>
                                <td className="py-3 px-6 whitespace-nowrap">{team.panel ? (team.panel.name || 'Panel') : '—'}</td>
                                <td className="py-3 px-6 whitespace-nowrap">
                                    {team.guidePreference ? (
                                        <span className="text-gray-400 text-sm">Guide assigned</span>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            {assigningTeamId === team._id ? (
                                                <>
                                                    <select
                                                        className="border rounded px-2 py-1 text-sm"
                                                        value={selectedGuideId}
                                                        onChange={(e) => setSelectedGuideId(e.target.value)}
                                                    >
                                                        <option value="">Select guide</option>
                                                        {eligibleGuides.map(g => (
                                                            <option key={g._id} value={g._id}>{g.name || g.username}</option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        onClick={assignGuide}
                                                        disabled={!selectedGuideId}
                                                        className={`px-3 py-1 text-sm rounded text-white ${selectedGuideId ? 'bg-green-600 hover:bg-green-700' : 'bg-green-300 cursor-not-allowed'}`}
                                                    >
                                                        Assign
                                                    </button>
                                                    <button
                                                        onClick={() => { setAssigningTeamId(null); setSelectedGuideId(''); setEligibleGuides([]); }}
                                                        className="px-3 py-1 text-sm rounded bg-gray-200 hover:bg-gray-300"
                                                    >
                                                        Cancel
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => openAssignForTeam(team._id)}
                                                    className="px-3 py-1 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
                                                >
                                                    Assign Guide
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default GuideAssignmentManagement;