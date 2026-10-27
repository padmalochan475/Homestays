const express = require('express');
const router = express.Router();
require('dotenv').config();
const Otp = require('../models/Otp');
const User = require('../models/User');
const { transporter, randomNumber, hasEmailConfig } = require('../utils/nodemailer/nodemailer');

router.post('/sendMail', async (request, response) => {
    const { email, name } = request.body;
    const normalizedEmail = (email || '').toLowerCase().trim();

    if (!normalizedEmail) {
        return response.status(400).json({ error: 'Email is required' });
    }

    try {
        if (await User.findOne({ email: normalizedEmail })) {
            return response.status(400).json({ error: 'User already exists with this email. Try logging in.' });
        }

        const otp = randomNumber();
        await Otp.findOneAndUpdate(
            { email: normalizedEmail },
            { email: normalizedEmail, otp },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        if (hasEmailConfig() && transporter) {
            try {
                await transporter.sendMail({
                    from: process.env.MAIL_USERNAME,
                    to: normalizedEmail,
                    subject: 'Registration or verification code - HomeStays',
                    text: `Hi ${name || 'User'},\n\nPlease use this code to complete your registration.\nCode: ${otp}\n\nBest regards,\nHomeStays Team`,
                });
                return response.json({ message: 'OTP sent successfully to your email!' });
            } catch (mailError) {
                console.warn('Email dispatch failed, falling back to demo mode:', mailError.message);
                return response.json({
                    message: `OTP generated (Demo code: ${otp})`,
                    demoOtp: otp,
                });
            }
        } else {
            console.log(`[OTP Notice] Email OAuth not configured. Generated demo OTP for ${normalizedEmail}: ${otp}`);
            return response.json({
                message: `OTP generated! (Demo mode: ${otp})`,
                demoOtp: otp,
            });
        }
    } catch (error) {
        console.error('Unable to send registration OTP:', error);
        return response.status(500).json({ error: 'Unable to process registration OTP' });
    }
});

router.post('/verifyOtp', async (request, response) => {
    const { email, otp } = request.body;
    const normalizedEmail = (email || '').toLowerCase().trim();

    try {
        const record = await Otp.findOne({ email: normalizedEmail });
        if (record && record.otp === Number(otp)) {
            return response.json({ message: 'Validation successful' });
        } else if (record) {
            return response.status(400).json({ error: 'Wrong OTP! Please check the code.' });
        } else {
            return response.status(404).json({ error: 'No OTP requested for this email. Please request a new OTP.' });
        }
    } catch (err) {
        console.error('Verify OTP error:', err);
        return response.status(500).json({ error: 'Error validating OTP' });
    }
});

module.exports = router;
