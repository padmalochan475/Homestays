const express = require('express');
const router = express.Router();
const Place = require('../models/Place');
const allDaysBetweenIntervals = require('../utils/allDays');
const isLoggedIn = require('../middlewares/userAuth');

// Route to add place
router.post('/', isLoggedIn, async (req, res) => {
    try {
        const userId = req.user.id;
        const { title, address, addedPhotos, description, perks, maxGuests, extraInfo, price } = req.body;

        if (!title || !address) {
            return res.status(400).json({ error: 'Title and address are required' });
        }

        const newPlace = await Place.create({
            owner: userId,
            title: title.trim(),
            address: address.trim(),
            photos: addedPhotos || [],
            description: description || '',
            perks: perks || [],
            extraInfo: extraInfo || '',
            maxGuests: Math.max(1, Number(maxGuests) || 1),
            price: Math.max(0, Number(price) || 0),
        });
        res.status(201).json(newPlace);
    } catch (err) {
        console.error('Error adding place:', err);
        res.status(500).json({ error: err.message });
    }
});

// Route to update existing place (with owner authorization)
router.put('/', isLoggedIn, async (req, res) => {
    try {
        const { id, title, address, addedPhotos, description, perks, maxGuests, extraInfo, price } = req.body;
        const place = await Place.findById(id);
        if (!place) {
            return res.status(404).json({ error: 'Place not found' });
        }

        // Authorization check: Only the owner can modify this place
        if (place.owner.toString() !== req.user.id.toString()) {
            return res.status(403).json({ error: 'Forbidden: You are not authorized to edit this accommodation.' });
        }

        place.set({
            title: title !== undefined ? title.trim() : place.title,
            address: address !== undefined ? address.trim() : place.address,
            photos: addedPhotos || place.photos,
            description: description !== undefined ? description : place.description,
            perks: perks || place.perks,
            maxGuests: maxGuests !== undefined ? Math.max(1, Number(maxGuests)) : place.maxGuests,
            extraInfo: extraInfo !== undefined ? extraInfo : place.extraInfo,
            price: price !== undefined ? Math.max(0, Number(price)) : place.price,
        });
        await place.save();
        res.status(200).json('Place Updated Successfully');
    } catch (err) {
        console.error('Error updating place:', err);
        res.status(500).json({ error: err.message });
    }
});

// Route to add booked dates in place collection
router.put('/:id', isLoggedIn, async (req, res) => {
    try {
        const { checkIn, checkOut } = req.body;
        const { id } = req.params;
        const allDates = allDaysBetweenIntervals(checkIn, checkOut);
        await Place.updateOne({ _id: id }, { $addToSet: { bookedDates: { $each: allDates } } });
        res.status(200).json('Place Updated Successfully!');
    } catch (err) {
        console.error('Error updating booked dates:', err);
        res.status(500).json({ error: err.message });
    }
});

// Route to delete booked dates in place collection
router.delete('/:id', isLoggedIn, async (req, res) => {
    try {
        const { id } = req.params;
        const { checkIn, checkOut } = req.body;
        const allDates = allDaysBetweenIntervals(checkIn, checkOut);
        await Place.findByIdAndUpdate(id, { $pullAll: { bookedDates: allDates } });
        res.status(200).json('Booked Dates Successfully deleted');
    } catch (err) {
        console.error('Error deleting booked dates:', err);
        res.status(500).json({ error: err.message });
    }
});

// Route to get all places added by the current user
router.get('/account', isLoggedIn, async (req, res) => {
    try {
        const userId = req.user.id;
        const myPlaces = await Place.find({ owner: userId });
        res.status(200).json(myPlaces);
    } catch (err) {
        console.error('Error fetching user places:', err);
        res.status(500).json({ error: err.message });
    }
});

// Route to delete a place added by user (with owner authorization)
router.delete('/', isLoggedIn, async (req, res) => {
    try {
        const { placeId } = req.body;
        const place = await Place.findById(placeId);
        if (!place) {
            return res.status(404).json({ error: 'Place not found' });
        }

        // Authorization check: Only owner can delete
        if (place.owner.toString() !== req.user.id.toString()) {
            return res.status(403).json({ error: 'Forbidden: You are not authorized to delete this accommodation.' });
        }

        await Place.findByIdAndDelete(placeId);

        // Cascade delete associated bookings & clean up user references
        try {
            const Booking = require('../models/Booking');
            const User = require('../models/User');
            const orphanedBookings = await Booking.find({ place: placeId });
            const orphanedIds = orphanedBookings.map((b) => b._id);
            await Booking.deleteMany({ place: placeId });
            if (orphanedIds.length > 0) {
                await User.updateMany(
                    { bookings: { $in: orphanedIds } },
                    { $pull: { bookings: { $in: orphanedIds }, bookedPlaces: placeId } }
                );
            }
        } catch (cascadeErr) {
            console.warn('Place deletion cascade warning:', cascadeErr.message);
        }

        res.status(200).json('Place Successfully Deleted');
    } catch (err) {
        console.error('Error deleting place:', err);
        res.status(500).json({ error: err.message });
    }
});

// Route to fetch all details of a particular place
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const place = await Place.findById(id);
        if (!place) {
            return res.status(404).json({ error: 'Place not found' });
        }
        res.status(200).json(place);
    } catch (err) {
        console.error('Error fetching place details:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
