import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PanelAssignment = () => {
    const [panels, setPanels] = useState([]);
    const [teams, setTeams] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            // Fetch panels and teams
            const response = await axios.get('http://localhost:5000/api/panel-assignments/panels-teams', { headers });
            console.log('Fetched data:', response.data); // Debug log
            setPanels(response.data.panels);
            // Deduplicate teams by _id to avoid duplicates
            const uniqueTeamsMap = new Map();
            for (const t of response.data.teams || []) {
                if (t && t._id && !uniqueTeamsMap.has(t._id)) {
                    uniqueTeamsMap.set(t._id, t);
                }
            }
            setTeams(Array.from(uniqueTeamsMap.values()));

            // Fetch existing assignments
            const assignmentsResponse = await axios.get('http://localhost:5000/api/panel-assignments', { headers });
            // Sort assignments by panel name (e.g., Panel 1, Panel 2)
            const sortedAssignments = assignmentsResponse.data.sort((a, b) => {
                const panelNameA = a.panel ? a.panel.name : '';
                const panelNameB = b.panel ? b.panel.name : '';
                const numA = parseInt(panelNameA.replace('Panel ', ''), 10);
                const numB = parseInt(panelNameB.replace('Panel ', ''), 10);
                return numA - numB;
            });
            // Filter out empty/invalid assignments (no panel or no teams)
            const nonEmptyAssignments = sortedAssignments.filter(a => Array.isArray(a.teams) && a.teams.length > 0 && a.panel);
            setAssignments(nonEmptyAssignments);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError(err.response?.data?.message || 'Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async () => {
        try {
            setError('');
            setMessage('');

            if (panels.length === 0) {
                setError('No panels available to assign teams to.');
                return;
            }
            if (teams.length === 0) {
                setError('No teams available for assignment.');
                return;
            }

            // Initialize an array to hold the assigned team IDs for each panel
            const panelAssignments = panels.map(panel => ({ panelId: panel._id, teamIds: [] }));

            // Distribute teams in a round-robin fashion
            teams.forEach((team, index) => {
                const panelIndex = index % panels.length;
                panelAssignments[panelIndex].teamIds.push(team._id);
            });
            
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            await axios.post('http://localhost:5000/api/panel-assignments', 
                { assignments: panelAssignments }, 
                { headers }
            );

            setMessage('Panel assignments created successfully!');
            fetchData(); // Refresh the data
        } catch (err) {
            console.error('Error creating assignments:', err);
            setError(err.response?.data?.message || 'Failed to create assignments');
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64">
            <div className="text-lg text-gray-600">Loading...</div>
        </div>;
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow space-y-6">
            <h2 className="text-2xl font-semibold mb-4">Panel Assignment</h2>
            
            {message && (
                <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
                    {message}
                </div>
            )}
            {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
                    {error}
                </div>
            )}

            {/* Panels and Teams Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 className="text-xl font-semibold mb-3">Available Panels</h3>
                    <div className="border rounded-lg p-4">
                        {panels.length === 0 ? (
                            <p className="text-gray-500">No panels available</p>
                        ) : (
                            panels.map(panel => (
                                <div key={panel._id} className="mb-3 p-3 bg-gray-50 rounded">
                                    <div className="font-medium">{panel.name}</div>
                                    <div className="text-sm text-gray-600">
                                        Members: {panel.members.map(m => `${m.name} (${m.memberType})`).join(', ')}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div>
                    <h3 className="text-xl font-semibold mb-3">Available Teams</h3>
                    <div className="border rounded-lg p-4">
                        {teams.length === 0 ? (
                            <p className="text-gray-500">No teams available</p>
                        ) : (
                            teams.map((team, index) => (
                                <div key={team._id} className="mb-3 p-3 bg-gray-50 rounded">
                                    <div className="font-medium">{team.teamName}</div>
                                    <div className="text-sm text-gray-600">
                                        <div>Leader: {team.teamLeader?.username}</div>
                                        <div>Members: {team.members.map(m => m.username).join(', ')}</div>
                                        {team.guidePreference && (
                                            <div>Guide: {team.guidePreference.username}</div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Assign Button */}
            <div className="flex justify-center">
                <button
                    onClick={handleAssign}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    Assign Teams to Panels
                </button>
            </div>

            {/* Current Assignments */}
            <div className="mt-8">
                <h3 className="text-xl font-semibold mb-3">Current Assignments</h3>
                <div className="border rounded-lg p-4">
                    {assignments.length === 0 ? (
                        <div className="text-gray-500">No current assignments</div>
                    ) : (
                        assignments.map(assignment => (
                            <div key={assignment._id} className="mb-4 p-4 bg-gray-50 rounded">
                                <div className="font-medium mb-2">
                                    {assignment.panel ? assignment.panel.name : 'Unnamed Panel'}
                                </div>
                                <div className="text-sm">
                                    <div className="font-medium text-gray-700">Assigned Teams:</div>
                                    <ul className="list-disc list-inside">
                                        {assignment.teams && assignment.teams.map((team, index) => {
                                            if (!team) return null;
                                            
                                            // Find the original global index of the team for display
                                            const originalGlobalIndex = teams.findIndex(t => t._id === team._id);
                                            const displayTeamNumber = originalGlobalIndex !== -1 ? originalGlobalIndex + 1 : 'N/A';

                                            const otherMembers = team.members ? team.members.filter(member => 
                                                team.teamLeader && member._id !== team.teamLeader._id
                                            ) : [];
                                            const membersDisplay = otherMembers.map(m => m.username).join(', ');
                                            
                                            return (
                                                <li key={team._id} className="text-gray-600">
                                                    {team.teamName} - {team.teamLeader?.name} ({team.teamLeader?.username}){membersDisplay ? `, ${membersDisplay}` : ''}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default PanelAssignment; 