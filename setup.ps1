# ==============================================================================
# HomeStays - Automated Setup & Launcher Script
# ==============================================================================
param(
    [switch]$NoLaunch = $false,
    [string]$DbUri = ""
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$apiDirectory = Join-Path $root 'api'
$clientDirectory = Join-Path $root 'client'
$uploadsDirectory = Join-Path $apiDirectory 'uploads'
$testDbScript = Join-Path $root 'scripts\test-db.js'

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "                HomeStays Project Setup & Launcher                     " -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

function Refresh-Path {
    $machinePath = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    $env:Path = "$machinePath;$userPath"
}

function Install-Node {
    Write-Host "[*] Checking Windows Package Manager (winget)..." -ForegroundColor Yellow
    $winget = Get-Command winget.exe -ErrorAction SilentlyContinue
    if ($winget) {
        Write-Host "[*] Installing Node.js LTS via winget..." -ForegroundColor Cyan
        Start-Process winget -ArgumentList 'install', '--id', 'OpenJS.NodeJS.LTS', '--exact', '--accept-source-agreements', '--accept-package-agreements' -Wait -NoNewWindow
        Refresh-Path
    } else {
        Write-Host "[*] Downloading Node.js LTS MSI installer..." -ForegroundColor Cyan
        $msiUrl = "https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi"
        $msiPath = Join-Path $env:TEMP "nodejs-installer.msi"
        Invoke-WebRequest -Uri $msiUrl -OutFile $msiPath
        Write-Host "[*] Installing Node.js..." -ForegroundColor Cyan
        Start-Process msiexec.exe -ArgumentList "/i `"$msiPath`" /qn /norestart" -Wait
        Refresh-Path
    }
}

function Set-EnvironmentValue {
    param([string]$FilePath, [string]$Key, [string]$Value)

    if (-not (Test-Path $FilePath)) {
        "" | Out-File $FilePath -Encoding utf8
    }

    $content = Get-Content $FilePath -Raw
    $pattern = "(?m)^$([regex]::Escape($Key))=.*$"
    $line = "$Key=$Value"
    if ([regex]::IsMatch($content, $pattern)) {
        $content = [regex]::Replace(
            $content,
            $pattern,
            [System.Text.RegularExpressions.MatchEvaluator]{ param($match) $line }
        )
    } else {
        $content = "$content`r`n$line`r`n"
    }
    [System.IO.File]::WriteAllText($FilePath, $content, [System.Text.UTF8Encoding]::new($false))
}

function Get-EnvironmentValue {
    param([string]$FilePath, [string]$Key)
    if (-not (Test-Path $FilePath)) { return "" }
    $content = Get-Content $FilePath -Raw
    $match = [regex]::Match($content, "(?m)^$([regex]::Escape($Key))=(.*)$")
    if ($match.Success) {
        return $match.Groups[1].Value.Trim()
    }
    return ""
}

# ------------------------------------------------------------------------------
# 1. Verify Node.js
# ------------------------------------------------------------------------------
Write-Host "Step 1/5: Checking Node.js environment..." -ForegroundColor Cyan
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCommand) {
    Install-Node
    $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
}

if (-not $nodeCommand) {
    throw "Node.js was not detected on PATH. Please restart your terminal or install Node.js from https://nodejs.org/"
}

$rawNodeVersion = (node -p "process.versions.node").Trim()
$nodeMajor = [int]($rawNodeVersion.Split('.')[0])
if ($nodeMajor -lt 18) {
    Write-Warning "Detected Node.js v$rawNodeVersion. Node.js 18 or later is recommended."
    Install-Node
}
Write-Host "[OK] Node.js is ready (v$rawNodeVersion)." -ForegroundColor Green

# ------------------------------------------------------------------------------
# 2. Configure Environment Files (.env)
# ------------------------------------------------------------------------------
Write-Host ""
Write-Host "Step 2/5: Configuring Environment Variables..." -ForegroundColor Cyan

$apiEnvPath = Join-Path $apiDirectory '.env'
$apiEnvExample = Join-Path $apiDirectory '.env.example'
$clientEnvPath = Join-Path $clientDirectory '.env'
$clientEnvExample = Join-Path $clientDirectory '.env.example'

if (-not (Test-Path $apiEnvPath) -and (Test-Path $apiEnvExample)) {
    Copy-Item $apiEnvExample $apiEnvPath
    Write-Host "[+] Created api/.env from template." -ForegroundColor Yellow
}

if (-not (Test-Path $clientEnvPath) -and (Test-Path $clientEnvExample)) {
    Copy-Item $clientEnvExample $clientEnvPath
    Write-Host "[+] Created client/.env from template." -ForegroundColor Yellow
}

if (-not (Test-Path $uploadsDirectory)) {
    New-Item -ItemType Directory -Path $uploadsDirectory -Force | Out-Null
    Write-Host "[+] Created uploads directory: api/uploads" -ForegroundColor Yellow
}

$currentPort = Get-EnvironmentValue $apiEnvPath 'PORT'
if (-not $currentPort) {
    Set-EnvironmentValue $apiEnvPath 'PORT' '4000'
}

$currentClientUrl = Get-EnvironmentValue $apiEnvPath 'CLIENT_URL'
if (-not $currentClientUrl) {
    Set-EnvironmentValue $apiEnvPath 'CLIENT_URL' 'http://localhost:5173,http://127.0.0.1:5173'
}

$currentClientApiUrl = Get-EnvironmentValue $clientEnvPath 'VITE_API_BASE_URL'
if (-not $currentClientApiUrl) {
    Set-EnvironmentValue $clientEnvPath 'VITE_API_BASE_URL' 'http://localhost:4000'
}

$currentJwtSecret = Get-EnvironmentValue $apiEnvPath 'JWT_SECRET'
if (-not $currentJwtSecret -or $currentJwtSecret -eq 'replace-with-a-long-random-secret') {
    $randomBytes = New-Object byte[] 32
    $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $generator.GetBytes($randomBytes)
    } finally {
        $generator.Dispose()
    }
    $newSecret = [Convert]::ToBase64String($randomBytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
    Set-EnvironmentValue $apiEnvPath 'JWT_SECRET' $newSecret
    Write-Host "[OK] Generated secure JWT_SECRET in api/.env" -ForegroundColor Green
}

$currentDbUrl = Get-EnvironmentValue $apiEnvPath 'DB_URL'
if ($DbUri) {
    $currentDbUrl = $DbUri
    Set-EnvironmentValue $apiEnvPath 'DB_URL' $currentDbUrl
}

if (-not $currentDbUrl) {
    Write-Host ""
    Write-Host "MongoDB connection string is required." -ForegroundColor Yellow
    Write-Host "Format: mongodb+srv://<username>:<password>@cluster0.xxx.mongodb.net/homestays"
    Write-Host ""
    $enteredDbUrl = Read-Host -Prompt "Enter your MongoDB URI"
    $enteredDbUrl = $enteredDbUrl.Trim()

    if ($enteredDbUrl) {
        $currentDbUrl = $enteredDbUrl
        Set-EnvironmentValue $apiEnvPath 'DB_URL' $currentDbUrl
        Write-Host "[OK] DB_URL saved to api/.env" -ForegroundColor Green
    } else {
        Write-Warning "No DB_URL entered. The API requires a valid DB_URL to connect to the database."
    }
} else {
    $maskedDbUrl = $currentDbUrl -replace ':[^:@]+@', ':****@'
    Write-Host "[OK] DB_URL configured: $maskedDbUrl" -ForegroundColor Green
}

# ------------------------------------------------------------------------------
# 3. Test MongoDB Connection
# ------------------------------------------------------------------------------
Write-Host ""
Write-Host "Step 3/5: Testing MongoDB connection..." -ForegroundColor Cyan
if ($currentDbUrl -and (Test-Path $testDbScript)) {
    try {
        $testResult = & node $testDbScript $currentDbUrl 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK] MongoDB Database Connected successfully!" -ForegroundColor Green
        } else {
            Write-Host "[!] Could not connect to MongoDB database:" -ForegroundColor Yellow
            Write-Host "    $testResult" -ForegroundColor Red
            Write-Host "    Atlas Checklist:" -ForegroundColor Gray
            Write-Host "    1. Network Access: Ensure your IP is whitelisted (or allow 0.0.0.0/0)" -ForegroundColor Gray
            Write-Host "    2. Database Access: Ensure the username and password are correct" -ForegroundColor Gray
        }
    } catch {
        Write-Warning "Could not test database connection: $_"
    }
} else {
    Write-Host "[!] Skipping DB test (DB_URL not configured yet)." -ForegroundColor Yellow
}

# ------------------------------------------------------------------------------
# 4. Install Dependencies
# ------------------------------------------------------------------------------
Write-Host ""
Write-Host "Step 4/5: Installing Dependencies..." -ForegroundColor Cyan

$npmExecutable = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source
if (-not $npmExecutable) {
    $npmExecutable = (Get-Command npm -ErrorAction Stop).Source
}

if (-not (Test-Path (Join-Path $apiDirectory 'node_modules'))) {
    Write-Host "[*] Installing API dependencies..." -ForegroundColor Cyan
    Push-Location $apiDirectory
    try {
        & $npmExecutable install
    } finally {
        Pop-Location
    }
} else {
    Write-Host "[OK] API dependencies already installed." -ForegroundColor Green
}

if (-not (Test-Path (Join-Path $clientDirectory 'node_modules'))) {
    Write-Host "[*] Installing Client dependencies..." -ForegroundColor Cyan
    Push-Location $clientDirectory
    try {
        & $npmExecutable install
    } finally {
        Pop-Location
    }
} else {
    Write-Host "[OK] Client dependencies already installed." -ForegroundColor Green
}

# ------------------------------------------------------------------------------
# 5. Launch Services
# ------------------------------------------------------------------------------
Write-Host ""
Write-Host "Step 5/5: Launching Application..." -ForegroundColor Cyan

if ($NoLaunch) {
    Write-Host "[OK] Setup completed in non-launch mode." -ForegroundColor Green
    return
}

Write-Host "Starting API backend on port 4000..." -ForegroundColor Yellow
$apiProcess = Start-Process -FilePath $npmExecutable -ArgumentList 'start' -WorkingDirectory $apiDirectory -PassThru

Start-Sleep -Seconds 2

Write-Host "Starting Client frontend on port 5173..." -ForegroundColor Yellow
$clientProcess = Start-Process -FilePath $npmExecutable -ArgumentList 'run', 'dev', '--', '--host', '127.0.0.1' -WorkingDirectory $clientDirectory -PassThru

Start-Sleep -Seconds 3

# Check API health
$healthOk = $false
try {
    $healthResponse = Invoke-RestMethod -Uri "http://localhost:4000/health" -TimeoutSec 3 -ErrorAction SilentlyContinue
    if ($healthResponse.status -eq 'ok') {
        $healthOk = $true
    }
} catch {}

if ($healthOk) {
    Write-Host "[OK] API is responding at http://localhost:4000/health" -ForegroundColor Green
} else {
    Write-Host "[*] API process is running..." -ForegroundColor Yellow
}

Write-Host "Opening web browser..." -ForegroundColor Cyan
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Green
Write-Host "              HomeStays is now running successfully!                  " -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Green
Write-Host "  Client URL:     http://localhost:5173" -ForegroundColor White
Write-Host "  API Health:     http://localhost:4000/health" -ForegroundColor White
Write-Host "  Uploads:        http://localhost:4000/uploads" -ForegroundColor White
Write-Host "----------------------------------------------------------------------" -ForegroundColor Gray
Write-Host "  Key Features for College Invigilator Demo:" -ForegroundColor Yellow
Write-Host "  - Register: Demo OTP mode active (OTP shown on screen if email OAuth omitted)"
Write-Host "  - Photos:   Local upload or URL paste works with or without AWS S3"
Write-Host "  - Auth:     JWT Bearer token + Cookie dual authentication works anywhere"
Write-Host "  - Render:   Use .\configure-render.ps1 to set unique service names"
Write-Host "======================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Servers are running in background processes."
