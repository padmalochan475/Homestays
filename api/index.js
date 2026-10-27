const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config(); // also check current working directory

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const connectWithDB = require('./config/db');

const app = express();

const PORT = Number(process.env.PORT || 4000);

// Ensure local uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Parse configured client URLs
const configuredClientUrls = (process.env.CLIENT_URL || '')
    .split(',')
    .map(url => url.trim().replace(/\/+$/, ''))
    .filter(Boolean)
    .map(url => (/^https?:\/\//i.test(url) ? url : `https://${url}`));

// Dynamic CORS configuration allowing configured origins, localhost, and live cloud subdomains
const corsOptions = {
    credentials: true,
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, server-to-server, health probes)
        if (!origin) {
            return callback(null, true);
        }

        const normalizedOrigin = origin.replace(/\/+$/, '');

        // Check if explicitly configured in CLIENT_URL
        if (configuredClientUrls.includes(normalizedOrigin)) {
            return callback(null, true);
        }

        // Allow localhost and loopback on any port for local development
        if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(normalizedOrigin)) {
            return callback(null, true);
        }

        // Allow Render domains (*.onrender.com) so dynamic/custom slugs never get blocked
        if (/^https:\/\/[a-zA-Z0-9-]+\.onrender\.com$/i.test(normalizedOrigin)) {
            return callback(null, true);
        }

        // Allow Vercel and Netlify deployment domains
        if (/^https:\/\/[a-zA-Z0-9-]+\.(vercel\.app|netlify\.app)$/i.test(normalizedOrigin)) {
            return callback(null, true);
        }

        // In non-production, allow any origin to prevent demo blockers
        if (process.env.NODE_ENV !== 'production') {
            return callback(null, true);
        }

        // If in production and not matching, reject cleanly
        return callback(new Error(`CORS error: Origin ${origin} not allowed`));
    }
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Serve local uploads
app.use('/uploads', express.static(uploadsDir));

app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('', require('./routes'));

const startServer = async () => {
    if (!process.env.DB_URL) {
        throw new Error('DB_URL is required. Copy api/.env.example to api/.env and configure it.');
    }
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is required. Copy api/.env.example to api/.env and configure it.');
    }

    try {
        await connectWithDB();
    } catch (dbErr) {
        console.warn('\x1b[33m%s\x1b[0m', '[Warning] Initial MongoDB connection failed: ' + dbErr.message);
        console.warn('\x1b[33m%s\x1b[0m', 'Server will remain active for health checks and retry connecting when requests arrive.');
    }

    app.listen(PORT, () => {
        console.log(`API Server listening on PORT:${PORT}`);

        // Automatic Zero-Touch Keep-Alive for Render
        const renderExternalUrl = process.env.RENDER_EXTERNAL_URL;
        if (renderExternalUrl) {
            console.log(`[Auto-KeepAlive] Initialized self-pinging keep-alive for ${renderExternalUrl}`);
            const https = require('https');
            const http = require('http');
            const client = renderExternalUrl.startsWith('https') ? https : http;
            setInterval(() => {
                client.get(`${renderExternalUrl}/health`, (res) => {
                    console.log(`[Auto-KeepAlive] Keep-alive heartbeat status: ${res.statusCode}`);
                }).on('error', (err) => {
                    console.warn(`[Auto-KeepAlive] Keep-alive heartbeat failed: ${err.message}`);
                });
            }, 10 * 60 * 1000); // Trigger every 10 minutes to prevent 15-minute Render sleep
        }
    });
};

startServer().catch((err) => {
    console.error('Unable to start API:', err);
    process.exitCode = 1;
});
