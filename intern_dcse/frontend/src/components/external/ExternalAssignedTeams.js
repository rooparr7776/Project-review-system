import React, { useEffect, useState } from 'react';
import axios from 'axios';

const ExternalAssignedTeams = () => {
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchTeams = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get('/api/panels/assigned-teams', { headers: { Authorization: `Bearer ${token}` } });
                setTeams(res.data || []);
                setError('');
            } catch (err) {
                const status = err.response?.status;
                if (status === 401 || status === 403) {
                    setTeams([]);
                    setError('');
                } else {
                    setError('Failed to fetch assigned teams');
                }
            } finally {
                setLoading(false);
            }
        };
        fetchTeams();
    }, []);

    if (loading) return <div className="p-4">Loading...</div>;
    if (error) return <div className="p-4 text-red-600">{error}</div>;

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-6">Your Assigned Teams</h2>
            {teams.length === 0 ? (
                <p>No teams assigned yet.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {teams.map(team => (
                        <div key={team._id} className="border p-4 rounded-lg shadow-sm">
                            <h3 className="font-semibold text-lg mb-2">Team: {team.teamName}</h3>
                            <p className="text-gray-700">Leader: {team.teamLeader?.name} ({team.teamLeader?.username})</p>
                            <div className="mt-2">
                                <p className="font-medium">Members:</p>
                                <ul className="list-disc list-inside ml-4 text-gray-700">
                                    {(team.members || []).map(m => (
                                        <li key={m._id}>{m.name || m.username}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ExternalAssignedTeams;


