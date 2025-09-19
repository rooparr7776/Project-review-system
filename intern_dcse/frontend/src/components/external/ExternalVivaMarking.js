import React, { useEffect, useState } from 'react';
import axios from 'axios';

const ExternalVivaMarking = () => {
    const [teams, setTeams] = useState([]);
    const [marks, setMarks] = useState({}); // { studentId: { viva: number } }
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                const headers = { Authorization: `Bearer ${token}` };
                const teamsRes = await axios.get('/api/panels/assigned-teams', { headers });
                setTeams(teamsRes.data || []);
                setError('');
            } catch (err) {
                const status = err.response?.status;
                if (status === 401 || status === 403) {
                    setTeams([]);
                    setError('');
                } else {
                    setError('Failed to load teams.');
                }
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleMarkChange = (studentId, value) => {
        const intValue = value === '' ? '' : parseInt(value, 10);
        if (intValue !== '' && (intValue < 0 || intValue > 100)) return; // Viva assumed out of 100
        setMarks(prev => ({ ...prev, [studentId]: { viva: intValue } }));
    };

    const handleSubmit = async (teamId, studentId) => {
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            const viva = marks[studentId]?.viva ?? 0;
            await axios.post('/api/panels/marks/viva', { teamId, studentId, viva }, { headers });
            alert('Viva mark submitted');
        } catch (err) {
            const status = err.response?.status;
            if (status === 401 || status === 403) {
                setError('');
            } else {
                setError(err.response?.data?.message || 'Failed to submit viva mark.');
            }
        }
    };

    if (loading) return <div>Loading...</div>;
    if (error) return <div className="text-red-600">{error}</div>;

    return (
        <div className="space-y-8">
            <h2 className="text-2xl font-bold">Enter Viva Marks</h2>
            {teams.map(team => (
                <div key={team._id} className="p-6 bg-white rounded-lg shadow">
                    <h3 className="text-xl font-semibold mb-4">{team.teamName}</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="py-2 px-4 text-left">Student Name</th>
                                    <th className="py-2 px-4 text-center">Viva (100)</th>
                                    <th className="py-2 px-4 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(team.members || []).map(m => (
                                    <tr key={m._id}>
                                        <td className="py-2 px-4">{m.name || m.username}</td>
                                        <td className="py-2 px-4 text-center">
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={marks[m._id]?.viva ?? ''}
                                                onChange={(e) => handleMarkChange(m._id, e.target.value)}
                                                className="w-24 p-1 border rounded text-center"
                                            />
                                        </td>
                                        <td className="py-2 px-4 text-center">
                                            <button
                                                onClick={() => handleSubmit(team._id, m._id)}
                                                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                                            >
                                                Submit
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ExternalVivaMarking;


