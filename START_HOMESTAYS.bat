@echo off
title HomeStays - 1-Click Autonomous Setup & Runner
cd /d "%~dp0"

echo ======================================================================
echo    HomeStays - One-Click Autonomous Setup & Runner
echo ======================================================================
echo.

:: 1. Auto-detect Node.js or auto-install LTS silently
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [*] Node.js runtime not detected on this system.
    echo [*] Automatically installing Node.js LTS via Windows Package Manager...
    echo.
    powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "& { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $w = Get-Command winget.exe -ErrorAction SilentlyContinue; if ($w) { Start-Process winget -ArgumentList 'install --id OpenJS.NodeJS.LTS --exact --accept-source-agreements --accept-package-agreements' -Wait -NoNewWindow } else { Write-Host 'Downloading official Node.js installer...'; $msi = Join-Path $env:TEMP 'nodejs.msi'; Invoke-WebRequest 'https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi' -OutFile $msi; Start-Process msiexec.exe -ArgumentList '/i', $msi, '/qn', '/norestart' -Wait } }"
    
    :: Refresh Environment PATH
    for /f "tokens=*" %%a in ('powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')"') do set "PATH=%%a"
)

:: Re-verify Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [!] Node.js was installed but requires a terminal refresh.
    echo Please double-click START_HOMESTAYS.bat again to continue.
    pause
    exit /b 1
)

:: 2. Launch the Autonomous Multi-Agent Orchestrator
node scripts/orchestrator.js
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [!] Process exited with code %ERRORLEVEL%.
    pause
)
