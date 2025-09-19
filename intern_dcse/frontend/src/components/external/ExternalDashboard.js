import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../Navbar';

const ExternalDashboard = () => {
    const location = useLocation();
    const [user, setUser] = useState(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) setUser(JSON.parse(storedUser));
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    if (!user) return null;

    const isBase = location.pathname === '/external-dashboard' || location.pathname === '/external-dashboard/';

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar user={{ ...user, role: 'external' }} onLogout={handleLogout} />
            <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    {isBase ? (
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h2 className="text-xl font-semibold mb-2">External Member Dashboard</h2>
                            <p className="text-gray-700">Use the navigation to view assigned teams, viva schedules, and enter viva marks.</p>
                        </div>
                    ) : (
                        <Outlet />
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExternalDashboard;


