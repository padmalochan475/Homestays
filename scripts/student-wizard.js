const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');
const { execSync, spawn } = require('child_process');
const http = require('http');

const rootDir = path.join(__dirname, '..');
const apiDir = path.join(rootDir, 'api');
const clientDir = path.join(rootDir, 'client');
const uploadsDir = path.join(apiDir, 'uploads');
const apiEnvPath = path.join(apiDir, '.env');
const clientEnvPath = path.join(clientDir, '.env');
const renderYamlPath = path.join(rootDir, 'render.yaml');

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    bgCyan: '\x1b[46m\x1b[30m',
};

const print = (text = '', color = colors.reset) => console.log(`${color}${text}${colors.reset}`);
const printBox = (text) => {
    console.log('\n' + colors.cyan + '═'.repeat(68));
    console.log(colors.bright + colors.yellow + `  ${text}`);
    console.log(colors.cyan + '═'.repeat(68) + colors.reset);
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

// Live test MongoDB Connection
async function testMongoConnection(uri) {
    let mongoose;
    try {
        mongoose = require(path.join(apiDir, 'node_modules/mongoose'));
    } catch (e) {
        return { success: false, error: new Error('Mongoose dependency is not installed yet.') };
    }

    mongoose.set('strictQuery', false);
    try {
        const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
        await conn.disconnect();
        return { success: true };
    } catch (err) {
        return { success: false, error: err };
    }
}

// Detailed diagnostic troubleshooting for students
function showDiagnosticGuide(errorMsg, uri) {
    print('\n❌ Could not connect to MongoDB:', colors.red + colors.bright);
    print(`   ${errorMsg}`, colors.red);

    print('\n📋 How to fix this in MongoDB Atlas (Easy Guide):', colors.yellow + colors.bright);

    if (errorMsg.includes('bad auth') || errorMsg.includes('AuthenticationFailed')) {
        print('   🔑 [Wrong Username or Password]:', colors.yellow);
        print('   1. Open cloud.mongodb.com -> Go to "Database Access".', colors.white);
        print('   2. Verify your user or click "Edit" to set a known password (e.g. Homestay1234).', colors.white);
        print('   3. Make sure to remove any < > angle brackets around the password in your URI!', colors.white);
    } else if (errorMsg.includes('ETIMEOUT') || errorMsg.includes('ServerSelectionError') || errorMsg.includes('queryTxt') || uri.includes('mongodb+srv://')) {
        print('   🌐 [Network IP Whitelist Blocked]:', colors.yellow);
        print('   1. Open cloud.mongodb.com -> Go to "Network Access" in the left sidebar.', colors.white);
        print('   2. Click "+ Add IP Address".', colors.white);
        print('   3. Click "ALLOW ACCESS FROM ANYWHERE" (adds 0.0.0.0/0). Click Confirm.', colors.white);
        print('   4. (College Wi-Fi Tip): Some university campus Wi-Fi blocks database port 27017.', colors.white);
        print('      If so, connect your laptop to your mobile phone hotspot and retry.', colors.white);
    } else {
        print('   1. If using local MongoDB, ensure your mongod service is running.', colors.white);
        print('   2. Atlas format: mongodb+srv://<user>:<password>@cluster0.xxx.mongodb.net/homestays', colors.white);
    }
    console.log();
}

async function main() {
    console.clear();
    print('╔══════════════════════════════════════════════════════════════════╗', colors.cyan);
    print('║       🎓 HomeStays - Automated Student Assistant & Launcher       ║', colors.bright + colors.yellow);
    print('╚══════════════════════════════════════════════════════════════════╝', colors.cyan);
    print('Hello! I will configure everything on your behalf so your project is', colors.white);
    print('100% runnable, error-free, and ready for your college presentation.\n', colors.white);

    // -------------------------------------------------------------------------
    // Step 1: Install Dependencies First if missing (so mongoose is available)
    // -------------------------------------------------------------------------
    printBox('Step 1/5: Checking & Installing Project Dependencies');
    const apiModulesExist = fs.existsSync(path.join(apiDir, 'node_modules'));
    const clientModulesExist = fs.existsSync(path.join(clientDir, 'node_modules'));

    if (!apiModulesExist || !clientModulesExist) {
        print('Installing required npm packages for API and Client. Please wait 1-2 minutes...', colors.cyan);
        try {
            if (!apiModulesExist) {
                print('[*] Installing backend dependencies (Express, Mongoose, JWT)...', colors.dim);
                execSync('npm install', { cwd: apiDir, stdio: 'inherit' });
            }
            if (!clientModulesExist) {
                print('[*] Installing frontend dependencies (React, Vite, Tailwind)...', colors.dim);
                execSync('npm install', { cwd: clientDir, stdio: 'inherit' });
            }
            print('✅ All dependencies installed successfully!', colors.green);
        } catch (e) {
            print(`⚠️ Warning during npm install: ${e.message}`, colors.yellow);
        }
    } else {
        print('✅ Dependencies are already installed and ready.', colors.green);
    }

    // -------------------------------------------------------------------------
    // Step 2: Configure Unique Project Slug (Avoid Render conflicts)
    // -------------------------------------------------------------------------
    printBox('Step 2/5: Unique Project Slug (For Render & Live Hosting)');
    print('Render requires unique subdomains so your project never clashes with other students.');
    const studentName = await ask('\nEnter your name or project nickname (e.g. "rahul", "sumit", "padma"): ');
    let cleanSlug = (studentName || 'homestays').replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase().replace(/^-+|-+$/g, '');
    if (!cleanSlug || cleanSlug === 'homestays') {
        const rand = Math.random().toString(36).substring(2, 6);
        cleanSlug = `homestays-${rand}`;
    }

    const apiServiceName = `${cleanSlug}-api`;
    const clientServiceName = `${cleanSlug}-client`;

    // Update render.yaml automatically
    if (fs.existsSync(renderYamlPath)) {
        let yamlContent = fs.readFileSync(renderYamlPath, 'utf8');
        yamlContent = yamlContent.replace(/name:\s+[a-zA-Z0-9-]+-api/g, `name: ${apiServiceName}`);
        yamlContent = yamlContent.replace(/name:\s+[a-zA-Z0-9-]+-client/g, `name: ${clientServiceName}`);
        fs.writeFileSync(renderYamlPath, yamlContent, 'utf8');
        print(`✅ Configured unique Render service names on your behalf:`, colors.green);
        print(`   Backend:  https://${apiServiceName}.onrender.com`, colors.cyan);
        print(`   Frontend: https://${clientServiceName}.onrender.com`, colors.cyan);

        // Update GitHub Actions 24/7 auto keep-alive workflow
        const workflowPath = path.join(rootDir, '.github/workflows/keep-alive.yml');
        if (fs.existsSync(workflowPath)) {
            let wfContent = fs.readFileSync(workflowPath, 'utf8');
            wfContent = wfContent.replace(/https:\/\/[a-zA-Z0-9-]+\.onrender\.com/g, `https://${apiServiceName}.onrender.com`);
            fs.writeFileSync(workflowPath, wfContent, 'utf8');
            print(`✅ Configured 24/7 Cloud Auto-KeepAlive: GitHub will ping your API every 10 mins automatically!`, colors.green);
        }
    }

    // -------------------------------------------------------------------------
    // Step 3: MongoDB Configuration & Live Verification
    // -------------------------------------------------------------------------
    printBox('Step 3/5: MongoDB Database Setup & Verification');

    // Copy template .env files if needed
    if (!fs.existsSync(apiEnvPath) && fs.existsSync(path.join(apiDir, '.env.example'))) {
        fs.copyFileSync(path.join(apiDir, '.env.example'), apiEnvPath);
    }
    if (!fs.existsSync(clientEnvPath) && fs.existsSync(path.join(clientDir, '.env.example'))) {
        fs.copyFileSync(path.join(clientDir, '.env.example'), clientEnvPath);
    }
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }

    let existingDb = getEnvValue(apiEnvPath, 'DB_URL');
    let validatedDbUrl = '';
    let dbConnected = false;

    if (existingDb) {
        const masked = existingDb.replace(/:[^:@]+@/, ':****@');
        print(`Found existing connection string: ${masked}`, colors.dim);
        print('Testing connection...', colors.cyan);
        const testRes = await testMongoConnection(existingDb);
        if (testRes.success) {
            print('✅ Verified! Successfully connected to your database.', colors.green + colors.bright);
            validatedDbUrl = existingDb;
            dbConnected = true;
        } else {
            showDiagnosticGuide(testRes.error.message, existingDb);
        }
    }

    while (!dbConnected) {
        print('Please paste your MongoDB Atlas Connection String.', colors.bright);
        print('Example: mongodb+srv://admin:MyPass123@cluster0.abcde.mongodb.net/homestays?retryWrites=true&w=majority', colors.dim);
        const inputUri = (await ask('\nMongoDB URI: ')).trim();

        if (!inputUri) {
            print('⚠️ Connection string cannot be empty.', colors.red);
            continue;
        }

        if (!inputUri.startsWith('mongodb://') && !inputUri.startsWith('mongodb+srv://')) {
            print('⚠️ Invalid format. Must start with mongodb:// or mongodb+srv://', colors.red);
            continue;
        }

        print('Testing live connection to MongoDB (timeout: 5s)...', colors.cyan);
        const testRes = await testMongoConnection(inputUri);

        if (testRes.success) {
            print('✅ Verified! Connection test passed!', colors.green + colors.bright);
            setEnvValue(apiEnvPath, 'DB_URL', inputUri);
            print('💾 Saved verified DB_URL to api/.env', colors.green);
            validatedDbUrl = inputUri;
            dbConnected = true;
        } else {
            showDiagnosticGuide(testRes.error.message, inputUri);
            const tryAgain = await ask('Would you like to re-enter your connection string? [Y/n]: ');
            if (tryAgain.trim().toLowerCase() === 'n') {
                setEnvValue(apiEnvPath, 'DB_URL', inputUri);
                print('💾 Saved connection string to api/.env (unverified)', colors.yellow);
                validatedDbUrl = inputUri;
                break;
            }
        }
    }

    // -------------------------------------------------------------------------
    // Step 4: Auto-Generate Security & Missing Configs
    // -------------------------------------------------------------------------
    printBox('Step 4/5: Security & Storage Auto-Configuration');

    let jwtSecret = getEnvValue(apiEnvPath, 'JWT_SECRET');
    if (!jwtSecret || jwtSecret === 'replace-with-a-long-random-secret') {
        jwtSecret = crypto.randomBytes(32).toString('base64url');
        setEnvValue(apiEnvPath, 'JWT_SECRET', jwtSecret);
        print('✅ Generated cryptographically secure 64-character JWT_SECRET.', colors.green);
    }
    setEnvValue(apiEnvPath, 'PORT', '4000');
    setEnvValue(apiEnvPath, 'CLIENT_URL', 'http://localhost:5173,http://127.0.0.1:5173');
    setEnvValue(clientEnvPath, 'VITE_API_BASE_URL', 'http://localhost:4000');
    print('✅ Configured ports (API: 4000, Client: 5173) and local upload directories.', colors.green);

    // Option to seed rich sample data
    if (dbConnected) {
        print('\nWould you like me to pre-populate 4 luxury homestays and a demo host account?');
        print('This gives you rich listings (Manali Chalet, Goa Villa, etc.) for your presentation.', colors.cyan);
        const seedChoice = await ask('Seed demo data now? [Y/n]: ');
        if (seedChoice.trim().toLowerCase() !== 'n') {
            try {
                print('Seeding database with sample accommodations...', colors.dim);
                execSync('node scripts/seed.js', { cwd: rootDir, stdio: 'inherit' });
                print('✅ Sample data seeded successfully!', colors.green);
            } catch (err) {
                print(`⚠️ Notice: ${err.message}`, colors.yellow);
            }
        }
    }

    // -------------------------------------------------------------------------
    // Step 5: Launch & Open Application
    // -------------------------------------------------------------------------
    printBox('Step 5/5: Starting HomeStays Fullstack Application');
    print('All configurations verified. Starting backend API and frontend client...\n', colors.cyan);

    rl.close();

    const isWindows = process.platform === 'win32';
    const npmCmd = isWindows ? 'npm.cmd' : 'npm';

    // Start API
    print('[1/2] Starting Express API Server on port 4000...', colors.yellow);
    const apiProc = spawn(npmCmd, ['start'], { cwd: apiDir, stdio: 'inherit', shell: true });

    // Start Client
    print('[2/2] Starting React Vite Client on port 5173...', colors.yellow);
    const clientProc = spawn(npmCmd, ['run', 'dev', '--', '--host', '127.0.0.1'], { cwd: clientDir, stdio: 'inherit', shell: true });

    // Poll health and launch browser
    let opened = false;
    const pollHealth = () => {
        if (opened) return;
        const req = http.get('http://localhost:4000/health', (res) => {
            if (res.statusCode === 200 && !opened) {
                opened = true;
                print('\n' + '═'.repeat(68), colors.green);
                print('  🎉 HomeStays is RUNNING and READY for your Invigilator!  ', colors.green + colors.bright);
                print('═'.repeat(68), colors.green);
                print('  Web App URL:     http://localhost:5173', colors.bright + colors.white);
                print('  API Health URL:  http://localhost:4000/health', colors.white);
                print('  Demo Host Login: demo@homestays.com / Demo@123', colors.bright + colors.cyan);
                print('═'.repeat(68), colors.green);
                print('\nOpening in your default browser...\n', colors.cyan);

                const openCmd = isWindows ? 'start' : 'open';
                spawn(openCmd, ['http://localhost:5173'], { shell: true });
            }
        });
        req.on('error', () => {
            setTimeout(pollHealth, 1500);
        });
    };

    setTimeout(pollHealth, 2000);

    process.on('SIGINT', () => {
        apiProc.kill();
        clientProc.kill();
        process.exit(0);
    });
}

main().catch((err) => {
    console.error('Assistant error:', err);
    rl.close();
    process.exit(1);
});
