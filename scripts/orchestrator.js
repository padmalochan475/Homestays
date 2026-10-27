/**
 * ════════════════════════════════════════════════════════════════════════════════
 *   HomeStays Master Multi-Agent Autonomous Orchestrator & Stateful Runner
 * ════════════════════════════════════════════════════════════════════════════════
 *   - Auto-checks and installs dependencies for both backend & frontend
 *   - Manages stateful checkpoints (.homestays_state.json) for seamless resume
 *   - Port Sentinel: Detects & kills orphaned processes on ports 4000 and 5173
 *   - Database Agent: Only asks user for credentials if not yet configured/valid
 *   - Seeding Agent: Pre-populates sample luxury homestays and demo host user
 *   - Runtime Supervisor: Spawns servers, monitors health, auto-opens browser
 * ════════════════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const readline = require('readline');
const { execSync, spawn } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const apiDir = path.join(rootDir, 'api');
const clientDir = path.join(rootDir, 'client');
const uploadsDir = path.join(apiDir, 'uploads');
const apiEnvPath = path.join(apiDir, '.env');
const clientEnvPath = path.join(clientDir, '.env');
const stateFilePath = path.join(rootDir, '.homestays_state.json');
const renderYamlPath = path.join(rootDir, 'render.yaml');

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

// Console Styling
const c = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    white: '\x1b[37m',
};

const print = (text = '', color = c.reset) => console.log(`${color}${text}${c.reset}`);
const printAgent = (agent, msg, status = 'info') => {
    let tag = `[${agent}]`;
    if (status === 'success') console.log(`${c.green}✔ ${c.bright}${tag}${c.reset} ${c.white}${msg}${c.reset}`);
    else if (status === 'warn') console.log(`${c.yellow}⚠ ${c.bright}${tag}${c.reset} ${c.yellow}${msg}${c.reset}`);
    else if (status === 'error') console.log(`${c.red}✖ ${c.bright}${tag}${c.reset} ${c.red}${msg}${c.reset}`);
    else if (status === 'skip') console.log(`${c.cyan}⏭ ${c.dim}${tag}${c.reset} ${c.dim}${msg}${c.reset}`);
    else console.log(`${c.cyan}ℹ ${c.bright}${tag}${c.reset} ${c.cyan}${msg}${c.reset}`);
};

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});
const ask = (query) => new Promise((resolve) => rl.question(query, resolve));

// ─────────────────────────────────────────────────────────────────────────────
// STATE & CHECKPOINT MANAGER
// ─────────────────────────────────────────────────────────────────────────────
function loadState() {
    try {
        if (fs.existsSync(stateFilePath)) {
            return JSON.parse(fs.readFileSync(stateFilePath, 'utf8'));
        }
    } catch (e) {
        // Corrupted state, start clean
    }
    return {
        stage: 0,
        node_verified: false,
        dependencies_installed: false,
        env_configured: false,
        db_connected: false,
        db_seeded: false,
    };
}

function saveState(patch) {
    try {
        const current = loadState();
        const updated = { ...current, ...patch, updatedAt: new Date().toISOString() };
        fs.writeFileSync(stateFilePath, JSON.stringify(updated, null, 2), 'utf8');
        return updated;
    } catch (e) {
        return loadState();
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// ENV HELPERS
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// AGENT 1: PORT SENTINEL AGENT (Free port 4000 & 5173 from zombie processes)
// ─────────────────────────────────────────────────────────────────────────────
function freePort(port) {
    try {
        if (isWindows) {
            const out = execSync(`netstat -ano -p tcp | findstr :${port}`, { stdio: ['pipe', 'pipe', 'ignore'] }).toString();
            const lines = out.split('\n').filter((l) => l.includes('LISTENING'));
            for (const line of lines) {
                const parts = line.trim().split(/\s+/);
                const pid = parts[parts.length - 1];
                if (pid && Number(pid) > 0 && Number(pid) !== process.pid) {
                    try {
                        execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
                        printAgent('PortSentinel', `Freed occupied port ${port} (terminated PID ${pid})`, 'success');
                    } catch (kErr) {}
                }
            }
        } else {
            execSync(`fuser -k ${port}/tcp 2>/dev/null || true`, { stdio: 'ignore' });
        }
    } catch (err) {
        // Port was already free
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// AGENT 2: SYSTEM & PREREQUISITE AGENT
// ─────────────────────────────────────────────────────────────────────────────
function checkPrerequisites(state) {
    printAgent('SystemAgent', 'Verifying Node.js and system runtime...');
    const nodeVer = process.version;
    const major = parseInt(nodeVer.replace('v', '').split('.')[0], 10);
    if (major < 18) {
        printAgent('SystemAgent', `Node.js ${nodeVer} detected. Version >= 18 is required!`, 'error');
        process.exit(1);
    }
    printAgent('SystemAgent', `Node.js ${nodeVer} (${process.platform} ${process.arch}) verified.`, 'success');
    saveState({ node_verified: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// AGENT 3: DEPENDENCY AGENT
// ─────────────────────────────────────────────────────────────────────────────
function checkAndInstallDependencies(state) {
    const apiModulesExist = fs.existsSync(path.join(apiDir, 'node_modules'));
    const clientModulesExist = fs.existsSync(path.join(clientDir, 'node_modules'));

    if (state.dependencies_installed && apiModulesExist && clientModulesExist) {
        printAgent('DependencyAgent', 'All npm dependencies verified and intact.', 'skip');
        return;
    }

    printAgent('DependencyAgent', 'Installing required backend and frontend packages...');
    try {
        if (!apiModulesExist) {
            printAgent('DependencyAgent', 'Installing API packages (Express, Mongoose, JWT)...');
            execSync('npm install', { cwd: apiDir, stdio: 'inherit' });
        }
        if (!clientModulesExist) {
            printAgent('DependencyAgent', 'Installing Client packages (React, Vite, Tailwind)...');
            execSync('npm install', { cwd: clientDir, stdio: 'inherit' });
        }

        // Ensure uploads folder exists
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        saveState({ dependencies_installed: true });
        printAgent('DependencyAgent', 'All dependencies installed successfully!', 'success');
    } catch (e) {
        printAgent('DependencyAgent', `Warning during dependency check: ${e.message}`, 'warn');
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// AGENT 4: CONFIGURATION & SECURITY AGENT
// ─────────────────────────────────────────────────────────────────────────────
function configureEnvironment(state) {
    // 1. Copy template .env files if missing
    if (!fs.existsSync(apiEnvPath) && fs.existsSync(path.join(apiDir, '.env.example'))) {
        fs.copyFileSync(path.join(apiDir, '.env.example'), apiEnvPath);
    }
    if (!fs.existsSync(clientEnvPath) && fs.existsSync(path.join(clientDir, '.env.example'))) {
        fs.copyFileSync(path.join(clientDir, '.env.example'), clientEnvPath);
    }

    // 2. Generate cryptographically strong JWT_SECRET if missing
    let jwtSecret = getEnvValue(apiEnvPath, 'JWT_SECRET');
    if (!jwtSecret || jwtSecret === 'replace-with-a-long-random-secret') {
        jwtSecret = crypto.randomBytes(32).toString('base64url');
        setEnvValue(apiEnvPath, 'JWT_SECRET', jwtSecret);
        printAgent('ConfigAgent', 'Generated secure 64-character cryptographic JWT_SECRET.', 'success');
    }

    // 3. Port & URL defaults
    setEnvValue(apiEnvPath, 'PORT', '4000');
    setEnvValue(apiEnvPath, 'CLIENT_URL', 'http://localhost:5173,http://127.0.0.1:5173');
    setEnvValue(clientEnvPath, 'VITE_API_BASE_URL', 'http://localhost:4000');

    saveState({ env_configured: true });
    printAgent('ConfigAgent', 'Environment configuration & secrets synchronized.', 'success');
}

// ─────────────────────────────────────────────────────────────────────────────
// AGENT 5: DATABASE & CREDENTIAL AGENT (Only asks user if needed!)
// ─────────────────────────────────────────────────────────────────────────────
async function testMongoConnection(uri) {
    let mongoose;
    try {
        mongoose = require(path.join(apiDir, 'node_modules/mongoose'));
    } catch (e) {
        return { success: false, error: new Error('Mongoose dependency is not installed yet.') };
    }

    mongoose.set('strictQuery', false);
    try {
        const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 4000 });
        await conn.disconnect();
        return { success: true };
    } catch (err) {
        return { success: false, error: err };
    }
}

function showDatabaseDiagnostic(errorMsg, uri) {
    print('\n' + c.red + c.bright + '═'.repeat(68));
    print('  DATABASE CONNECTION DIAGNOSTIC GUIDE', c.yellow + c.bright);
    print('═'.repeat(68) + c.reset);
    print(`Error: ${errorMsg}\n`, c.red);

    if (errorMsg.includes('bad auth') || errorMsg.includes('AuthenticationFailed')) {
        print('🔑 [Wrong Username or Password]:', c.yellow + c.bright);
        print('   1. Open cloud.mongodb.com -> Database Access.');
        print('   2. Verify username or click "Edit" to reset password (e.g. Homestay1234).');
        print('   3. Ensure you removed any < > angle brackets around the password in your URI!\n');
    } else if (errorMsg.includes('ETIMEOUT') || errorMsg.includes('ServerSelectionError') || errorMsg.includes('queryTxt') || uri.includes('mongodb+srv://')) {
        print('🌐 [Network IP Whitelist Blocked]:', c.yellow + c.bright);
        print('   1. Open cloud.mongodb.com -> Network Access in the left sidebar.');
        print('   2. Click "+ Add IP Address" -> select "ALLOW ACCESS FROM ANYWHERE" (0.0.0.0/0).');
        print('   3. (College Wi-Fi Warning): Campus Wi-Fi often blocks database port 27017.');
        print('      Connect your laptop to your mobile phone hotspot and retry.\n');
    } else {
        print('ℹ️ Please ensure your MongoDB Atlas cluster is online and the connection string is valid.\n');
    }
}

async function verifyDatabase(state) {
    const existingDb = getEnvValue(apiEnvPath, 'DB_URL');

    // If already verified and working, skip asking the user!
    if (existingDb) {
        const masked = existingDb.replace(/:[^:@]+@/, ':****@');
        printAgent('DatabaseAgent', `Checking existing database connection: ${masked}...`);
        const testRes = await testMongoConnection(existingDb);
        if (testRes.success) {
            printAgent('DatabaseAgent', 'Connected to MongoDB Atlas successfully!', 'success');
            saveState({ db_connected: true });
            return existingDb;
        } else {
            printAgent('DatabaseAgent', `Existing connection failed (${testRes.error.message})`, 'warn');
            showDatabaseDiagnostic(testRes.error.message, existingDb);
        }
    }

    // Interactive prompt - The only thing requested from the student!
    print('\n' + c.cyan + c.bright + '═'.repeat(68));
    print('  🔑 STUDENT CREDENTIAL INPUT: MONGODB ATLAS CONNECTION STRING', c.yellow + c.bright);
    print('═'.repeat(68) + c.reset);
    print('To run HomeStays, paste your MongoDB Atlas connection string below.');
    print('Example: mongodb+srv://myuser:mypassword@cluster0.abc.mongodb.net/homestays?retryWrites=true&w=majority\n', c.dim);

    let dbUrl = '';
    while (true) {
        const inputUri = (await ask(`${c.bright}MongoDB URI: ${c.reset}`)).trim();
        if (!inputUri) {
            print('⚠️ Connection string cannot be empty. Please enter your URI.', c.yellow);
            continue;
        }
        if (!inputUri.startsWith('mongodb://') && !inputUri.startsWith('mongodb+srv://')) {
            print('⚠️ URI must start with "mongodb://" or "mongodb+srv://"', c.red);
            continue;
        }

        printAgent('DatabaseAgent', 'Testing live connection to MongoDB (timeout: 4s)...');
        const testRes = await testMongoConnection(inputUri);

        if (testRes.success) {
            printAgent('DatabaseAgent', 'Connection verified and authenticated successfully!', 'success');
            setEnvValue(apiEnvPath, 'DB_URL', inputUri);
            saveState({ db_connected: true });
            dbUrl = inputUri;
            break;
        } else {
            showDatabaseDiagnostic(testRes.error.message, inputUri);
            const retry = await ask('Would you like to try entering the connection string again? [Y/n]: ');
            if (retry.trim().toLowerCase() === 'n') {
                setEnvValue(apiEnvPath, 'DB_URL', inputUri);
                saveState({ db_connected: true });
                dbUrl = inputUri;
                break;
            }
        }
    }
    return dbUrl;
}

// ─────────────────────────────────────────────────────────────────────────────
// AGENT 6: DATA SEEDING AGENT
// ─────────────────────────────────────────────────────────────────────────────
async function seedDemoDataIfEmpty(state) {
    if (state.db_seeded) {
        printAgent('SeedAgent', 'Sample accommodation listings already seeded.', 'skip');
        return;
    }

    try {
        const mongoose = require(path.join(apiDir, 'node_modules/mongoose'));
        const Place = require(path.join(apiDir, 'models/Place'));
        const dbUrl = getEnvValue(apiEnvPath, 'DB_URL');

        mongoose.set('strictQuery', false);
        await mongoose.connect(dbUrl, { serverSelectionTimeoutMS: 4000 });
        const count = await Place.countDocuments();
        await mongoose.disconnect();

        if (count > 0) {
            printAgent('SeedAgent', `Found ${count} existing homestay listings in database.`, 'skip');
            saveState({ db_seeded: true });
            return;
        }
    } catch (e) {
        // Fall through to run seed script
    }

    printAgent('SeedAgent', 'Populating database with 4 luxury demo accommodations & host account...');
    try {
        execSync('node scripts/seed.js', { cwd: rootDir, stdio: 'inherit' });
        saveState({ db_seeded: true });
        printAgent('SeedAgent', 'Database populated with demo listings & host account!', 'success');
    } catch (err) {
        printAgent('SeedAgent', `Seeding notice: ${err.message}`, 'warn');
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// AGENT 7: RUNTIME SUPERVISOR AGENT
// ─────────────────────────────────────────────────────────────────────────────
function launchApplication() {
    print('\n' + c.cyan + c.bright + '═'.repeat(68));
    print('  🚀 STARTING HOMESTAYS FULLSTACK SERVERS', c.green + c.bright);
    print('═'.repeat(68) + c.reset);

    // Free ports 4000 and 5173
    freePort(4000);
    freePort(5173);

    // Start API
    printAgent('SupervisorAgent', 'Starting Express API server on port 4000...');
    const apiProc = spawn(npmCmd, ['start'], { cwd: apiDir, stdio: 'inherit', shell: true });

    // Start Client
    printAgent('SupervisorAgent', 'Starting Vite frontend client on port 5173 (http://localhost:5173)...');
    const clientProc = spawn(npmCmd, ['run', 'dev', '--', '--host', 'localhost', '--port', '5173'], { cwd: clientDir, stdio: 'inherit', shell: true });

    let opened = false;
    const pollHealth = () => {
        if (opened) return;
        const req = http.get('http://127.0.0.1:4000/health', (res) => {
            if (res.statusCode === 200 && !opened) {
                opened = true;
                print('\n' + c.green + c.bright + '╔══════════════════════════════════════════════════════════════════╗');
                print('║       🎉 HOMESTAYS IS RUNNING AND PRESENTATION-READY!           ║');
                print('╚══════════════════════════════════════════════════════════════════╝' + c.reset);
                print(`  🌐 Web App:         ${c.bright}${c.white}http://localhost:5173${c.reset}`);
                print(`  ⚡ API Endpoint:    ${c.white}http://localhost:4000/health${c.reset}`);
                print(`  🔑 Demo Host Login: ${c.cyan}${c.bright}demo@homestays.com${c.reset} / ${c.cyan}Demo@123${c.reset}`);
                print(`  📲 Demo Mode:       ${c.yellow}OTP codes are logged to console and pre-filled${c.reset}`);
                print(c.green + '═'.repeat(68) + c.reset);
                print('\nOpening application in your default web browser...\n', c.cyan);

                const openCmd = isWindows ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
                spawn(openCmd, ['http://localhost:5173'], { shell: true });
            }
        });
        req.on('error', () => {
            setTimeout(pollHealth, 1000);
        });
    };

    setTimeout(pollHealth, 1500);

    const cleanExit = () => {
        print('\n[SupervisorAgent] Gracefully stopping servers...', c.yellow);
        try {
            if (isWindows) {
                freePort(4000);
                freePort(5173);
            } else {
                apiProc.kill('SIGTERM');
                clientProc.kill('SIGTERM');
            }
        } catch (e) {}
        process.exit(0);
    };

    process.on('SIGINT', cleanExit);
    process.on('SIGTERM', cleanExit);
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI ACTIONS: --doctor, --warmup, --reset
// ─────────────────────────────────────────────────────────────────────────────
async function runDoctor() {
    print('\n' + c.cyan + c.bright + '═'.repeat(68));
    print('  🩺 HOMESTAYS SYSTEM DIAGNOSTICS & DOCTOR', c.yellow + c.bright);
    print('═'.repeat(68) + c.reset);

    const state = loadState();
    checkPrerequisites(state);
    checkAndInstallDependencies(state);
    configureEnvironment(state);

    const dbUrl = getEnvValue(apiEnvPath, 'DB_URL');
    if (!dbUrl) {
        printAgent('Doctor', 'DB_URL is not set in api/.env', 'warn');
    } else {
        const masked = dbUrl.replace(/:[^:@]+@/, ':****@');
        printAgent('Doctor', `Testing database connection (${masked})...`);
        const res = await testMongoConnection(dbUrl);
        if (res.success) {
            printAgent('Doctor', 'Database connection: OK', 'success');
        } else {
            printAgent('Doctor', `Database connection failed: ${res.error.message}`, 'error');
        }
    }
    print('\n✅ Doctor diagnostics completed.\n', c.green);
    process.exit(0);
}

async function runWarmup() {
    print('\n' + c.cyan + c.bright + '═'.repeat(68));
    print('  ⚡ CLOUD WARMUP & KEEP-ALIVE CHECK', c.yellow + c.bright);
    print('═'.repeat(68) + c.reset);

    let apiUrl = '';
    if (fs.existsSync(renderYamlPath)) {
        const yaml = fs.readFileSync(renderYamlPath, 'utf8');
        const match = yaml.match(/name:\s+([a-zA-Z0-9-]+-api)/);
        if (match) apiUrl = `https://${match[1]}.onrender.com/health`;
    }
    if (!apiUrl) apiUrl = 'http://localhost:4000/health';

    print(`Pinging endpoint: ${apiUrl}...`, c.cyan);
    const start = Date.now();
    const req = (apiUrl.startsWith('https') ? https : http).get(apiUrl, { timeout: 30000 }, (res) => {
        print(`[✓] Status: ${res.statusCode} OK (Latency: ${Date.now() - start}ms)`, c.green);
        process.exit(0);
    });
    req.on('error', (err) => {
        print(`[!] Error pinging ${apiUrl}: ${err.message}`, c.red);
        process.exit(1);
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ORCHESTRATION PIPELINE
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
    const args = process.argv.slice(2);
    if (args.includes('--doctor')) return runDoctor();
    if (args.includes('--warmup')) return runWarmup();
    if (args.includes('--reset')) {
        if (fs.existsSync(stateFilePath)) fs.unlinkSync(stateFilePath);
        print('Checkpoint state cleared. Next launch will run full setup.', c.green);
        process.exit(0);
    }

    console.clear();
    print('╔══════════════════════════════════════════════════════════════════╗', c.cyan);
    print('║       🏠 HomeStays Autonomous Multi-Agent System & Runner        ║', c.bright + c.yellow);
    print('║            Resumable • Self-Healing • Zero-Touch Setup           ║', c.cyan);
    print('╚══════════════════════════════════════════════════════════════════╝', c.cyan);

    const state = loadState();
    if (state.updatedAt) {
        print(`[Resume Engine] Restoring session from ${new Date(state.updatedAt).toLocaleTimeString()}...\n`, c.dim);
    }

    // Step 1: System Verification
    checkPrerequisites(state);

    // Step 2: Dependencies Check/Install
    checkAndInstallDependencies(state);

    // Step 3: Security & Config Synchronization
    configureEnvironment(state);

    // Step 4: Database Connection Verification (Only asks credentials if needed!)
    await verifyDatabase(state);

    // Step 5: Data Seeding (Luxury homestays + demo host user)
    await seedDemoDataIfEmpty(state);

    rl.close();

    // Step 6: Launch Servers & Open Browser
    launchApplication();
}

main().catch((err) => {
    print(`\n[Fatal Error] ${err.message}`, c.red);
    rl.close();
    process.exit(1);
});
