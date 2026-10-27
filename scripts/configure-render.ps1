# ==============================================================================
# configure-render.ps1 - Configure unique service names for Render Blueprint
# Solves the "service name already taken / reserved URL" issue on Render.com
# ==============================================================================
param(
    [string]$ProjectSlug = ""
)

$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = (Resolve-Path (Join-Path $scriptDir '..')).Path
$renderFile = Join-Path $root 'render.yaml'

if (-not (Test-Path $renderFile)) {
    throw "render.yaml not found at $renderFile"
}

if (-not $ProjectSlug) {
    Write-Host ""
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host " Render Unique Service Name Customizer" -ForegroundColor Yellow
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host "Because multiple students deploy this project, names like"
    Write-Host "'homestays-api' and 'homestays-client' are already reserved on Render."
    Write-Host "Provide your name, roll number, or initials (e.g. 'sumit-2026', 'padma-live')."
    Write-Host ""
    $ProjectSlug = Read-Host -Prompt "Enter a unique slug for your Render deployment"
}

$cleanSlug = ($ProjectSlug -replace '[^a-zA-Z0-9-]', '-').ToLower().Trim('-')
if (-not $cleanSlug) {
    $randomId = (-join ((48..57) + (97..122) | Get-Random -Count 5 | ForEach-Object {[char]$_}))
    $cleanSlug = "homestay-$randomId"
}

$apiServiceName = "$cleanSlug-api"
$clientServiceName = "$cleanSlug-client"

$newYaml = @"
services:
  - type: web
    name: $apiServiceName
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
          name: $clientServiceName
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
    name: $clientServiceName
    runtime: static
    rootDir: client
    buildCommand: npm ci && npm run build
    staticPublishPath: ./dist
    envVars:
      - key: VITE_API_BASE_URL
        fromService:
          type: web
          name: $apiServiceName
          property: host
    routes:
      - type: rewrite
        source: /*
        destination: /index.html
"@

[System.IO.File]::WriteAllText($renderFile, $newYaml, [System.Text.UTF8Encoding]::new($false))

# Update GitHub Actions 24/7 Keep-Alive Workflow
$workflowFile = Join-Path $root '.github\workflows\keep-alive.yml'
if (Test-Path $workflowFile) {
    $wfContent = Get-Content $workflowFile -Raw
    $wfContent = [regex]::Replace($wfContent, 'https://[a-zA-Z0-9-]+\.onrender\.com', "https://$apiServiceName.onrender.com")
    [System.IO.File]::WriteAllText($workflowFile, $wfContent, [System.Text.UTF8Encoding]::new($false))
    Write-Host "Updated 24/7 Keep-Alive GitHub Action with https://$apiServiceName.onrender.com" -ForegroundColor Green
}

Write-Host ""
Write-Host "render.yaml updated successfully!" -ForegroundColor Green
Write-Host "API Service:    $apiServiceName (URL: https://$apiServiceName.onrender.com)" -ForegroundColor Cyan
Write-Host "Client Service: $clientServiceName (URL: https://$clientServiceName.onrender.com)" -ForegroundColor Cyan
Write-Host ""
Write-Host "Now push your repository to GitHub, go to Render -> New -> Blueprint, and connect your repo."
Write-Host "Render will deploy with these unique names without any conflicts!"
