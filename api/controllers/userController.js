const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const isLoggedIn = require('../middlewares/userAuth');

const bcryptSalt = bcrypt.genSaltSync(10);

// Helper to get freshest credentials from .env in case student modified it while server was running
const getEnvCredentials = () => {
    const creds = {
        adminEmail: (process.env.ADMIN_EMAIL || 'admin@homestays.com').toLowerCase().trim(),
        adminPassword: process.env.ADMIN_PASSWORD || 'Admin@123',
        adminName: process.env.ADMIN_NAME || 'Platform Administrator',
        hostEmail: (process.env.HOST_EMAIL || 'demo@homestays.com').toLowerCase().trim(),
        hostPassword: process.env.HOST_PASSWORD || 'Demo@123',
        hostName: process.env.HOST_NAME || 'Demo Host',
    };

    const envPaths = [
        path.join(__dirname, '../.env'),
        path.join(process.cwd(), '.env'),
        path.join(process.cwd(), 'api/.env'),
    ];
    const envPath = envPaths.find(p => fs.existsSync(p));
    if (envPath) {
        try {
            const content = fs.readFileSync(envPath, 'utf8');
            const lines = content.split('\n');
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) continue;
                const m = trimmed.match(/^([A-Za-z0-9_]+)\s*=\s*(.*)?$/);
                if (m) {
                    const key = m[1];
                    const val = (m[2] || '').trim().replace(/^['"](.*)['"]$/, '$1');
                    if (key === 'ADMIN_EMAIL' && val) creds.adminEmail = val.toLowerCase().trim();
                    if (key === 'ADMIN_PASSWORD' && val) creds.adminPassword = val;
                    if (key === 'ADMIN_NAME' && val) creds.adminName = val;
                    if (key === 'HOST_EMAIL' && val) creds.hostEmail = val.toLowerCase().trim();
                    if (key === 'HOST_PASSWORD' && val) creds.hostPassword = val;
                    if (key === 'HOST_NAME' && val) creds.hostName = val;
                }
            }
        } catch (e) {}
    }
    return creds;
};

// Helper to synchronize environment variables directly to .env file and memory
const updateEnvFile = (updates) => {
    const envPaths = [
        path.join(__dirname, '../.env'),
        path.join(process.cwd(), '.env'),
        path.join(process.cwd(), 'api/.env'),
    ];
    const targetPath = envPaths.find(p => fs.existsSync(p)) || path.join(__dirname, '../.env');

    try {
        let content = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, 'utf8') : '';
        for (const [key, value] of Object.entries(updates)) {
            if (value === undefined || value === null) continue;
            process.env[key] = String(value);
            const regex = new RegExp(`^${key}=.*$`, 'm');
            if (regex.test(content)) {
                content = content.replace(regex, `${key}=${value}`);
            } else {
                content += (content.endsWith('\n') || content === '' ? '' : '\n') + `${key}=${value}\n`;
            }
        }
        fs.writeFileSync(targetPath, content, 'utf8');
        return true;
    } catch (err) {
        console.warn('[Auto-Sync] Warning updating .env file:', err.message);
        return false;
    }
};

const resolveUserRole = (u) => {
    if (u?.role) return u.role;
    const email = (u?.email || '').toLowerCase().trim();
    const creds = getEnvCredentials();
    if (
        email === creds.adminEmail ||
        email === creds.hostEmail ||
        email === 'admin@homestays.com' ||
        email === 'demo@homestays.com' ||
        email.startsWith('admin@')
    ) {
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

        const creds = getEnvCredentials();
        let user = await User.findOne({ email: normalizedEmail }).select('+password');

        const matchesAdminCreds =
            (normalizedEmail === creds.adminEmail || normalizedEmail === 'admin@homestays.com') &&
            password === creds.adminPassword;
        const matchesHostCreds =
            (normalizedEmail === creds.hostEmail || normalizedEmail === 'demo@homestays.com') &&
            password === creds.hostPassword;

        if (!user) {
            if (matchesAdminCreds) {
                // If legacy admin exists, migrate its email to creds.adminEmail
                let legacyAdmin = await User.findOne({ email: 'admin@homestays.com' }).select('+password');
                if (legacyAdmin) {
                    legacyAdmin.email = creds.adminEmail;
                    legacyAdmin.name = creds.adminName;
                    legacyAdmin.password = bcrypt.hashSync(creds.adminPassword, bcryptSalt);
                    legacyAdmin.role = 'admin';
                    await legacyAdmin.save();
                    user = legacyAdmin;
                    console.log(`[Auto-Sync] Migrated legacy admin account in MongoDB to ${creds.adminEmail}`);
                } else {
                    user = await User.create({
                        name: creds.adminName,
                        email: creds.adminEmail,
                        password: bcrypt.hashSync(creds.adminPassword, bcryptSalt),
                        role: 'admin',
                    });
                    console.log(`[Auto-Provision] Created administrator on first login: ${creds.adminEmail}`);
                }
            } else if (matchesHostCreds) {
                let legacyHost = await User.findOne({ email: 'demo@homestays.com' }).select('+password');
                if (legacyHost) {
                    legacyHost.email = creds.hostEmail;
                    legacyHost.name = creds.hostName;
                    legacyHost.password = bcrypt.hashSync(creds.hostPassword, bcryptSalt);
                    legacyHost.role = 'admin';
                    await legacyHost.save();
                    user = legacyHost;
                    console.log(`[Auto-Sync] Migrated legacy host account in MongoDB to ${creds.hostEmail}`);
                } else {
                    user = await User.create({
                        name: creds.hostName,
                        email: creds.hostEmail,
                        password: bcrypt.hashSync(creds.hostPassword, bcryptSalt),
                        role: 'admin',
                    });
                    console.log(`[Auto-Provision] Created host on first login: ${creds.hostEmail}`);
                }
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

// Route to update user name, email, or password
router.put('/', isLoggedIn, async (req, res) => {
    try {
        const { newName, newEmail, newPassword } = req.body;
        const userId = req.user.id;

        const user = await User.findById(userId).select('+password');
        if (!user) {
            return res.status(404).json({ error: 'User account not found' });
        }

        const oldEmail = (user.email || '').toLowerCase().trim();
        const creds = getEnvCredentials();
        const isCurrentAdmin =
            user.role === 'admin' ||
            oldEmail === creds.adminEmail ||
            oldEmail === 'admin@homestays.com' ||
            oldEmail.startsWith('admin@');
        const isCurrentHost =
            oldEmail === creds.hostEmail ||
            oldEmail === 'demo@homestays.com';

        const envUpdates = {};

        // 1. Handle Name Change
        if (newName && newName.trim() && newName.trim() !== user.name) {
            user.name = newName.trim();
            if (isCurrentAdmin) {
                envUpdates.ADMIN_NAME = user.name;
            } else if (isCurrentHost) {
                envUpdates.HOST_NAME = user.name;
            }
        }

        // 2. Handle Email Change
        if (newEmail) {
            const normalizedNewEmail = newEmail.toLowerCase().trim();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedNewEmail)) {
                return res.status(400).json({ error: 'Please enter a valid email address.' });
            }

            if (normalizedNewEmail !== oldEmail) {
                const duplicate = await User.findOne({ email: normalizedNewEmail, _id: { $ne: userId } });
                if (duplicate) {
                    return res.status(422).json({ error: 'This email is already in use by another account.' });
                }

                user.email = normalizedNewEmail;

                if (isCurrentAdmin) {
                    envUpdates.ADMIN_EMAIL = normalizedNewEmail;
                } else if (isCurrentHost) {
                    envUpdates.HOST_EMAIL = normalizedNewEmail;
                }
            }
        }

        // 3. Handle Password Change
        if (newPassword) {
            if (newPassword.length < 6) {
                return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
            }
            user.password = bcrypt.hashSync(newPassword, bcryptSalt);

            if (isCurrentAdmin) {
                envUpdates.ADMIN_PASSWORD = newPassword;
            } else if (isCurrentHost) {
                envUpdates.HOST_PASSWORD = newPassword;
            }
        }

        await user.save();

        // 4. Synchronize into api/.env file and RAM if admin or host details changed
        if (Object.keys(envUpdates).length > 0) {
            updateEnvFile(envUpdates);
            console.log(`[Auto-Sync] Synchronized profile updates to api/.env:`, Object.keys(envUpdates).join(', '));
        }

        const userResponse = user.toObject();
        delete userResponse.password;
        userResponse.role = resolveUserRole(user);
        res.status(200).json(userResponse);
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
