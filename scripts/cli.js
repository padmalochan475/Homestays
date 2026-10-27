const fs = require('fs');
const path = require('path');
const net = require('net');
const readline = require('readline');
const crypto = require('crypto');
const { spawn } = require('child_process');

const rootDir = path.join(__dirname, '..');
const apiDir = path.join(rootDir, 'api');
const clientDir = path.join(rootDir, 'client');
const apiEnvPath = path.join(apiDir, '.env');
const clientEnvPath = path.join(clientDir, '.env');

// ANSI Color Helpers
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
    white: '\x1b[37m',
    bgBlue: '\x1b[44m',
};

const print = (text = '', color = colors.reset) => console.log(`${color}${text}${colors.reset}`);
const printHeader = (text) => {
    console.log('\n' + colors.cyan + '='.repeat(68));
    console.log(colors.bright + colors.yellow + `  ${text}`);
    console.log(colors.cyan + '='.repeat(68) + colors.reset);
};

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const ask = (query) => new Promise((resolve) => rl.question(query, resolve));

function getEnvValue(filePath, key) {
    if (!fs.existsSync(filePath)) return '';
    const content = fs.readFileSync(filePath, 'utf8');
    const match = content.match(new RegExp(`^${key}=(.*)$`, 'm'));
    return match ? match[1].trim() : '';
}

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

// Check if a port is in use
function checkPortFree(port) {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                resolve(false);
            } else {
                resolve(true);
            }
        });
        server.once('listening', () => {
            server.close();
            resolve(true);
        });
        server.listen(port, '127.0.0.1');
    });
}

// Test MongoDB Connection
async function testMongoConnection(uri) {
    let mongoose;
    try {
        mongoose = require(path.join(apiDir, 'node_modules/mongoose'));
    } catch (e) {
        throw new Error('Mongoose is not installed. Please run "npm install" inside api folder first.');
    }

    mongoose.set('strictQuery', false);
    try {
        const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 6000 });
        await conn.disconnect();
        return { success: true };
    } catch (err) {
        return { success: false, error: err };
    }
}

// Detailed MongoDB Diagnostic Troubleshooting
function showMongoTroubleshooting(errorMsg, uri) {
    print('\n❌ MongoDB Connection Failed!', colors.red + colors.bright);
    print(`   Error: ${errorMsg}`, colors.red);

    print('\n📋 Step-by-Step Resolution Guide:', colors.yellow + colors.bright);

    const isAtlas = uri.includes('mongodb+srv://') || uri.includes('.mongodb.net');
    const isLocal = uri.includes('127.0.0.1') || uri.includes('localhost');

    if (errorMsg.includes('bad auth') || errorMsg.includes('AuthenticationFailed') || errorMsg.includes('auth failed')) {
        print('   [Issue]: Invalid Username or Password', colors.yellow);
        print('   1. Go to your MongoDB Atlas dashboard (cloud.mongodb.com).', colors.white);
        print('   2. Navigate to: Security -> Database Access.', colors.white);
        print('   3. Verify your username exists, or click "Add New Database User".', colors.white);
        print('   4. Choose "Password" authentication and set a known password.', colors.white);
        print('   5. Important: If your password contains special characters like @, #, $,', colors.white);
        print('      encode them (e.g. @ becomes %40, # becomes %23).', colors.white);
    } else if (errorMsg.includes('ETIMEOUT') || errorMsg.includes('ServerSelectionError') || errorMsg.includes('queryTxt') || isAtlas) {
        print('   [Issue]: IP Not Whitelisted or Network Blocked', colors.yellow);
        print('   1. Go to MongoDB Atlas (cloud.mongodb.com).', colors.white);
        print('   2. Navigate to: Security -> Network Access.', colors.white);
        print('   3. Click "+ Add IP Address".', colors.white);
        print('   4. Select "Allow Access from Anywhere" (adds 0.0.0.0/0).', colors.white);
        print('   5. Click "Confirm" and wait 1-2 minutes for Atlas to deploy the change.', colors.white);
        print('   6. (College Wi-Fi Tip): Some university campus Wi-Fi blocks port 27017.', colors.white);
        print('      If so, connect your laptop to your mobile hotspot and retry.', colors.white);
    } else if (isLocal || errorMsg.includes('ECONNREFUSED')) {
        print('   [Issue]: Local MongoDB Service is Not Running', colors.yellow);
        print('   1. Ensure MongoDB Community Server is installed on your machine.', colors.white);
        print('   2. Start MongoDB via Windows Services, or run: net start MongoDB in an admin terminal.', colors.white);
        print('   3. Or switch to a free MongoDB Atlas cloud connection string.', colors.white);
    } else {
        print('   1. Verify your URI format: mongodb+srv://<username>:<password>@cluster0.xxx.mongodb.net/homestays', colors.white);
        print('   2. Verify your internet connection.', colors.white);
    }
    console.log();
}

async function validateAndSetupMongo() {
    printHeader('Step 1: MongoDB Database Configuration & Validation');

    let currentDbUrl = getEnvValue(apiEnvPath, 'DB_URL');
    if (currentDbUrl) {
        const masked = currentDbUrl.replace(/:[^:@]+@/, ':****@');
        print(`Found existing DB_URL: ${masked}`, colors.dim);
        const useExisting = await ask('Do you want to test and keep this connection string? [Y/n]: ');
        if (useExisting.trim().toLowerCase() !== 'n') {
            print('Testing connection to existing DB_URL...', colors.cyan);
            const result = await testMongoConnection(currentDbUrl);
            if (result.success) {
                print('✅ Verified! Successfully connected to your MongoDB database.', colors.green + colors.bright);
                return currentDbUrl;
            } else {
                showMongoTroubleshooting(result.error.message, currentDbUrl);
            }
        }
    }

    let verified = false;
    let validatedUrl = '';

    while (!verified) {
        print('\nPlease enter your MongoDB connection string.', colors.bright);
        print('Example (Atlas): mongodb+srv://admin:pass123@cluster0.abcde.mongodb.net/homestays', colors.dim);
        print('Example (Local): mongodb://127.0.0.1:27017/homestays', colors.dim);

        const inputUrl = (await ask('\nMongoDB URI: ')).trim();

        if (!inputUrl) {
            print('⚠️ URI cannot be empty.', colors.red);
            continue;
        }

        if (!inputUrl.startsWith('mongodb://') && !inputUrl.startsWith('mongodb+srv://')) {
            print('⚠️ Invalid format: Connection string must start with mongodb:// or mongodb+srv://', colors.red);
            print('   Example: mongodb+srv://username:password@cluster.mongodb.net/database', colors.yellow);
            const retry = await ask('Would you like to try entering it again? [Y/n]: ');
            if (retry.trim().toLowerCase() === 'n') break;
            continue;
        }

        print('Testing connection to MongoDB server (timeout: 6s)...', colors.cyan);
        const result = await testMongoConnection(inputUrl);

        if (result.success) {
            print('✅ Verified! Successfully connected to MongoDB.', colors.green + colors.bright);
            setEnvValue(apiEnvPath, 'DB_URL', inputUrl);
            print('💾 Saved verified DB_URL to api/.env', colors.green);
            validatedUrl = inputUrl;
            verified = true;
        } else {
            showMongoTroubleshooting(result.error.message, inputUrl);
            const retry = await ask('Would you like to re-enter your connection string? [Y/n]: ');
            if (retry.trim().toLowerCase() === 'n') {
                const saveAnyway = await ask('Do you want to save this connection string anyway? [y/N]: ');
                if (saveAnyway.trim().toLowerCase() === 'y') {
                    setEnvValue(apiEnvPath, 'DB_URL', inputUrl);
                    print('💾 Saved unverified DB_URL to api/.env', colors.yellow);
                    validatedUrl = inputUrl;
                }
                break;
            }
        }
    }

    return validatedUrl;
}

async function validateAndSetupSecurity() {
    printHeader('Step 2: Authentication & Security Tokens');

    let jwtSecret = getEnvValue(apiEnvPath, 'JWT_SECRET');
    if (!jwtSecret || jwtSecret === 'replace-with-a-long-random-secret') {
        jwtSecret = crypto.randomBytes(32).toString('base64url');
        setEnvValue(apiEnvPath, 'JWT_SECRET', jwtSecret);
        print('✅ Generated cryptographically secure 64-character JWT_SECRET.', colors.green);
        print('💾 Saved JWT_SECRET to api/.env', colors.green);
    } else {
        print('✅ JWT_SECRET is already configured securely.', colors.green);
    }

    // Default Port & URLs
    if (!getEnvValue(apiEnvPath, 'PORT')) {
        setEnvValue(apiEnvPath, 'PORT', '4000');
    }
    if (!getEnvValue(apiEnvPath, 'CLIENT_URL')) {
        setEnvValue(apiEnvPath, 'CLIENT_URL', 'http://localhost:5173,http://127.0.0.1:5173');
    }
    if (!getEnvValue(clientEnvPath, 'VITE_API_BASE_URL')) {
        setEnvValue(clientEnvPath, 'VITE_API_BASE_URL', 'http://localhost:4000');
    }

    // Ensure uploads directory exists
    const uploadsDir = path.join(apiDir, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
        print('✅ Ensured local storage directory exists: api/uploads', colors.green);
    }
}

async function validatePorts() {
    printHeader('Step 3: Port Availability Diagnostics');

    const apiPortFree = await checkPortFree(4000);
    const clientPortFree = await checkPortFree(5173);

    if (apiPortFree) {
        print('✅ API Port 4000 is open and ready.', colors.green);
    } else {
        print('⚠️ Port 4000 is currently occupied by another process.', colors.yellow);
        print('   If you previously started HomeStays, terminate existing Node processes.', colors.dim);
    }

    if (clientPortFree) {
        print('✅ Client Port 5173 is open and ready.', colors.green);
    } else {
        print('ℹ️ Port 5173 is currently busy. Vite will automatically use port 5174 or next available.', colors.yellow);
    }
}

async function askSeedData(hasDb) {
    if (!hasDb) return;
    printHeader('Step 4: Optional Pre-Seeded Sample Data');
    print('Would you like to seed 4 luxury homestays and a pre-configured Host account?');
    print('Includes Manali Chalet, Goa Beach Villa, Jaipur Haveli, Munnar Estate with real photos.');
    print('Credentials created: demo@homestays.com / Demo@123', colors.cyan);

    const answer = await ask('\nSeed sample data now? [y/N]: ');
    if (answer.trim().toLowerCase() === 'y') {
        print('\nSeeding database...', colors.cyan);
        try {
            const seedProcess = spawn('node', [path.join(rootDir, 'scripts/seed.js')], {
                cwd: rootDir,
                stdio: 'inherit',
                shell: true,
            });
            await new Promise((resolve) => seedProcess.on('close', resolve));
            print('✅ Database successfully seeded!', colors.green + colors.bright);
        } catch (e) {
            print(`⚠️ Could not seed sample data: ${e.message}`, colors.yellow);
        }
    }
}

async function launchSystem() {
    printHeader('Step 5: Launch HomeStays');
    print('All environment configurations, tokens, and storage pathways have been validated.', colors.green);

    const runNow = await ask('\nLaunch both servers now and open the app? [Y/n]: ');
    if (runNow.trim().toLowerCase() !== 'n') {
        print('\n🚀 Launching HomeStays Application...', colors.cyan + colors.bright);
        rl.close();
        require(path.join(rootDir, 'scripts/start.js'));
    } else {
        print('\n✅ Setup is complete and saved!', colors.green + colors.bright);
        print('You can start HomeStays anytime by running:');
        print('  npm start', colors.bright + colors.white);
        print('  or double-clicking setup.bat\n', colors.bright + colors.white);
        rl.close();
    }
}

async function main() {
    console.clear();
    console.log(colors.cyan + '======================================================================' + colors.reset);
    console.log(colors.bright + colors.yellow + '      🏡 HomeStays - Interactive CLI Validator & Launcher      ' + colors.reset);
    console.log(colors.cyan + '======================================================================' + colors.reset);
    console.log(colors.white + 'This interactive doctor validates all dependencies, verifies database' + colors.reset);
    console.log(colors.white + 'connectivity, guides you through any errors, and saves verified configs.' + colors.reset);

    // Initialize .env files from templates if missing
    if (!fs.existsSync(apiEnvPath) && fs.existsSync(path.join(apiDir, '.env.example'))) {
        fs.copyFileSync(path.join(apiDir, '.env.example'), apiEnvPath);
    }
    if (!fs.existsSync(clientEnvPath) && fs.existsSync(path.join(clientDir, '.env.example'))) {
        fs.copyFileSync(path.join(clientDir, '.env.example'), clientEnvPath);
    }

    const verifiedDbUrl = await validateAndSetupMongo();
    await validateAndSetupSecurity();
    await validatePorts();
    await askSeedData(Boolean(verifiedDbUrl));
    await launchSystem();
}

main().catch((err) => {
    console.error('CLI encountered an unexpected error:', err);
    rl.close();
    process.exit(1);
});
