const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Place = require('../models/Place');
const Booking = require('../models/Booking');
const isLoggedIn = require('../middlewares/userAuth');
const isAdmin = require('../middlewares/adminAuth');
const allDaysBetweenIntervals = require('../utils/allDays');

// Protect all admin routes with authentication + admin verification
router.use(isLoggedIn);
router.use(isAdmin);

/**
 * GET /admin/stats
 * Dashboard overview metrics & analytics
 */
router.get('/stats', async (req, res) => {
    try {
        const [totalUsers, totalPlaces, totalBookings, revenueAggregation] = await Promise.all([
            User.countDocuments(),
            Place.countDocuments(),
            Booking.countDocuments(),
            Booking.aggregate([
                { $group: { _id: null, totalRevenue: { $sum: '$price' } } }
            ]),
        ]);

        const totalRevenue = revenueAggregation.length > 0 ? revenueAggregation[0].totalRevenue : 0;

        // Fetch recent 5 bookings
        const recentBookings = await Booking.find({})
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('user', 'name email')
            .populate('place', 'title address photos price');

        // Fetch recent 5 registered users
        const recentUsers = await User.find({})
            .select('-password')
            .sort({ createdAt: -1 })
            .limit(5);

        res.json({
            stats: {
                totalUsers,
                totalPlaces,
                totalBookings,
                totalRevenue,
            },
            recentBookings,
            recentUsers,
            system: {
                nodeVersion: process.version,
                uptimeSeconds: Math.floor(process.uptime()),
                database: 'Connected (MongoDB Atlas)',
            }
        });
    } catch (err) {
        console.error('Admin stats error:', err);
        res.status(500).json({ error: 'Failed to load administrator statistics.' });
    }
});

/**
 * GET /admin/users
 * All registered users
 */
router.get('/users', async (_req, res) => {
    try {
        const users = await User.find({})
            .select('-password')
            .sort({ createdAt: -1 });

        const mappedUsers = users.map((u) => {
            const email = (u.email || '').toLowerCase();
            const computedRole = u.role || (email === 'demo@homestays.com' || email.startsWith('admin@') ? 'admin' : 'user');
            return {
                ...u.toObject(),
                role: computedRole,
                bookingsCount: u.bookings ? u.bookings.length : 0,
                placesCount: u.bookedPlaces ? u.bookedPlaces.length : 0,
            };
        });

        res.json(mappedUsers);
    } catch (err) {
        console.error('Admin users error:', err);
        res.status(500).json({ error: 'Failed to retrieve user accounts.' });
    }
});

/**
 * GET /admin/places
 * All accommodations across all hosts
 */
router.get('/places', async (_req, res) => {
    try {
        const places = await Place.find({})
            .populate('owner', 'name email')
            .sort({ createdAt: -1 });
        res.json(places);
    } catch (err) {
        console.error('Admin places error:', err);
        res.status(500).json({ error: 'Failed to retrieve accommodations.' });
    }
});

/**
 * GET /admin/bookings
 * All reservations platform-wide
 */
router.get('/bookings', async (_req, res) => {
    try {
        const bookings = await Booking.find({})
            .populate('user', 'name email')
            .populate('place', 'title address photos price owner')
            .sort({ createdAt: -1 });
        res.json(bookings);
    } catch (err) {
        console.error('Admin bookings error:', err);
        res.status(500).json({ error: 'Failed to retrieve reservations.' });
    }
});

/**
 * DELETE /admin/place/:id
 * Delete any accommodation listing & cascade cleanup
 */
router.delete('/place/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const place = await Place.findById(id);
        if (!place) {
            return res.status(404).json({ error: 'Accommodation listing not found.' });
        }

        await Place.findByIdAndDelete(id);

        // Cascade cleanup bookings & user references
        const orphanedBookings = await Booking.find({ place: id });
        const orphanedIds = orphanedBookings.map((b) => b._id);
        await Booking.deleteMany({ place: id });

        if (orphanedIds.length > 0) {
            await User.updateMany(
                { bookings: { $in: orphanedIds } },
                { $pull: { bookings: { $in: orphanedIds }, bookedPlaces: id } }
            );
        }

        res.json({ message: 'Listing and associated reservations removed successfully.' });
    } catch (err) {
        console.error('Admin delete place error:', err);
        res.status(500).json({ error: 'Failed to delete listing.' });
    }
});

/**
 * DELETE /admin/booking/:id
 * Cancel any booking platform-wide & free calendar dates
 */
router.delete('/booking/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const booking = await Booking.findById(id);
        if (!booking) {
            return res.status(404).json({ error: 'Reservation not found.' });
        }

        // Clean up bookedDates in Place
        try {
            const allDates = allDaysBetweenIntervals(booking.checkIn, booking.checkOut);
            await Place.findByIdAndUpdate(booking.place, { $pullAll: { bookedDates: allDates } });
            await User.findByIdAndUpdate(booking.user, {
                $pull: { bookings: id, bookedPlaces: booking.place }
            });
        } catch (cleanupErr) {
            console.warn('Admin booking cleanup notice:', cleanupErr.message);
        }

        await Booking.findByIdAndDelete(id);
        res.json({ message: 'Reservation cancelled successfully.' });
    } catch (err) {
        console.error('Admin cancel booking error:', err);
        res.status(500).json({ error: 'Failed to cancel reservation.' });
    }
});

/**
 * DELETE /admin/user/:id
 * Remove a user account
 */
router.delete('/user/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (id.toString() === req.user.id.toString()) {
            return res.status(400).json({ error: 'Cannot delete your own administrator account.' });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ error: 'User account not found.' });
        }

        // Clean up user's listings and bookings
        await Booking.deleteMany({ user: id });
        await Place.deleteMany({ owner: id });
        await User.findByIdAndDelete(id);

        res.json({ message: `User account '${user.name}' deleted successfully.` });
    } catch (err) {
        console.error('Admin delete user error:', err);
        res.status(500).json({ error: 'Failed to delete user account.' });
    }
});

/**
 * PUT /admin/user-role/:id
 * Toggle user role
 */
router.put('/user-role/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        if (!['user', 'admin'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role. Must be user or admin.' });
        }

        const updated = await User.findByIdAndUpdate(id, { role }, { new: true }).select('-password');
        res.json(updated);
    } catch (err) {
        console.error('Admin update role error:', err);
        res.status(500).json({ error: 'Failed to update user role.' });
    }
});

module.exports = router;
