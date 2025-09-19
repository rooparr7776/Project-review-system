import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const RoleSelection = () => {
    const [selectedRole, setSelectedRole] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Get user data from localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const availableRoles = user.roles || [];
    
    // Get unique roles only (remove duplicates)
    // Always present guide, panel, coordinator at least once
    const baseRoles = ['guide', 'panel', 'coordinator', 'external'];
    const dedup = [];
    availableRoles.forEach(roleObj => {
        const key = `${roleObj.role}:${roleObj.team || ''}`;
        if (!dedup.find(r => `${r.role}:${r.team || ''}` === key)) {
            dedup.push(roleObj);
        }
    });
    baseRoles.forEach(r => {
        if (!dedup.find(x => x.role === r)) {
            dedup.push({ role: r, team: null });
        }
    });
    const uniqueRoles = dedup;

    const handleRoleSelect = async (roleObj) => {
        setLoading(true);
        try {
            // Update the user's current role in localStorage
            const updatedUser = {
                ...user,
                role: roleObj.role,
                team: roleObj.team || null
            };
            localStorage.setItem('user', JSON.stringify(updatedUser));

            // Navigate based on the selected role
            if (roleObj.role === 'coordinator') {
                navigate('/coordinator-dashboard/review-schedule');
            } else if (roleObj.role === 'guide') {
                navigate('/guide-dashboard');
            } else if (roleObj.role === 'external') {
                navigate('/external-dashboard');
            } else if (roleObj.role === 'panel') {
                navigate('/panel-dashboard');
            } else {
                // Default to faculty dashboard
                navigate('/faculty-dashboard');
            }
        } catch (error) {
            console.error('Error selecting role:', error);
        } finally {
            setLoading(false);
        }
    };

    const getRoleDisplayName = (role) => {
        switch (role) {
            case 'guide':
                return 'Guide';
            case 'panel':
                return 'Panel Member';
            case 'coordinator':
                return 'Coordinator';
            default:
                return role.charAt(0).toUpperCase() + role.slice(1);
        }
    };

    // Optional helper kept for future display of team context
    const getTeamDisplayName = (team) => {
        if (!team) return 'No Team Assigned';
        return `Team ${team}`;
    };

    if (uniqueRoles.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">No Roles Available</h2>
                        <p className="text-gray-600 mb-4">You don't have any assigned roles in the system.</p>
                        <button
                            onClick={() => navigate('/login')}
                            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                        >
                            Back to Login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome, {user.name || user.username}!</h2>
                    <p className="text-gray-600 mb-6">Please select the role you want to use for this session:</p>
                </div>

                <div className="space-y-4">
                    {uniqueRoles.map((roleObj, index) => (
                        <button
                            key={index}
                            onClick={() => handleRoleSelect(roleObj)}
                            disabled={loading}
                            className={`w-full p-4 text-left rounded-lg border-2 transition-all duration-200 ${
                                loading 
                                    ? 'bg-gray-100 border-gray-200 cursor-not-allowed' 
                                    : 'bg-white border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer'
                            }`}
                        >
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="font-semibold text-gray-900">
                                        {getRoleDisplayName(roleObj.role)}
                                    </h3>
                                    {roleObj.team && (
                                        <div className="text-sm text-gray-500 mt-1">Team: {roleObj.team}</div>
                                    )}
                                </div>
                                <div className="text-indigo-600">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

                {loading && (
                    <div className="text-center py-4">
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                        <p className="mt-2 text-sm text-gray-600">Loading...</p>
                    </div>
                )}

                <div className="text-center">
                    <button
                        onClick={() => {
                            localStorage.removeItem('token');
                            localStorage.removeItem('user');
                            navigate('/login');
                        }}
                        className="text-sm text-gray-500 hover:text-gray-700 underline"
                    >
                        Sign out
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RoleSelection; 