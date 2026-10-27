const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const rootDir = path.join(__dirname, '..');
const apiDir = path.join(rootDir, 'api');
const clientDir = path.join(rootDir, 'client');

console.log('\x1b[36m%s\x1b[0m', '====================================================');
console.log('\x1b[32m%s\x1b[0m', '        Starting HomeStays Fullstack Project        ');
console.log('\x1b[36m%s\x1b[0m', '====================================================\n');

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

// Start API
console.log('\x1b[33m%s\x1b[0m', '[API] Starting Express backend on port 4000...');
const apiProcess = spawn(npmCmd, ['start'], {
    cwd: apiDir,
    stdio: 'inherit',
    shell: true,
});

apiProcess.on('error', (err) => {
    console.error('\x1b[31m%s\x1b[0m', '[API Error] ' + err.message);
});

// Start Client
console.log('\x1b[33m%s\x1b[0m', '[Client] Starting Vite frontend on port 5173...');
const clientProcess = spawn(npmCmd, ['run', 'dev', '--', '--host', '127.0.0.1'], {
    cwd: clientDir,
    stdio: 'inherit',
    shell: true,
});

clientProcess.on('error', (err) => {
    console.error('\x1b[31m%s\x1b[0m', '[Client Error] ' + err.message);
});

// Helper to poll health and open browser
let browserOpened = false;
const checkHealth = () => {
    if (browserOpened) return;
    const req = http.get('http://localhost:4000/health', (res) => {
        if (res.statusCode === 200 && !browserOpened) {
            browserOpened = true;
            console.log('\n\x1b[32m%s\x1b[0m', '[✓] API Health: http://localhost:4000/health (OK)');
            console.log('\x1b[32m%s\x1b[0m', '[✓] Web App:    http://localhost:5173');
            console.log('\x1b[36m%s\x1b[0m', '\nOpening application in your default browser...\n');
            const openCmd = isWindows ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
            spawn(openCmd, ['http://localhost:5173'], { shell: true });
        }
    });
    req.on('error', () => {
        setTimeout(checkHealth, 1500);
    });
};

setTimeout(checkHealth, 2000);

process.on('SIGINT', () => {
    console.log('\nStopping servers...');
    apiProcess.kill();
    clientProcess.kill();
    process.exit(0);
});
