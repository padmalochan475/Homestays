const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Place = require('../models/Place');
const User = require('../models/User');
const allDaysBetweenIntervals = require('../utils/allDays');
const isLoggedIn = require('../middlewares/userAuth');

// Route to create a new booking
router.post('/', isLoggedIn, async (req, res) => {
    try {
        const userId = req.user.id;
        const { place, checkIn, checkOut, numberOfGuests, name, phone, price } = req.body;

        if (!place || !checkIn || !checkOut || !name || !phone) {
            return res.status(400).json({ error: 'Please provide all booking details (place, dates, name, phone).' });
        }

        // Validate that check-in date is not in the past and check-out is after check-in
        try {
            const partsIn = checkIn.split('/');
            const partsOut = checkOut.split('/');
            if (partsIn.length === 3 && partsOut.length === 3) {
                const checkInDate = new Date(Number(partsIn[2]), Number(partsIn[1]) - 1, Number(partsIn[0]), 0, 0, 0);
                const checkOutDate = new Date(Number(partsOut[2]), Number(partsOut[1]) - 1, Number(partsOut[0]), 0, 0, 0);
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                if (checkInDate < today) {
                    return res.status(400).json({ error: 'Check-in date cannot be in the past.' });
                }
                if (checkOutDate < checkInDate) {
                    return res.status(400).json({ error: 'Check-out date must be on or after check-in date.' });
                }
            }
        } catch (dateErr) {
            console.warn('Booking date validation notice:', dateErr.message);
        }

        const booking = await Booking.create({
            user: userId,
            place,
            checkIn,
            checkOut,
            numberOfGuests: Number(numberOfGuests) || 1,
            name: name.trim(),
            price: Number(price) || 0,
            phone: phone.trim(),
        });

        res.status(201).json(booking);
    } catch (err) {
        console.error('Error creating booking:', err);
        res.status(500).json({ error: err.message });
    }
});

// Route to find all bookings of a particular user
router.get('/account', isLoggedIn, async (req, res) => {
    try {
        const userId = req.user.id;
        const bookings = await Booking.find({ user: userId }).populate('place');
        res.status(200).json(bookings);
    } catch (err) {
        console.error('Error fetching bookings:', err);
        res.status(500).json({ error: err.message });
    }
});

// Route to get particular booking detail by user and place id
router.get('/:placeId', isLoggedIn, async (req, res) => {
    try {
        const { placeId } = req.params;
        const userId = req.user.id;
        const booking = await Booking.findOne({ user: userId, place: placeId });
        res.status(200).json(booking);
    } catch (err) {
        console.error('Error fetching place booking:', err);
        res.status(500).json({ error: err.message });
    }
});

// Route to delete a particular booking (with authorization & automatic cleanup)
router.delete('/', isLoggedIn, async (req, res) => {
    try {
        const { bookingId } = req.body;
        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        // Authorization check: User can only cancel their own booking
        if (booking.user.toString() !== req.user.id.toString()) {
            return res.status(403).json({ error: 'Forbidden: You are not authorized to cancel this booking.' });
        }

        // Automatic cleanup: Remove booked dates from the Place
        try {
            const allDates = allDaysBetweenIntervals(booking.checkIn, booking.checkOut);
            await Place.findByIdAndUpdate(booking.place, { $pullAll: { bookedDates: allDates } });
            await User.findByIdAndUpdate(req.user.id, {
                $pull: { bookings: bookingId, bookedPlaces: booking.place }
            });
        } catch (cleanupErr) {
            console.warn('Booking cascade cleanup notice:', cleanupErr.message);
        }

        await Booking.findByIdAndDelete(bookingId);
        res.status(200).json('Booking Table Updated Successfully');
    } catch (err) {
        console.error('Error deleting booking:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
