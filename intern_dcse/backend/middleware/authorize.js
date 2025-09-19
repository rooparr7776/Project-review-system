const authorize = (roles = []) => {
    if (typeof roles === 'string') {
        roles = [roles];
    }

    return (req, res, next) => {
        console.log('=== Authorization Debug ===');
        console.log('Required roles:', roles);
        console.log('User object:', req.user);
        console.log('User role:', req.user?.role);
        console.log('User roles array:', req.user?.roles);
        
        // Check if user has the required role or is faculty with appropriate permissions
        let hasPermission = false;
        
        if (req.user) {
            // Admin override always
            if (req.user.role === 'admin' || roles.includes('admin')) {
                hasPermission = true;
            }
            // Direct role match
            else if (roles.includes(req.user.role)) {
                hasPermission = true;
            }
            // Any matching role in the roles array
            else if (req.user.roles && Array.isArray(req.user.roles)) {
                const hasRequiredSubRole = req.user.roles.some(r => {
                    if (typeof r === 'string') {
                        return roles.includes(r);
                    }
                    if (r && typeof r === 'object') {
                        return roles.includes(r.role);
                    }
                    return false;
                });
                if (hasRequiredSubRole) {
                    hasPermission = true;
                }
            }
        }
        
        if (!hasPermission) {
            console.log('Authorization failed - User role not in required roles');
            console.log('User role:', req.user?.role);
            console.log('User roles array:', req.user?.roles);
            console.log('Required roles:', roles);
            // user's role is not authorized or user is not logged in
            return res.status(403).json({ message: 'Forbidden: You do not have permission to access this resource.' });
        }

        console.log('Authorization successful');
        console.log('=== End Authorization Debug ===');
        // authentication and authorization successful
        next();
    };
};

module.exports = authorize; 