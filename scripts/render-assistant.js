const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const readline = require('readline');

const rootDir = path.join(__dirname, '..');
const renderYamlPath = path.join(rootDir, 'render.yaml');
const clientEnvPath = path.join(rootDir, 'client/.env');

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    bgBlue: '\x1b[44m',
};

const print = (text = '', color = colors.reset) => console.log(`${color}${text}${colors.reset}`);

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

// HTTP request helper with timing
function pingUrl(url, timeoutMs = 45000) {
    return new Promise((resolve) => {
        const parsed = new URL(url);
        const protocol = parsed.protocol === 'https:' ? https : http;
        const startTime = Date.now();

        const req = protocol.get(url, { timeout: timeoutMs }, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                const duration = Date.now() - startTime;
                resolve({
                    success: res.statusCode >= 200 && res.statusCode < 400,
                    status: res.statusCode,
                    duration,
                    data,
                });
            });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({ success: false, error: 'Request Timed Out', duration: Date.now() - startTime });
        });

        req.on('error', (err) => {
            resolve({ success: false, error: err.message, duration: Date.now() - startTime });
        });
    });
}

// -----------------------------------------------------------------------------
// 1. Configure Unique Render Service Names
// -----------------------------------------------------------------------------
async function configureUniqueNames() {
    console.clear();
    print('======================================================================', colors.cyan);
    print('    🛠️  Configure Unique Service Names (Avoid Reserved Domain Errors)  ', colors.yellow + colors.bright);
    print('======================================================================', colors.cyan);
    print('\nWhy this is needed:', colors.white + colors.bright);
    print('Render requires globally unique service subdomains across all accounts.');
    print('Default names like "homestays-api" are already reserved on Render.');
    print('Assigning a unique slug ensures your Blueprint deploys on the first try.\n');

    let currentSlug = 'homestays';
    if (fs.existsSync(renderYamlPath)) {
        const yamlContent = fs.readFileSync(renderYamlPath, 'utf8');
        const match = yamlContent.match(/name:\s+([a-zA-Z0-9-]+)-api/);
        if (match) currentSlug = match[1];
    }

    print(`Current project slug: ${currentSlug}`, colors.dim);
    const inputSlug = await ask('\nEnter a unique slug (e.g. your name or roll number like "sumit-homestays"): ');
    let cleanSlug = (inputSlug || currentSlug).replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase().replace(/^-+|-+$/g, '');

    if (!cleanSlug) {
        const rand = Math.random().toString(36).substring(2, 7);
        cleanSlug = `homestays-${rand}`;
    }

    const apiName = `${cleanSlug}-api`;
    const clientName = `${cleanSlug}-client`;

    const newYaml = `services:
  - type: web
    name: ${apiName}
    runtime: node
    plan: free
    rootDir: api
    buildCommand: npm ci
    startCommand: npm start
    healthCheckPath: /health
    envVars:
      - key: NODE_ENV
        value: production
      - key: DB_URL
        sync: false
      - key: JWT_SECRET
        generateValue: true
      - key: CLIENT_URL
        fromService:
          type: web
          name: ${clientName}
          property: host
      - key: MAIL_USERNAME
        sync: false
      - key: OAUTH_CLIENTID
        sync: false
      - key: OAUTH_CLIENT_SECRET
        sync: false
      - key: OAUTH_REFRESH_TOKEN
        sync: false
      - key: AWS_REGION
        value: eu-north-1
      - key: BUCKET_NAME
        sync: false
      - key: S3_ACCESS_KEY
        sync: false
      - key: S3_SECRET_ACCESS_KEY
        sync: false

  - type: web
    name: ${clientName}
    runtime: static
    rootDir: client
    buildCommand: npm ci && npm run build
    staticPublishPath: ./dist
    envVars:
      - key: VITE_API_BASE_URL
        fromService:
          type: web
          name: ${apiName}
          property: host
    routes:
      - type: rewrite
        source: /*
        destination: /index.html
`;

    fs.writeFileSync(renderYamlPath, newYaml, 'utf8');

    print('\n✅ render.yaml successfully updated!', colors.green + colors.bright);
    print(`   API Service URL:    https://${apiName}.onrender.com`, colors.cyan);
    print(`   Client Web URL:     https://${clientName}.onrender.com`, colors.cyan);
    print('\nNext steps to apply to Render:', colors.yellow);
    print('  1. git add render.yaml', colors.white);
    print('  2. git commit -m "Configure unique Render service names"', colors.white);
    print('  3. git push origin main', colors.white);
    print('\nRender Blueprint will deploy with these exact unique hostnames!');

    await ask('\nPress [Enter] to return to menu...');
}

// -----------------------------------------------------------------------------
// 2. Warm-Up Assistant (Wakes up API, Database, and Client)
// -----------------------------------------------------------------------------
async function warmupAssistant() {
    console.clear();
    print('======================================================================', colors.cyan);
    print('      🔥 Live Warm-Up Assistant (Eliminate 60s Cold Start Delay)       ', colors.yellow + colors.bright);
    print('======================================================================', colors.cyan);
    print('\nRender free tier spins down services after 15 minutes of inactivity.');
    print('This assistant will wake up your container, prime the database pool,');
    print('and ensure your live site responds instantly when the invigilator views it.\n');

    let defaultApiUrl = getEnvValue(clientEnvPath, 'VITE_API_BASE_URL');
    if (!defaultApiUrl || defaultApiUrl.includes('localhost')) {
        if (fs.existsSync(renderYamlPath)) {
            const yamlContent = fs.readFileSync(renderYamlPath, 'utf8');
            const match = yamlContent.match(/name:\s+([a-zA-Z0-9-]+-api)/);
            if (match) defaultApiUrl = `https://${match[1]}.onrender.com`;
        }
    }

    print(`Suggested API URL: ${defaultApiUrl || 'None'}`, colors.dim);
    let apiUrl = (await ask('Enter your live Render API URL (or press Enter to use suggested): ')).trim() || defaultApiUrl;

    if (!apiUrl) {
        print('⚠️ Please provide a valid live URL.', colors.red);
        await ask('\nPress [Enter] to return to menu...');
        return;
    }

    if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
        apiUrl = `https://${apiUrl}`;
    }
    apiUrl = apiUrl.replace(/\/+$/, '');

    print(`\n[1/3] Waking up Render Web Service: ${apiUrl}/health`, colors.cyan);
    print('      (If container was asleep, this may take 30-60 seconds)...', colors.dim);

    const healthResult = await pingUrl(`${apiUrl}/health`);

    if (healthResult.success) {
        print(`      ✅ API is AWAKE! (Status: ${healthResult.status}, Response time: ${healthResult.duration}ms)`, colors.green + colors.bright);
    } else {
        print(`      ❌ Could not wake API: ${healthResult.error || healthResult.status}`, colors.red);
        print('      Make sure the service is deployed and the URL is spelled correctly.', colors.yellow);
        await ask('\nPress [Enter] to return to menu...');
        return;
    }

    print(`\n[2/3] Priming Database Connection Pool: ${apiUrl}/places`, colors.cyan);
    const dbResult = await pingUrl(`${apiUrl}/places`);
    if (dbResult.success) {
        print(`      ✅ Database connection is HOT! (Response time: ${dbResult.duration}ms)`, colors.green + colors.bright);
    } else {
        print(`      ⚠️ Places endpoint returned: ${dbResult.status}. Ensure DB_URL is set in Render env.`, colors.yellow);
    }

    const clientUrl = apiUrl.replace(/-api\.onrender\.com$/, '-client.onrender.com');
    if (clientUrl !== apiUrl) {
        print(`\n[3/3] Warming up Static Client CDN: ${clientUrl}`, colors.cyan);
        const clientResult = await pingUrl(clientUrl);
        if (clientResult.success) {
            print(`      ✅ Frontend CDN is primed! (Response time: ${clientResult.duration}ms)`, colors.green + colors.bright);
        }
    }

    print('\n' + '='.repeat(68), colors.green);
    print('  🎉 All systems are WARM and ready for your college presentation!', colors.green + colors.bright);
    print('='.repeat(68), colors.green);
    print(`  Live Client:  ${clientUrl}`, colors.white);
    print(`  Live API:     ${apiUrl}`, colors.white);
    print(`  Health Check: ${apiUrl}/health`, colors.white);
    print('\nYour invigilator will now experience instantaneous loading with zero delay.');

    await ask('\nPress [Enter] to return to menu...');
}

// -----------------------------------------------------------------------------
// 3. Keep-Alive Sentinel Mode
// -----------------------------------------------------------------------------
async function sentinelMode() {
    console.clear();
    print('======================================================================', colors.cyan);
    print('       🛡️ Sentinel Keep-Alive Mode (Prevents Inactivity Sleep)        ', colors.yellow + colors.bright);
    print('======================================================================', colors.cyan);
    print('\nKeeps your Render server awake by pinging it every 9 minutes.');
    print('Keep this running on your laptop or phone on your presentation day,');
    print('and Render will NEVER go to sleep.\n');

    let defaultApiUrl = getEnvValue(clientEnvPath, 'VITE_API_BASE_URL');
    if (!defaultApiUrl || defaultApiUrl.includes('localhost')) {
        if (fs.existsSync(renderYamlPath)) {
            const yamlContent = fs.readFileSync(renderYamlPath, 'utf8');
            const match = yamlContent.match(/name:\s+([a-zA-Z0-9-]+-api)/);
            if (match) defaultApiUrl = `https://${match[1]}.onrender.com`;
        }
    }

    let apiUrl = (await ask(`Enter Render API URL (default: ${defaultApiUrl}): `)).trim() || defaultApiUrl;
    if (!apiUrl) {
        print('⚠️ URL required.', colors.red);
        await ask('\nPress [Enter] to return...');
        return;
    }
    if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
        apiUrl = `https://${apiUrl}`;
    }
    apiUrl = apiUrl.replace(/\/+$/, '');

    print(`\n🛡️ Sentinel active! Pinging ${apiUrl}/health every 9 minutes.`, colors.green + colors.bright);
    print('Press Ctrl+C anytime to stop sentinel mode.\n', colors.dim);

    let pingCount = 0;
    const executePing = async () => {
        pingCount++;
        const now = new Date().toLocaleTimeString();
        process.stdout.write(`[${now}] Ping #${pingCount} sending... `);
        const res = await pingUrl(`${apiUrl}/health`);
        if (res.success) {
            print(`OK (Status: ${res.status}, ${res.duration}ms)`, colors.green);
        } else {
            print(`FAILED (${res.error || res.status})`, colors.red);
        }
    };

    // First ping immediately
    await executePing();

    // Ping every 9 minutes (540,000 ms)
    setInterval(executePing, 9 * 60 * 1000);

    await new Promise(() => {}); // Keep alive until Ctrl+C
}

// -----------------------------------------------------------------------------
// 4. Student Render & MongoDB Setup Checklist
// -----------------------------------------------------------------------------
async function showChecklist() {
    console.clear();
    print('======================================================================', colors.cyan);
    print('       🎓 Complete Student Setup Walkthrough (MongoDB + Render)       ', colors.yellow + colors.bright);
    print('======================================================================', colors.cyan);

    print('\n[PHASE 1] MongoDB Atlas Setup (cloud.mongodb.com):', colors.yellow + colors.bright);
    print('  1. Sign up and deploy a free M0 Cluster (choose AWS, ap-south-1 Mumbai).');
    print('  2. Create a Database User (e.g. username: admin, password: Homestay1234).');
    print('     ⚠️ AVOID special characters like @, #, $ in your password to prevent URI parsing bugs.');
    print('  3. Configure Network Access: Go to Network Access -> Click "+ Add IP Address"');
    print('     -> Click "ALLOW ACCESS FROM ANYWHERE" (adds 0.0.0.0/0). Click Confirm.');
    print('     🚨 Crucial: If you skip this, Render cannot connect to your database!');
    print('  4. Get your connection string: Database -> Connect -> Drivers.');
    print('     Format: mongodb+srv://admin:Homestay1234@cluster0.xxx.mongodb.net/homestays?retryWrites=true&w=majority');
    print('     ⚠️ Remember to REMOVE < > angle brackets around your password!');

    print('\n[PHASE 2] Preparing Your GitHub Code:', colors.yellow + colors.bright);
    print('  1. Run Option [1] in this tool to assign a unique project slug.');
    print('  2. Push your changes:');
    print('     git add . && git commit -m "Configure unique Render service names" && git push');

    print('\n[PHASE 3] Deploying on Render (dashboard.render.com):', colors.yellow + colors.bright);
    print('  1. Log in with your GitHub account.');
    print('  2. Click "New +" -> "Blueprint".');
    print('  3. Select your HomeStays repository.');
    print('  4. Render automatically reads render.yaml and detects the API and Client services.');
    print('  5. In the Environment Variables box, paste your DB_URL from Phase 1.');
    print('  6. Click "Apply". Both services will build and deploy in ~2 minutes.');

    print('\n[PHASE 4] Viva / Exam Presentation Strategy:', colors.yellow + colors.bright);
    print('  - 5 minutes before your evaluation, run Option [2] (Warm-Up Assistant)');
    print('    or run Option [3] (Sentinel Mode) in the background.');
    print('  - This keeps your free tier awake so the invigilator sees 100ms instant loading!');
    print('  - See STUDENT_DEPLOY_GUIDE.md for complete details.');

    await ask('\nPress [Enter] to return to menu...');
}

// -----------------------------------------------------------------------------
// Main Menu
// -----------------------------------------------------------------------------
async function mainMenu() {
    while (true) {
        console.clear();
        print('======================================================================', colors.cyan);
        print('         🚀 HomeStays - Live Render Assistant & Warmup Engine          ', colors.yellow + colors.bright);
        print('======================================================================', colors.cyan);
        print('Ensure your live college project is perfectly configured, warmed up,');
        print('and responds instantaneously in front of the invigilator.\n');

        print('[1] 🛠️  Configure Unique Service Names in render.yaml (Avoid domain conflicts)', colors.white);
        print('[2] 🔥  Wake Up & Warm Up Live Server (Eliminate 60s cold start delay)', colors.white);
        print('[3] 🛡️  Sentinel Keep-Alive Mode (Keeps Render awake every 9 mins on exam day)', colors.white);
        print('[4] 📋  Step-by-Step Student Setup Guide (MongoDB Atlas + Render Walkthrough)', colors.white);
        print('[5] 🚪  Exit', colors.dim);

        const choice = (await ask('\nSelect an option [1-5]: ')).trim();

        if (choice === '1') {
            await configureUniqueNames();
        } else if (choice === '2') {
            await warmupAssistant();
        } else if (choice === '3') {
            await sentinelMode();
        } else if (choice === '4') {
            await showChecklist();
        } else if (choice === '5') {
            print('\nGoodbye! Best of luck with your college project presentation! 🌟\n', colors.green);
            rl.close();
            process.exit(0);
        }
    }
}

mainMenu().catch((err) => {
    console.error('Assistant error:', err);
    rl.close();
    process.exit(1);
});
