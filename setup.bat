@echo off
title HomeStays - Automated Setup and Launcher
cd /d "%~dp0"
echo ======================================================================
echo  HomeStays - One-Click Setup and Run
echo ======================================================================
echo.
echo Starting setup with PowerShell (Bypass execution policy)...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1" %*
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Setup encountered an error (exit code: %ERRORLEVEL%).
    pause
)
