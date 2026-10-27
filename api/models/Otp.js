const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
    },
    otp: {
        type: Number,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 600, // Automatically deletes expired OTP after 10 minutes
    },
});

module.exports = mongoose.model('Otp', otpSchema);
