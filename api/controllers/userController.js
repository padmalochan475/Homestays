const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const isLoggedIn = require('../middlewares/userAuth');

const bcryptSalt = bcrypt.genSaltSync(10);

const resolveUserRole = (u) => {
    if (u?.role) return u.role;
    const email = (u?.email || '').toLowerCase().trim();
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@homestays.com').toLowerCase().trim();
    const hostEmail = (process.env.HOST_EMAIL || 'demo@homestays.com').toLowerCase().trim();
    if (email === adminEmail || email === hostEmail || email === 'admin@homestays.com' || email === 'demo@homestays.com' || email.startsWith('admin@')) {
        return 'admin';
    }
    return 'user';
};

// Route to handle new registration for user
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    const normalizedEmail = (email || '').toLowerCase().trim();
    const normalizedName = (name || '').trim();

    if (!normalizedEmail || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const existing = await User.findOne({ email: normalizedEmail });
        if (existing) {
            return res.status(422).json({ code: 11000, error: 'Email already registered' });
        }

        const newUser = await User.create({
            name: normalizedName || 'User',
            email: normalizedEmail,
            password: bcrypt.hashSync(password, bcryptSalt),
        });

        const userRole = resolveUserRole(newUser);
        const jwtSecret = process.env.JWT_SECRET;
        const token = jwt.sign(
            { email: newUser.email, id: newUser._id, name: newUser.name, role: userRole },
            jwtSecret,
            { expiresIn: '24h' }
        );

        const isProduction = process.env.NODE_ENV === 'production';
        res.cookie('token', token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax',
            maxAge: 24 * 60 * 60 * 1000,
        });

        const userResponse = newUser.toObject();
        delete userResponse.password;
        userResponse.token = token;
        userResponse.id = newUser._id;
        userResponse.role = userRole;
        res.json(userResponse);
    } catch (e) {
        console.error('Registration error:', e);
        res.status(422).json({ error: e.message });
    }
});

// Route to handle user login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const normalizedEmail = (email || '').toLowerCase().trim();

        if (!normalizedEmail || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        let user = await User.findOne({ email: normalizedEmail }).select('+password');
        
        // Auto-provision or auto-sync configured Admin / Host credentials from .env
        const configuredAdminEmail = (process.env.ADMIN_EMAIL || 'admin@homestays.com').toLowerCase().trim();
        const configuredAdminPw = process.env.ADMIN_PASSWORD || 'Admin@123';
        const configuredHostEmail = (process.env.HOST_EMAIL || 'demo@homestays.com').toLowerCase().trim();
        const configuredHostPw = process.env.HOST_PASSWORD || 'Demo@123';

        const matchesAdminCreds = (normalizedEmail === configuredAdminEmail || normalizedEmail === 'admin@homestays.com') && password === configuredAdminPw;
        const matchesHostCreds = (normalizedEmail === configuredHostEmail || normalizedEmail === 'demo@homestays.com') && password === configuredHostPw;

        if (!user) {
            if (matchesAdminCreds) {
                user = await User.create({
                    name: process.env.ADMIN_NAME || 'Platform Administrator',
                    email: normalizedEmail,
                    password: bcrypt.hashSync(configuredAdminPw, bcryptSalt),
                    role: 'admin',
                });
                console.log(`[Auto-Provision] Created administrator on first login: ${normalizedEmail}`);
            } else if (matchesHostCreds) {
                user = await User.create({
                    name: process.env.HOST_NAME || 'Demo Host',
                    email: normalizedEmail,
                    password: bcrypt.hashSync(configuredHostPw, bcryptSalt),
                    role: 'admin',
                });
                console.log(`[Auto-Provision] Created host on first login: ${normalizedEmail}`);
            } else {
                return res.status(404).json({ error: 'User does not exist. Please register first.' });
            }
        }

        let passOk = bcrypt.compareSync(password, user.password);
        if (!passOk) {
            // If the user entered the password configured in .env for admin/host, synchronize the hash
            if (matchesAdminCreds || matchesHostCreds) {
                user.password = bcrypt.hashSync(password, bcryptSalt);
                user.role = 'admin';
                await user.save();
                passOk = true;
                console.log(`[Auto-Sync] Synchronized password hash from .env for ${normalizedEmail}`);
            } else {
                return res.status(422).json({ error: 'Wrong Password' });
            }
        }

        const userRole = resolveUserRole(user);
        const jwtSecret = process.env.JWT_SECRET;
        const token = jwt.sign(
            { email: user.email, id: user._id, name: user.name, role: userRole },
            jwtSecret,
            { expiresIn: '24h' }
        );

        const isProduction = process.env.NODE_ENV === 'production';
        res.cookie('token', token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax',
            maxAge: 24 * 60 * 60 * 1000,
        });

        const userResponse = user.toObject();
        delete userResponse.password;
        userResponse.token = token;
        userResponse.id = user._id;
        userResponse.role = userRole;
        return res.json(userResponse);
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({
            message: 'Internal Server Error',
            error: err.message,
        });
    }
});

// Route to handle logout of user
router.post('/logout', async (_req, res) => {
    const isProduction = process.env.NODE_ENV === 'production';
    res.clearCookie('token', {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
    }).json(true);
});

// Route to update user name or password
router.put('/', isLoggedIn, async (req, res) => {
    try {
        const { newName, newPassword } = req.body;
        const userId = req.user.id;
        const newAttributes = {};
        if (newName) newAttributes.name = newName.trim();
        if (newPassword) {
            newAttributes.password = bcrypt.hashSync(newPassword, bcryptSalt);
        }
        const updatedUser = await User.findByIdAndUpdate(userId, { $set: newAttributes }, { new: true });
        res.status(200).json(updatedUser);
    } catch (err) {
        console.error('Update profile error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Route to get current user's profile
router.get('/', isLoggedIn, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) {
        console.error('Get user error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            error: err.message,
        });
    }
});

router.get('/allusers', async (_req, res) => {
    try {
        const users = await User.find({}).select('-password');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Route to get data for user profile
router.get('/profile', isLoggedIn, async (req, res) => {
    try {
        const fullUser = await User.findById(req.user.id);
        const email = (fullUser?.email || req.user?.email || '').toLowerCase();
        const role = resolveUserRole(fullUser || req.user);
        res.json({
            ...req.user,
            _id: req.user.id,
            id: req.user.id,
            name: fullUser?.name || req.user.name,
            email: fullUser?.email || req.user.email,
            role,
        });
    } catch (e) {
        res.json({ ...req.user, _id: req.user.id, id: req.user.id, role: 'user' });
    }
});

// Route to update add bookings and bookedPlaces data inside user on a booking
router.put('/bookings', isLoggedIn, async (req, res) => {
    try {
        const { bookingId, bookedPlace } = req.body;
        const userId = req.user.id;
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                $addToSet: {
                    bookings: bookingId,
                    bookedPlaces: bookedPlace,
                },
            },
            { new: true }
        );
        res.status(200).json(updatedUser);
    } catch (err) {
        console.error('Update bookings error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Routes to delete any booking details from the user
router.delete('/bookings', isLoggedIn, async (req, res) => {
    try {
        const { placeId, bookingId } = req.body;
        const userId = req.user.id;
        await User.findByIdAndUpdate(
            userId,
            {
                $pull: {
                    bookedPlaces: placeId,
                    bookings: bookingId,
                },
            },
            { new: true }
        );
        res.status(200).json('User Bookings Updated Successfully');
    } catch (err) {
        console.error('Delete booking error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
