@echo off
title HomeStays - Live Render Assistant & Warmup Engine
cd /d "%~dp0"
node scripts/render-assistant.js %*
if %ERRORLEVEL% NEQ 0 (
    echo.
    pause
)
