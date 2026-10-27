const jwt = require('jsonwebtoken');

const isLoggedIn = async (req, res, next) => {
    try {
        let token = req.cookies?.token;
        if (!token && req.headers.authorization) {
            token = req.headers.authorization.startsWith('Bearer ')
                ? req.headers.authorization.slice(7)
                : req.headers.authorization;
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'You are not Logged In!!',
            });
        }

        const jwtSecret = process.env.JWT_SECRET;
        jwt.verify(token, jwtSecret, {}, async (err, user) => {
            if (err) {
                return res.status(401).json({ message: 'Unauthorized' });
            }
            req.user = user;
            next();
        });
    } catch (err) {
        console.error('Auth middleware error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = isLoggedIn;
