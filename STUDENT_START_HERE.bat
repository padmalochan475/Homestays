@echo off
title HomeStays - Automated Student Setup Assistant
cd /d "%~dp0"

echo ======================================================================
echo    HomeStays - One-Click Student Setup Assistant
echo ======================================================================
echo.

:: 1. Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [*] Node.js is not detected on your system.
    echo [*] Installing Node.js LTS automatically via Windows Package Manager...
    echo.
    powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "& { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $w = Get-Command winget.exe -ErrorAction SilentlyContinue; if ($w) { Start-Process winget -ArgumentList 'install --id OpenJS.NodeJS.LTS --exact --accept-source-agreements --accept-package-agreements' -Wait -NoNewWindow } else { Write-Host 'Downloading Node.js installer...'; $msi = Join-Path $env:TEMP 'nodejs.msi'; Invoke-WebRequest 'https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi' -OutFile $msi; Start-Process msiexec.exe -ArgumentList '/i', $msi, '/qn', '/norestart' -Wait } }"
    
    :: Refresh Path
    for /f "tokens=*" %%a in ('powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')"') do set "PATH=%%a"
)

:: Re-verify Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [!] Node.js was installed but requires a terminal restart.
    echo Please close this window and double-click STUDENT_START_HERE.bat again.
    pause
    exit /b 1
)

:: 2. Launch the Autonomous Student Assistant Wizard
node scripts/student-wizard.js
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [!] Setup wizard finished with code %ERRORLEVEL%.
    pause
)
