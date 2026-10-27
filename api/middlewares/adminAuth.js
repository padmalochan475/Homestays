const User = require('../models/User');

const isAdmin = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
        }

        const user = await User.findById(req.user.id);
        const email = (user?.email || req.user?.email || '').toLowerCase();
        const role = user?.role || req.user?.role;

        const configuredAdminEmail = (process.env.ADMIN_EMAIL || 'admin@homestays.com').toLowerCase();
        const configuredHostEmail = (process.env.HOST_EMAIL || 'demo@homestays.com').toLowerCase();

        const isMasterAdmin =
            role === 'admin' ||
            email === configuredAdminEmail ||
            email === configuredHostEmail ||
            email === 'demo@homestays.com' ||
            email === 'admin@homestays.com' ||
            email.startsWith('admin@');

        if (!isMasterAdmin) {
            return res.status(403).json({ error: 'Forbidden: Administrator privileges required to access this resource.' });
        }

        req.adminUser = user || req.user;
        next();
    } catch (err) {
        console.error('Admin middleware authorization error:', err);
        return res.status(500).json({ error: 'Internal Server Error during admin verification.' });
    }
};

module.exports = isAdmin;
