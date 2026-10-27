require('dotenv').config();
const nodemailer = require('nodemailer');

const hasEmailConfig = () => {
    // 1. Standard Free SMTP / Gmail App Password (Zero OAuth complexity!)
    const user = process.env.MAIL_USERNAME || process.env.SMTP_USER;
    const pass = process.env.MAIL_PASSWORD || process.env.MAIL_PASS || process.env.SMTP_PASS;
    if (user && pass) return true;

    // 2. Custom SMTP Server
    if (process.env.SMTP_HOST && user && pass) return true;

    // 3. Google OAuth2 (legacy support)
    if (
        process.env.MAIL_USERNAME &&
        process.env.OAUTH_CLIENTID &&
        process.env.OAUTH_CLIENT_SECRET &&
        process.env.OAUTH_REFRESH_TOKEN
    ) {
        return true;
    }

    return false;
};

const getTransporter = () => {
    const user = process.env.MAIL_USERNAME || process.env.SMTP_USER;
    const pass = process.env.MAIL_PASSWORD || process.env.MAIL_PASS || process.env.SMTP_PASS;

    // 1. Standard Free SMTP (Gmail App Password, Yahoo, Outlook)
    if (user && pass && !process.env.SMTP_HOST) {
        return nodemailer.createTransport({
            service: process.env.MAIL_SERVICE || 'gmail',
            auth: { user, pass },
        });
    }

    // 2. Custom SMTP Server
    if (process.env.SMTP_HOST && user && pass) {
        return nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: { user, pass },
        });
    }

    // 3. Google OAuth2
    if (
        process.env.MAIL_USERNAME &&
        process.env.OAUTH_CLIENTID &&
        process.env.OAUTH_CLIENT_SECRET &&
        process.env.OAUTH_REFRESH_TOKEN
    ) {
        return nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: process.env.MAIL_USERNAME,
                clientId: process.env.OAUTH_CLIENTID,
                clientSecret: process.env.OAUTH_CLIENT_SECRET,
                refreshToken: process.env.OAUTH_REFRESH_TOKEN,
            },
        });
    }

    return null;
};

const randomNumber = () => Math.floor(1000 + Math.random() * 9000);

module.exports = { getTransporter, randomNumber, hasEmailConfig };
