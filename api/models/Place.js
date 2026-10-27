const mongoose = require('mongoose');

const placeSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    address: {
        type: String,
        required: true,
    },
    photos: {
        type: [String],
        default: [],
    },
    description: {
        type: String,
        default: '',
    },
    perks: {
        type: [String],
        default: [],
    },
    extraInfo: {
        type: String,
        default: '',
    },
    maxGuests: {
        type: Number,
        default: 1,
    },
    price: {
        type: Number,
        default: 0,
    },
    bookedDates: {
        type: [String],
        default: [],
    },
}, { timestamps: true });

const Place = mongoose.model('Place', placeSchema);

module.exports = Place;
