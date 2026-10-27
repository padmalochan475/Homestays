const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');
const { execSync } = require('child_process');

const rootDir = path.join(__dirname, '..');
const apiDir = path.join(rootDir, 'api');
const clientDir = path.join(rootDir, 'client');
const uploadsDir = path.join(apiDir, 'uploads');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

function setEnvValue(filePath, key, value) {
    let content = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(content)) {
        content = content.replace(regex, `${key}=${value}`);
    } else {
        content += (content.endsWith('\n') || content === '' ? '' : '\n') + `${key}=${value}\n`;
    }
    fs.writeFileSync(filePath, content, 'utf8');
}

function getEnvValue(filePath, key) {
    if (!fs.existsSync(filePath)) return '';
    const content = fs.readFileSync(filePath, 'utf8');
    const match = content.match(new RegExp(`^${key}=(.*)$`, 'm'));
    return match ? match[1].trim() : '';
}

async function runSetup() {
    console.log('\n\x1b[36m%s\x1b[0m', '====================================================');
    console.log('\x1b[32m%s\x1b[0m', '      HomeStays - Interactive Project Setup         ');
    console.log('\x1b[36m%s\x1b[0m', '====================================================\n');

    // 1. Ensure uploads directory exists
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log('\x1b[32m%s\x1b[0m', '[+] Created directory: api/uploads');
    }

    // 2. Setup environment files
    const apiEnv = path.join(apiDir, '.env');
    const apiEnvEx = path.join(apiDir, '.env.example');
    const clientEnv = path.join(clientDir, '.env');
    const clientEnvEx = path.join(clientDir, '.env.example');

    if (!fs.existsSync(apiEnv) && fs.existsSync(apiEnvEx)) {
        fs.copyFileSync(apiEnvEx, apiEnv);
        console.log('\x1b[33m%s\x1b[0m', '[+] Created api/.env from template');
    }
    if (!fs.existsSync(clientEnv) && fs.existsSync(clientEnvEx)) {
        fs.copyFileSync(clientEnvEx, clientEnv);
        console.log('\x1b[33m%s\x1b[0m', '[+] Created client/.env from template');
    }

    // Set defaults
    if (!getEnvValue(apiEnv, 'PORT')) setEnvValue(apiEnv, 'PORT', '4000');
    if (!getEnvValue(apiEnv, 'CLIENT_URL')) setEnvValue(apiEnv, 'CLIENT_URL', 'http://localhost:5173,http://127.0.0.1:5173');
    if (!getEnvValue(clientEnv, 'VITE_API_BASE_URL')) setEnvValue(clientEnv, 'VITE_API_BASE_URL', 'http://localhost:4000');

    // Generate JWT secret if needed
    let secret = getEnvValue(apiEnv, 'JWT_SECRET');
    if (!secret || secret === 'replace-with-a-long-random-secret') {
        secret = crypto.randomBytes(32).toString('base64url');
        setEnvValue(apiEnv, 'JWT_SECRET', secret);
        console.log('\x1b[32m%s\x1b[0m', '[✓] Generated secure JWT_SECRET in api/.env');
    }

    // Configure DB_URL
    let dbUrl = getEnvValue(apiEnv, 'DB_URL');
    if (!dbUrl) {
        console.log('\n\x1b[33m%s\x1b[0m', 'MongoDB connection string is required.');
        console.log('Atlas format: mongodb+srv://<username>:<password>@cluster0.xxx.mongodb.net/homestays');
        const inputUrl = await question('\nEnter your MongoDB URI: ');
        if (inputUrl.trim()) {
            dbUrl = inputUrl.trim();
            setEnvValue(apiEnv, 'DB_URL', dbUrl);
            console.log('\x1b[32m%s\x1b[0m', '[✓] DB_URL saved to api/.env');
        }
    } else {
        const masked = dbUrl.replace(/:[^:@]+@/, ':****@');
        console.log('\x1b[32m%s\x1b[0m', `[✓] DB_URL configured: ${masked}`);
    }

    // 3. Install dependencies
    console.log('\n\x1b[36m%s\x1b[0m', 'Checking and installing dependencies...');
    try {
        if (!fs.existsSync(path.join(apiDir, 'node_modules'))) {
            console.log('[*] Installing api dependencies...');
            execSync('npm install', { cwd: apiDir, stdio: 'inherit' });
        } else {
            console.log('\x1b[32m%s\x1b[0m', '[✓] API dependencies installed.');
        }

        if (!fs.existsSync(path.join(clientDir, 'node_modules'))) {
            console.log('[*] Installing client dependencies...');
            execSync('npm install', { cwd: clientDir, stdio: 'inherit' });
        } else {
            console.log('\x1b[32m%s\x1b[0m', '[✓] Client dependencies installed.');
        }
    } catch (err) {
        console.error('Failed to install dependencies:', err.message);
    }

    // 4. Offer sample data seed
    if (dbUrl) {
        const seedAnswer = await question('\nWould you like to seed sample homestay listings and demo account? (y/N): ');
        if (seedAnswer.trim().toLowerCase() === 'y') {
            try {
                execSync('node scripts/seed.js', { cwd: rootDir, stdio: 'inherit' });
            } catch (err) {
                console.warn('Could not seed data:', err.message);
            }
        }
    }

    console.log('\n\x1b[32m%s\x1b[0m', '====================================================');
    console.log('\x1b[32m%s\x1b[0m', '           HomeStays Setup Complete!                ');
    console.log('\x1b[32m%s\x1b[0m', '====================================================');
    console.log('Run the application anytime with:');
    console.log('  npm start\n');

    rl.close();
}

runSetup().catch((err) => {
    console.error('Setup error:', err);
    rl.close();
    process.exit(1);
});
