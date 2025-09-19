import React from 'react';
import { useNavigate } from 'react-router-dom';

const roleLabels = {
  guide: 'Guide',
  panel: 'Panel Member',
  coordinator: 'Coordinator',
};

const FacultyDashboard = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  const navigate = useNavigate();

  // Get unique faculty roles (guide, panel, coordinator) - only show roles the user actually has
  const facultyRoles = [...new Set(user.roles.filter(r => ['guide', 'panel', 'coordinator'].includes(r.role)).map(r => r.role))];

  const handleSelect = (role) => {
    // Save selected role in localStorage for use in dashboards
    localStorage.setItem('selectedRole', JSON.stringify({ role }));
    // Also update user object in localStorage for ProtectedRoute
    const user = JSON.parse(localStorage.getItem('user'));
    user.role = role;
    localStorage.setItem('user', JSON.stringify(user));
    // Redirect to the appropriate dashboard
    if (role === 'guide') navigate('/guide-dashboard');
    else if (role === 'panel') navigate('/panel-dashboard');
    else if (role === 'coordinator') navigate('/coordinator-dashboard/review-schedule');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <h2 className="text-center text-3xl font-extrabold text-gray-900 mb-4">
          Welcome, {user.name}
        </h2>
        <p className="text-center text-gray-700 mb-6">
          You have multiple roles. Please select which dashboard you want to access:
        </p>
        <div className="space-y-4">
          {facultyRoles.map((role) => (
            <button
              key={role}
              className="w-full py-3 px-4 bg-indigo-600 text-white rounded hover:bg-indigo-700 focus:outline-none text-lg font-semibold"
              onClick={() => handleSelect(role)}
            >
              {roleLabels[role]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FacultyDashboard;