require('dotenv').config();
const nodemailer = require('nodemailer');

const hasEmailConfig = () => {
    return Boolean(
        process.env.MAIL_USERNAME &&
        process.env.OAUTH_CLIENTID &&
        process.env.OAUTH_CLIENT_SECRET &&
        process.env.OAUTH_REFRESH_TOKEN
    );
};

let transporter = null;
if (hasEmailConfig()) {
    try {
        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: process.env.MAIL_USERNAME,
                clientId: process.env.OAUTH_CLIENTID,
                clientSecret: process.env.OAUTH_CLIENT_SECRET,
                refreshToken: process.env.OAUTH_REFRESH_TOKEN,
            },
        });
    } catch (err) {
        console.warn('Failed to initialize Gmail OAuth2 transporter:', err.message);
    }
}

const randomNumber = () => Math.floor(1000 + Math.random() * 9000);

module.exports = { transporter, randomNumber, hasEmailConfig };
