# ZenBeasts Solana Development Environment Installer
# Version: 1.0.0

#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Colors for output
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Success { Write-ColorOutput Green $args }
function Write-Info { Write-ColorOutput Cyan $args }
function Write-Warning { Write-ColorOutput Yellow $args }
function Write-Error { Write-ColorOutput Red $args }

Write-Info "╔════════════════════════════════════════════════════╗"
Write-Info "║   ZenBeasts Solana Development Environment Setup  ║"
Write-Info "╚════════════════════════════════════════════════════╝"
Write-Host ""

# Check if Rust is installed
Write-Info "Checking Rust installation..."
try {
    $rustVersion = rustc --version 2>&1
    Write-Success "✓ Rust found: $rustVersion"
} catch {
    Write-Error "✗ Rust not found. Please run the main installer first."
    exit 1
}

# Check if Solana is installed
Write-Info "Checking Solana CLI..."
try {
    $solanaVersion = solana --version 2>&1
    Write-Success "✓ Solana CLI found: $solanaVersion"
} catch {
    Write-Error "✗ Solana CLI not found. Please run the main installer first."
    exit 1
}

# Configure Solana
Write-Info "`nConfiguring Solana CLI..."

# Prompt for network selection
Write-Host ""
Write-Info "Select Solana network:"
Write-Host "1. Devnet (Recommended for development)"
Write-Host "2. Testnet"
Write-Host "3. Mainnet-beta (Production)"
Write-Host ""

$networkChoice = Read-Host "Select network (1-3) [Default: 1]"
if ([string]::IsNullOrWhiteSpace($networkChoice)) {
    $networkChoice = "1"
}

$network = switch ($networkChoice) {
    "1" { "devnet" }
    "2" { "testnet" }
    "3" { "mainnet-beta" }
    default { "devnet" }
}

Write-Info "Setting Solana network to $network..."
solana config set --url $network

# Check if keypair exists
$keypairPath = "$env:USERPROFILE\.config\solana\id.json"
$hasKeypair = Test-Path $keypairPath

if (-not $hasKeypair) {
    Write-Info "`nNo Solana keypair found."
    $createKeypair = Read-Host "Would you like to create a new keypair? (Y/n)"

    if ($createKeypair -ne 'n' -and $createKeypair -ne 'N') {
        Write-Info "Creating new Solana keypair..."

        # Create config directory if it doesn't exist
        $configDir = Split-Path $keypairPath -Parent
        if (-not (Test-Path $configDir)) {
            New-Item -ItemType Directory -Path $configDir -Force | Out-Null
        }

        solana-keygen new --outfile $keypairPath --no-bip39-passphrase
        Write-Success "✓ Keypair created at: $keypairPath"
    }
} else {
    Write-Success "✓ Keypair found at: $keypairPath"
}

# Show public key
try {
    $pubkey = solana address
    Write-Success "`n✓ Your Solana address: $pubkey"
} catch {
    Write-Warning "Could not retrieve Solana address"
}

# Offer airdrop for devnet/testnet
if ($network -ne "mainnet-beta") {
    Write-Host ""
    $airdrop = Read-Host "Would you like to request an airdrop of 2 SOL? (Y/n)"

    if ($airdrop -ne 'n' -and $airdrop -ne 'N') {
        Write-Info "Requesting airdrop..."
        try {
            solana airdrop 2
            Write-Success "✓ Airdrop successful!"

            # Check balance
            Start-Sleep -Seconds 2
            $balance = solana balance
            Write-Success "✓ Current balance: $balance"
        } catch {
            Write-Warning "⚠ Airdrop failed. You can request it manually with: solana airdrop 2"
        }
    }
}

# Install/Update Anchor
Write-Info "`nChecking Anchor Framework..."
try {
    $anchorVersion = anchor --version 2>&1
    Write-Success "✓ Anchor found: $anchorVersion"

    $updateAnchor = Read-Host "Would you like to update Anchor to the latest version? (y/N)"
    if ($updateAnchor -eq 'y' -or $updateAnchor -eq 'Y') {
        Write-Info "Updating Anchor..."
        cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked --force
        Write-Success "✓ Anchor updated"
    }
} catch {
    Write-Info "Installing Anchor Framework..."
    cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked --force

    if ($LASTEXITCODE -eq 0) {
        Write-Success "✓ Anchor installed successfully"
    } else {
        Write-Error "✗ Anchor installation failed"
        exit 1
    }
}

# Install SPL Token CLI
Write-Info "`nInstalling SPL Token CLI..."
try {
    cargo install spl-token-cli --force
    Write-Success "✓ SPL Token CLI installed"
} catch {
    Write-Warning "⚠ SPL Token CLI installation failed (optional)"
}

# Install Metaboss (optional, for NFT management)
Write-Info "`nMetaboss is a useful tool for NFT management."
$installMetaboss = Read-Host "Would you like to install Metaboss? (y/N)"
if ($installMetaboss -eq 'y' -or $installMetaboss -eq 'Y') {
    Write-Info "Installing Metaboss..."
    try {
        cargo install metaboss --force
        Write-Success "✓ Metaboss installed"
    } catch {
        Write-Warning "⚠ Metaboss installation failed"
    }
}

# Navigate to programs directory and build
$programsDir = Join-Path $PSScriptRoot "..\programs"
if (Test-Path $programsDir) {
    Write-Host ""
    $buildPrograms = Read-Host "Would you like to build the smart contracts now? (y/N)"

    if ($buildPrograms -eq 'y' -or $buildPrograms -eq 'Y') {
        Write-Info "`nBuilding smart contracts..."
        Push-Location $programsDir

        try {
            # Initialize Anchor workspace if needed
            if (-not (Test-Path "Anchor.toml")) {
                Write-Info "Initializing Anchor workspace..."
                anchor init zenbeasts --no-git
            }

            Write-Info "Building programs..."
            anchor build

            if ($LASTEXITCODE -eq 0) {
                Write-Success "✓ Build successful!"
            } else {
                Write-Warning "⚠ Build completed with warnings/errors"
            }
        } catch {
            Write-Warning "⚠ Build failed: $_"
        } finally {
            Pop-Location
        }
    }
}

# Create local validator configuration
Write-Host ""
$setupValidator = Read-Host "Would you like to set up a local test validator configuration? (y/N)"
if ($setupValidator -eq 'y' -or $setupValidator -eq 'Y') {
    $validatorScript = @"
# ZenBeasts Local Validator Startup Script
# Run this to start a local Solana validator for testing

Write-Host "Starting Solana test validator..." -ForegroundColor Cyan

solana-test-validator ``
    --reset ``
    --quiet ``
    --ledger .ledger ``
    --log

Write-Host "Test validator stopped" -ForegroundColor Yellow
"@

    $validatorScriptPath = Join-Path $PSScriptRoot "..\start-validator.ps1"
    Set-Content -Path $validatorScriptPath -Value $validatorScript
    Write-Success "✓ Validator script created: start-validator.ps1"
    Write-Info "  Run it with: .\start-validator.ps1"
}

# Summary
Write-Host ""
Write-Success "════════════════════════════════════════════════════"
Write-Success "  Solana Development Environment Setup Complete!"
Write-Success "════════════════════════════════════════════════════"
Write-Host ""

Write-Info "Configuration Summary:"
Write-Info "  Network: $network"
if (Test-Path $keypairPath) {
    Write-Info "  Keypair: $keypairPath"
}
Write-Host ""

Write-Info "Installed Tools:"
try { $ver = rustc --version; Write-Info "  Rust: $ver" } catch {}
try { $ver = cargo --version; Write-Info "  Cargo: $ver" } catch {}
try { $ver = solana --version; Write-Info "  Solana: $ver" } catch {}
try { $ver = anchor --version; Write-Info "  Anchor: $ver" } catch {}
try { $ver = spl-token --version; Write-Info "  SPL Token: $ver" } catch {}
Write-Host ""

Write-Info "Useful Commands:"
Write-Info "  solana config get              - View current configuration"
Write-Info "  solana balance                 - Check your balance"
Write-Info "  solana airdrop 2               - Request airdrop (devnet/testnet)"
Write-Info "  anchor build                   - Build programs"
Write-Info "  anchor test                    - Run tests"
Write-Info "  anchor deploy                  - Deploy to configured network"
Write-Info "  solana-test-validator          - Start local validator"
Write-Host ""

Write-Info "Next Steps:"
Write-Info "1. Review the programs in: .\programs"
Write-Info "2. Build contracts: cd programs && anchor build"
Write-Info "3. Run tests: anchor test"
Write-Info "4. Deploy: anchor deploy"
Write-Host ""

Write-Success "Happy building! 🚀"
Write-Host ""
