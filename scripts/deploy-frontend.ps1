# ZenBeasts Frontend Deployment Script
# Requirements: 21.3 - Deploy frontend with mobile support

param(
    [string]$Platform = "vercel",  # vercel, netlify, or self-hosted
    [string]$Environment = "production"  # production or preview
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Green
Write-Host "ZenBeasts Frontend Deployment" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Platform: $Platform" -ForegroundColor Yellow
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host ""

# Change to frontend directory
Set-Location frontend

# Verify prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "Error: Node.js not found" -ForegroundColor Red
    Write-Host "Install from: https://nodejs.org/"
    exit 1
}

# Check npm
try {
    $npmVersion = npm --version
    Write-Host "✓ npm found: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "Error: npm not found" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Verify environment variables
Write-Host "Checking environment variables..." -ForegroundColor Yellow

$requiredEnvVars = @(
    "NEXT_PUBLIC_PROGRAM_ID",
    "NEXT_PUBLIC_ZEN_MINT",
    "NEXT_PUBLIC_RPC_URL"
)

$envFile = if ($Environment -eq "production") { ".env.production" } else { ".env" }

if (Test-Path $envFile) {
    Write-Host "✓ Environment file found: $envFile" -ForegroundColor Green
    
    $envContent = Get-Content $envFile -Raw
    $missingVars = @()
    
    foreach ($var in $requiredEnvVars) {
        if ($envContent -notmatch "$var=.+") {
            $missingVars += $var
        }
    }
    
    if ($missingVars.Count -gt 0) {
        Write-Host "Warning: Missing environment variables:" -ForegroundColor Yellow
        foreach ($var in $missingVars) {
            Write-Host "  - $var" -ForegroundColor Yellow
        }
        Write-Host ""
        $continue = Read-Host "Continue anyway? (y/n)"
        if ($continue -ne "y") {
            exit 1
        }
    } else {
        Write-Host "✓ All required environment variables set" -ForegroundColor Green
    }
} else {
    Write-Host "Warning: Environment file not found: $envFile" -ForegroundColor Yellow
    Write-Host "Create from template: cp .env.template $envFile" -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit 1
    }
}

Write-Host ""

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Run linting
Write-Host "Running linter..." -ForegroundColor Yellow
npm run lint
if ($LASTEXITCODE -ne 0) {
    Write-Host "Warning: Linting issues found" -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit 1
    }
} else {
    Write-Host "✓ Linting passed" -ForegroundColor Green
}
Write-Host ""

# Run tests
Write-Host "Running tests..." -ForegroundColor Yellow
npm run test
if ($LASTEXITCODE -ne 0) {
    Write-Host "Warning: Tests failed" -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit 1
    }
} else {
    Write-Host "✓ Tests passed" -ForegroundColor Green
}
Write-Host ""

# Build the application
Write-Host "Building application..." -ForegroundColor Yellow
Write-Host "This may take several minutes..." -ForegroundColor Yellow

npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Build complete" -ForegroundColor Green
Write-Host ""

# Display build info
Write-Host "Build artifacts:" -ForegroundColor Yellow
if (Test-Path ".next") {
    $buildSize = (Get-ChildItem .next -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "  Build size: $([math]::Round($buildSize, 2)) MB" -ForegroundColor Green
}
Write-Host ""

# Deploy based on platform
switch ($Platform) {
    "vercel" {
        Write-Host "Deploying to Vercel..." -ForegroundColor Yellow
        
        # Check if Vercel CLI is installed
        try {
            vercel --version | Out-Null
            Write-Host "✓ Vercel CLI found" -ForegroundColor Green
        } catch {
            Write-Host "Installing Vercel CLI..." -ForegroundColor Yellow
            npm install -g vercel
        }
        
        Write-Host ""
        Write-Host "Running Vercel deployment..." -ForegroundColor Yellow
        
        if ($Environment -eq "production") {
            vercel --prod
        } else {
            vercel
        }
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Vercel deployment failed!" -ForegroundColor Red
            exit 1
        }
        
        Write-Host "✓ Deployed to Vercel" -ForegroundColor Green
    }
    
    "netlify" {
        Write-Host "Deploying to Netlify..." -ForegroundColor Yellow
        
        # Check if Netlify CLI is installed
        try {
            netlify --version | Out-Null
            Write-Host "✓ Netlify CLI found" -ForegroundColor Green
        } catch {
            Write-Host "Installing Netlify CLI..." -ForegroundColor Yellow
            npm install -g netlify-cli
        }
        
        Write-Host ""
        Write-Host "Running Netlify deployment..." -ForegroundColor Yellow
        
        if ($Environment -eq "production") {
            netlify deploy --prod --dir=.next
        } else {
            netlify deploy --dir=.next
        }
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Netlify deployment failed!" -ForegroundColor Red
            exit 1
        }
        
        Write-Host "✓ Deployed to Netlify" -ForegroundColor Green
    }
    
    "self-hosted" {
        Write-Host "Preparing for self-hosted deployment..." -ForegroundColor Yellow
        
        # Create deployment package
        $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
        $packageName = "zenbeasts-frontend-$timestamp.zip"
        
        Write-Host "Creating deployment package: $packageName" -ForegroundColor Yellow
        
        # Compress build artifacts
        Compress-Archive -Path .next, public, package.json, package-lock.json, next.config.js -DestinationPath "../$packageName" -Force
        
        Write-Host "✓ Deployment package created: $packageName" -ForegroundColor Green
        Write-Host ""
        Write-Host "To deploy to your server:" -ForegroundColor Yellow
        Write-Host "1. Upload $packageName to your server" -ForegroundColor Green
        Write-Host "2. Extract the archive" -ForegroundColor Green
        Write-Host "3. Run: npm install --production" -ForegroundColor Green
        Write-Host "4. Run: npm start" -ForegroundColor Green
        Write-Host ""
        Write-Host "Or use PM2:" -ForegroundColor Yellow
        Write-Host "pm2 start npm --name zenbeasts-frontend -- start" -ForegroundColor Green
    }
    
    default {
        Write-Host "Error: Invalid platform specified" -ForegroundColor Red
        Write-Host "Valid platforms: vercel, netlify, self-hosted" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host ""

# Mobile testing reminder
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "Mobile Testing Checklist" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Please test the following on mobile devices:" -ForegroundColor Yellow
Write-Host "  [ ] Responsive layout (single column)" -ForegroundColor White
Write-Host "  [ ] Touch-friendly buttons" -ForegroundColor White
Write-Host "  [ ] Wallet deep linking" -ForegroundColor White
Write-Host "  [ ] Mobile wallet connections" -ForegroundColor White
Write-Host "  [ ] Readable text sizes" -ForegroundColor White
Write-Host "  [ ] No horizontal scrolling" -ForegroundColor White
Write-Host "  [ ] Smooth scrolling and animations" -ForegroundColor White
Write-Host ""

# Accessibility testing reminder
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "Accessibility Checklist" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Please verify accessibility features:" -ForegroundColor Yellow
Write-Host "  [ ] Keyboard navigation works" -ForegroundColor White
Write-Host "  [ ] Screen reader support" -ForegroundColor White
Write-Host "  [ ] ARIA labels present" -ForegroundColor White
Write-Host "  [ ] Focus indicators visible" -ForegroundColor White
Write-Host "  [ ] Color contrast sufficient" -ForegroundColor White
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Green
Write-Host "Deployment Summary" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Platform:    $Platform" -ForegroundColor Yellow
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Green
Write-Host "1. Test the deployed application"
Write-Host "2. Verify mobile responsiveness"
Write-Host "3. Test wallet connections"
Write-Host "4. Verify accessibility features"
Write-Host "5. Monitor for errors"
Write-Host ""
Write-Host "Deployment complete! 🎉" -ForegroundColor Green

# Return to root directory
Set-Location ..
