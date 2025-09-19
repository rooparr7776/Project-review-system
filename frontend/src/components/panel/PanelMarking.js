import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PanelMarking = () => {
    const [teams, setTeams] = useState([]);
    const [marks, setMarks] = useState({}); // { studentId: { review1:{}, review2:{}, review3:{}, viva:{} } }
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isExternal = user?.memberType === 'external';
    const allowedSlots = isExternal ? ['viva'] : ['review1','review2','review3','viva'];
    const [activeSlotType, setActiveSlotType] = useState(isExternal ? 'viva' : 'review1');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            const teamsRes = await axios.get('/api/panels/assigned-teams', { headers });
            setTeams(teamsRes.data);

            const marksRes = await axios.get('/api/panels/marks', { headers });
            setMarks(marksRes.data);
            setLoading(false);
        } catch (err) {
            setError('Failed to fetch data.');
            setLoading(false);
        }
    };

    const handleMarkChange = (studentId, markName, value) => {
        const intValue = value === '' ? '' : parseInt(value, 10);
        if (intValue > 10) return;
        setMarks(prev => ({
            ...prev,
            [studentId]: {
                ...(prev[studentId] || {}),
                [activeSlotType]: {
                    ...(((prev[studentId] || {})[activeSlotType]) || {}),
                    [markName]: intValue,
                }
            },
        }));
    };

    const handleSubmitMarks = async (teamId, studentId) => {
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            
            const studentMarks = (marks[studentId] && marks[studentId][activeSlotType]) || {};
            const { mark1 = 0, mark2 = 0, mark3 = 0, mark4 = 0 } = studentMarks;

            await axios.post('/api/panels/marks', { teamId, studentId, mark1, mark2, mark3, mark4, slotType: activeSlotType }, { headers });
            alert('Marks submitted successfully!');
            fetchData();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to submit marks.');
        }
    };

    if (loading) return <div>Loading...</div>;
    if (error) return <div className="text-red-500">{error}</div>;

    return (
        <div className="space-y-8">
            <h2 className="text-2xl font-bold">Mark Teams</h2>
            {/* Slot type tabs (external sees only VIVA) */}
            <div className="flex space-x-2">
                {allowedSlots.map(st => (
                    <button key={st} onClick={() => setActiveSlotType(st)} className={`px-3 py-1 rounded ${activeSlotType===st?'bg-indigo-600 text-white':'bg-gray-200 text-gray-800'}`}>{st.toUpperCase()}</button>
                ))}
            </div>

            {teams.map(team => (
                <div key={team._id} className="p-6 bg-white rounded-lg shadow">
                    <h3 className="text-xl font-semibold mb-4">{team.teamName}</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="py-2 px-4 text-left">Student Name</th>
                                    <th className="py-2 px-4 text-center">Mark 1 (10)</th>
                                    <th className="py-2 px-4 text-center">Mark 2 (10)</th>
                                    <th className="py-2 px-4 text-center">Mark 3 (10)</th>
                                    <th className="py-2 px-4 text-center">Mark 4 (10)</th>
                                    <th className="py-2 px-4 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Team Leader */}
                                {team.teamLeader && (
                                    <tr key={team.teamLeader._id}>
                                        <td className="py-2 px-4 font-semibold">{team.teamLeader.name} (Team Leader)</td>
                                        {[1, 2, 3, 4].map(num => (
                                            <td key={num} className="py-2 px-4">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="10"
                                                    value={((marks[team.teamLeader._id]||{})[activeSlotType]||{})[`mark${num}`] || ''}
                                                    onChange={(e) => handleMarkChange(team.teamLeader._id, `mark${num}`, e.target.value)}
                                                    className="w-20 p-1 border rounded text-center"
                                                />
                                            </td>
                                        ))}
                                        <td className="py-2 px-4 text-center">
                                            <button
                                                onClick={() => handleSubmitMarks(team._id, team.teamLeader._id)}
                                                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                                            >
                                                Submit
                                            </button>
                                        </td>
                                    </tr>
                                )}
                                {/* Team Members */}
                                {team.members && team.members.map(member => (
                                    <tr key={member._id}>
                                        <td className="py-2 px-4">{member.name}</td>
                                        {[1, 2, 3, 4].map(num => (
                                            <td key={num} className="py-2 px-4">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="10"
                                                    value={((marks[member._id]||{})[activeSlotType]||{})[`mark${num}`] || ''}
                                                    onChange={(e) => handleMarkChange(member._id, `mark${num}`, e.target.value)}
                                                    className="w-20 p-1 border rounded text-center"
                                                />
                                            </td>
                                        ))}
                                        <td className="py-2 px-4 text-center">
                                            <button
                                                onClick={() => handleSubmitMarks(team._id, member._id)}
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

export default PanelMarking; 