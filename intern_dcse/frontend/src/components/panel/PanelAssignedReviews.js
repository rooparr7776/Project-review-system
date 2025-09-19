import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PanelAssignedReviews = () => {
    const [assignedTeams, setAssignedTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedTeam, setSelectedTeam] = useState(null);

    useEffect(() => {
        fetchAssignedReviews();
    }, []);

    const fetchAssignedReviews = async () => {
        try {
            setLoading(true);
            setError('');
            
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Authentication required');
                return;
            }

            const headers = { Authorization: `Bearer ${token}` };
            
            // Fetch teams assigned to this panel member
            const response = await axios.get('http://localhost:5000/api/panels/assigned-teams', { headers });
            setAssignedTeams(response.data || []);
            
        } catch (err) {
            const status = err.response?.status;
            if (status === 401 || status === 403) {
                setAssignedTeams([]);
                setError('');
            } else {
                console.error('Error fetching assigned reviews:', err);
                setError(err.response?.data?.message || 'Failed to fetch assigned reviews');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleViewTeamDetails = (team) => {
        setSelectedTeam(selectedTeam?.id === team.id ? null : team);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Not scheduled';
        return new Date(dateString).toLocaleString();
    };

    const getReviewStatus = (team) => {
        if (!team.reviewSchedule) return 'Not Scheduled';
        if (team.reviewSchedule.status === 'completed') return 'Completed';
        if (team.reviewSchedule.status === 'in-progress') return 'In Progress';
        return 'Scheduled';
    };

    if (loading) {
        return (
            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">My Assigned Reviews</h2>
                <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading assigned reviews...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">My Assigned Reviews</h2>
                <div className="text-red-600 p-4 bg-red-50 rounded-md">
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">My Assigned Reviews</h2>
            
            {assignedTeams.length === 0 ? (
                <div className="text-center py-8">
                    <p className="text-gray-600">No teams have been assigned to you for review yet.</p>
                    <p className="text-gray-500 text-sm mt-2">Check back later or contact the coordinator.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {assignedTeams.map((team) => (
                        <div key={team._id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <h3 className="text-lg font-medium text-gray-900">
                                        {team.teamName || `Team ${team._id}`}
                                    </h3>
                                    <div className="mt-2 space-y-1">
                                        <p className="text-sm text-gray-600">
                                            <span className="font-medium">Members:</span> {team.members?.map(m => m.name || m.username).join(', ') || 'No members'}
                                        </p>
                                        {team.guide && (
                                            <p className="text-sm text-gray-600">
                                                <span className="font-medium">Guide:</span> {team.guide.name || team.guide.username}
                                            </p>
                                        )}
                                        <p className="text-sm text-gray-600">
                                            <span className="font-medium">Status:</span> 
                                            <span className={`ml-1 px-2 py-1 rounded-full text-xs ${
                                                team.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                team.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-gray-100 text-gray-800'
                                            }`}>
                                                {team.status}
                                            </span>
                                        </p>
                                        {team.reviewSchedule && (
                                            <>
                                                <p className="text-sm text-gray-600">
                                                    <span className="font-medium">Review Date:</span> {formatDate(team.reviewSchedule.scheduledDate)}
                                                </p>
                                                <p className="text-sm text-gray-600">
                                                    <span className="font-medium">Review Status:</span> 
                                                    <span className={`ml-1 px-2 py-1 rounded-full text-xs ${
                                                        getReviewStatus(team) === 'Completed' ? 'bg-green-100 text-green-800' :
                                                        getReviewStatus(team) === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-gray-100 text-gray-800'
                                                    }`}>
                                                        {getReviewStatus(team)}
                                                    </span>
                                                </p>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => handleViewTeamDetails(team)}
                                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                    >
                                        {selectedTeam?.id === team.id ? 'Hide Details' : 'View Details'}
                                    </button>
                                    {team.reviewSchedule && team.reviewSchedule.status !== 'completed' && (
                                        <button
                                            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                                        >
                                            Start Review
                                        </button>
                                    )}
                                </div>
                            </div>
                            
                            {selectedTeam?.id === team.id && (
                                <div className="mt-4 p-4 bg-gray-50 rounded-md">
                                    <h4 className="font-medium text-gray-900 mb-2">Team Details</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-gray-600">
                                                <span className="font-medium">Team ID:</span> {team._id}
                                            </p>
                                            <p className="text-gray-600">
                                                <span className="font-medium">Created:</span> {formatDate(team.createdAt)}
                                            </p>
                                            {team.projectTitle && (
                                                <p className="text-gray-600">
                                                    <span className="font-medium">Project:</span> {team.projectTitle}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            {team.reviewSchedule && (
                                                <>
                                                    <p className="text-gray-600">
                                                        <span className="font-medium">Venue:</span> {team.reviewSchedule.venue || 'TBD'}
                                                    </p>
                                                    <p className="text-gray-600">
                                                        <span className="font-medium">Duration:</span> {team.reviewSchedule.duration || 'TBD'}
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PanelAssignedReviews; 