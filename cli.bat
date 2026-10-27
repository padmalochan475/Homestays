@echo off
title HomeStays - Interactive CLI Doctor & Validator
cd /d "%~dp0"
node scripts/cli.js %*
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo CLI finished with exit code %ERRORLEVEL%.
    pause
)
