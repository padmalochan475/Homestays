const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const isLoggedIn = require('../middlewares/userAuth');

const bcryptSalt = bcrypt.genSaltSync(10);

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

        const jwtSecret = process.env.JWT_SECRET;
        const token = jwt.sign(
            { email: newUser.email, id: newUser._id, name: newUser.name },
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

        const user = await User.findOne({ email: normalizedEmail }).select('+password');
        if (!user) {
            return res.status(404).json({ error: 'User does not exist. Please register first.' });
        }

        const passOk = bcrypt.compareSync(password, user.password);
        if (!passOk) {
            return res.status(422).json({ error: 'Wrong Password' });
        }

        const jwtSecret = process.env.JWT_SECRET;
        const token = jwt.sign(
            { email: user.email, id: user._id, name: user.name },
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
router.get('/profile', isLoggedIn, (req, res) => {
    res.json({ ...req.user, _id: req.user.id });
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
