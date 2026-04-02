$ErrorActionPreference = "Stop"

# Set path to include the local Node.js binary
$env:PATH = "$PWD\node-v20.11.1-win-x64;$env:PATH"

# Configure npm cache to be on the E drive where there is plenty of space
npm config set cache "$PWD\.npm-cache"

Write-Host "Starting QMS Next.js App..." -ForegroundColor Green
Write-Host "Checking modules..." -ForegroundColor Cyan

# If node_modules doesn't exist, install
if (!(Test-Path "node_modules")) {
    Write-Host "Running npm install (this may take a few minutes)..." -ForegroundColor Yellow
    npm install
}

Write-Host "Generating Prisma client..." -ForegroundColor Yellow
npx prisma generate

Write-Host "Starting Dev Server..." -ForegroundColor Green
npm run dev
