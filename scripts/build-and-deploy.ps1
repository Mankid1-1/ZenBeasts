# ZenBeasts Build and Deploy Script (PowerShell)
# This script builds the Anchor program with optimizations and deploys to the specified cluster

param(
    [string]$Cluster = "devnet"
)

$ErrorActionPreference = "Stop"

# Configuration
$ProgramName = "zenbeasts"

Write-Host "========================================" -ForegroundColor Green
Write-Host "ZenBeasts Build and Deploy Script" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Target Cluster: $Cluster" -ForegroundColor Yellow
Write-Host ""

# Verify prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

# Check Solana CLI
try {
    $solanaVersion = solana --version
    Write-Host "✓ Solana CLI found: $solanaVersion" -ForegroundColor Green
} catch {
    Write-Host "Error: Solana CLI not found" -ForegroundColor Red
    Write-Host "Install from: https://docs.solana.com/cli/install-solana-cli-tools"
    exit 1
}

# Check Anchor CLI
try {
    $anchorVersion = anchor --version
    Write-Host "✓ Anchor CLI found: $anchorVersion" -ForegroundColor Green
} catch {
    Write-Host "Error: Anchor CLI not found" -ForegroundColor Red
    Write-Host "Install from: https://www.anchor-lang.com/docs/installation"
    exit 1
}

# Check Rust
try {
    $rustVersion = rustc --version
    Write-Host "✓ Rust found: $rustVersion" -ForegroundColor Green
} catch {
    Write-Host "Error: Rust/Cargo not found" -ForegroundColor Red
    Write-Host "Install from: https://rustup.rs/"
    exit 1
}

Write-Host ""

# Configure Solana cluster
Write-Host "Configuring Solana cluster..." -ForegroundColor Yellow
switch ($Cluster) {
    "mainnet" {
        solana config set --url https://api.mainnet-beta.solana.com
    }
    "devnet" {
        solana config set --url https://api.devnet.solana.com
    }
    "localnet" {
        solana config set --url http://localhost:8899
    }
    default {
        Write-Host "Error: Invalid cluster specified. Use: devnet, mainnet, or localnet" -ForegroundColor Red
        exit 1
    }
}

# Display current configuration
Write-Host "Current Solana configuration:" -ForegroundColor Green
solana config get
Write-Host ""

# Check wallet balance
$walletAddress = solana address
$balanceLamports = [long](solana balance --lamports)
$balanceSOL = [math]::Round($balanceLamports / 1000000000, 4)

Write-Host "Wallet Information:" -ForegroundColor Yellow
Write-Host "Address: $walletAddress" -ForegroundColor Green
Write-Host "Balance: $balanceSOL SOL" -ForegroundColor Green
Write-Host ""

# Check if sufficient balance for deployment
$minBalance = 5000000000  # 5 SOL minimum for devnet
if ($Cluster -eq "mainnet") {
    $minBalance = 20000000000  # 20 SOL minimum for mainnet
}

if ($balanceLamports -lt $minBalance) {
    $minSOL = [math]::Round($minBalance / 1000000000, 4)
    Write-Host "Warning: Insufficient balance for deployment" -ForegroundColor Red
    Write-Host "Required: $minSOL SOL, Current: $balanceSOL SOL"
    
    if ($Cluster -eq "devnet") {
        Write-Host ""
        Write-Host "Attempting to airdrop SOL..." -ForegroundColor Yellow
        try {
            solana airdrop 5
            $balanceLamports = [long](solana balance --lamports)
            $balanceSOL = [math]::Round($balanceLamports / 1000000000, 4)
            Write-Host "New balance: $balanceSOL SOL" -ForegroundColor Green
        } catch {
            Write-Host "Airdrop failed. Please fund your wallet manually." -ForegroundColor Red
        }
    } else {
        Write-Host "Please fund your wallet before deploying to $Cluster" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# Confirm deployment
if ($Cluster -eq "mainnet") {
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "WARNING: MAINNET DEPLOYMENT" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "This will deploy to MAINNET using REAL SOL!" -ForegroundColor Red
    Write-Host "This action cannot be undone." -ForegroundColor Red
    Write-Host ""
    $confirm = Read-Host "Are you absolutely sure you want to continue? (type 'YES' to confirm)"
    
    if ($confirm -ne "YES") {
        Write-Host "Deployment cancelled." -ForegroundColor Yellow
        exit 0
    }
}

# Clean previous builds
Write-Host "Cleaning previous builds..." -ForegroundColor Yellow
anchor clean
Write-Host "✓ Clean complete" -ForegroundColor Green
Write-Host ""

# Build the program
Write-Host "Building program with optimizations..." -ForegroundColor Yellow
Write-Host "This may take several minutes..." -ForegroundColor Yellow

try {
    if ($Cluster -eq "mainnet") {
        # Build with verifiable flag for mainnet
        anchor build --verifiable
    } else {
        anchor build
    }
    Write-Host "✓ Build complete" -ForegroundColor Green
} catch {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Display build artifacts
Write-Host "Build artifacts:" -ForegroundColor Yellow
Get-ChildItem "target\deploy\$ProgramName.so" | Format-Table Name, Length, LastWriteTime
Write-Host ""

# Get program ID from lib.rs
$libRsContent = Get-Content "programs\$ProgramName\src\lib.rs" -Raw
$programId = [regex]::Match($libRsContent, 'declare_id!\("([^"]+)"\)').Groups[1].Value
Write-Host "Program ID: $programId" -ForegroundColor Green
Write-Host ""

# Deploy the program
Write-Host "Deploying program to $Cluster..." -ForegroundColor Yellow
Write-Host "This may take several minutes..." -ForegroundColor Yellow

try {
    anchor deploy --provider.cluster $Cluster
    Write-Host "✓ Deployment complete" -ForegroundColor Green
} catch {
    Write-Host "Deployment failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Verify deployment
Write-Host "Verifying deployment..." -ForegroundColor Yellow
try {
    solana program show $programId
    Write-Host "✓ Verification complete" -ForegroundColor Green
} catch {
    Write-Host "Verification failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Check if program needs initialization
Write-Host "Checking program initialization status..." -ForegroundColor Yellow
Write-Host "Note: Manual verification required for initialization status" -ForegroundColor Yellow
Write-Host ""
Write-Host "To initialize the program, run:" -ForegroundColor Yellow
Write-Host "npm run initialize" -ForegroundColor Green
Write-Host ""

# Update environment files
Write-Host "Updating environment files..." -ForegroundColor Yellow

# Update .env
if (Test-Path ".env") {
    $envContent = Get-Content ".env" -Raw
    $envContent = $envContent -replace 'NEXT_PUBLIC_PROGRAM_ID=.*', "NEXT_PUBLIC_PROGRAM_ID=$programId"
    Set-Content ".env" $envContent
    Write-Host "✓ Updated .env" -ForegroundColor Green
}

# Update frontend/.env
if (Test-Path "frontend\.env") {
    $frontendEnvContent = Get-Content "frontend\.env" -Raw
    $frontendEnvContent = $frontendEnvContent -replace 'NEXT_PUBLIC_PROGRAM_ID=.*', "NEXT_PUBLIC_PROGRAM_ID=$programId"
    Set-Content "frontend\.env" $frontendEnvContent
    Write-Host "✓ Updated frontend\.env" -ForegroundColor Green
}

Write-Host ""

# Copy IDL to frontend
Write-Host "Copying IDL to frontend..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "frontend\src\lib\anchor" | Out-Null
Copy-Item "target\idl\$ProgramName.json" "frontend\src\lib\anchor\idl.json"
Write-Host "✓ IDL copied to frontend" -ForegroundColor Green

Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Green
Write-Host "Deployment Summary" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Cluster:    $Cluster" -ForegroundColor Yellow
Write-Host "Program ID: $programId" -ForegroundColor Yellow
Write-Host "Wallet:     $walletAddress" -ForegroundColor Yellow
$finalBalance = solana balance
Write-Host "Balance:    $finalBalance" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Green
Write-Host "1. Initialize the program (if not already done)"
Write-Host "2. Update frontend environment variables"
Write-Host "3. Deploy frontend application"
Write-Host "4. Test the deployment"
Write-Host ""
Write-Host "Deployment complete! 🎉" -ForegroundColor Green
