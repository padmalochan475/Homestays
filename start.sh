#!/usr/bin/env bash
# HomeStays - Autonomous Setup & Runner (macOS / Linux)
set -e
cd "$(dirname "$0")"

if ! command -v node &> /dev/null; then
    echo "[!] Node.js is not installed. Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

node scripts/orchestrator.js
