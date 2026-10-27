const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
        select: false,
    },
    bookings: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
    }],
    bookedPlaces: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Place',
    }],
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

module.exports = User;
