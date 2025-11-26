# ZenBeasts Setup Verification Script
# Version: 1.0.0
# Comprehensive verification of all installed components

#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"

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

# Banner
function Show-Banner {
    Write-Host ""
    Write-ColorOutput Magenta @"
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║           ZenBeasts Setup Verification Tool               ║
║                                                           ║
║         Checking all components and dependencies          ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
"@
    Write-Host ""
}

# Test results tracking
$script:TotalTests = 0
$script:PassedTests = 0
$script:FailedTests = 0
$script:WarningTests = 0
$script:FailedItems = @()

# Test helper function
function Test-Component {
    param(
        [string]$Name,
        [scriptblock]$Test,
        [bool]$Required = $true,
        [string]$FailureMessage = "",
        [string]$SuccessMessage = ""
    )

    $script:TotalTests++
    Write-Host -NoNewline "  Testing $Name... "

    try {
        $result = & $Test
        if ($result) {
            Write-Success "✓"
            if ($SuccessMessage) {
                Write-Info "    $SuccessMessage"
            }
            $script:PassedTests++
            return $true
        } else {
            if ($Required) {
                Write-Error "✗ FAILED"
                if ($FailureMessage) {
                    Write-Error "    $FailureMessage"
                }
                $script:FailedTests++
                $script:FailedItems += $Name
            } else {
                Write-Warning "⚠ OPTIONAL"
                if ($FailureMessage) {
                    Write-Warning "    $FailureMessage"
                }
                $script:WarningTests++
            }
            return $false
        }
    } catch {
        if ($Required) {
            Write-Error "✗ ERROR"
            Write-Error "    $_"
            $script:FailedTests++
            $script:FailedItems += $Name
        } else {
            Write-Warning "⚠ OPTIONAL"
            $script:WarningTests++
        }
        return $false
    }
}

# Get version helper
function Get-ToolVersion {
    param(
        [string]$Command,
        [string]$VersionArg = "--version"
    )

    try {
        $output = & $Command $VersionArg 2>&1 | Select-Object -First 1
        return $output
    } catch {
        return $null
    }
}

# Main verification
Show-Banner

Write-Info "Starting comprehensive verification..."
Write-Info "This may take a few moments..."
Write-Host ""

# ============================================================================
# System Information
# ============================================================================

Write-Info "═══ System Information ═══"
Write-Host ""

Write-Info "  Operating System: $([System.Environment]::OSVersion.VersionString)"
Write-Info "  PowerShell Version: $($PSVersionTable.PSVersion)"
Write-Info "  Architecture: $(if ([System.Environment]::Is64BitOperatingSystem) {'64-bit'} else {'32-bit'})"
Write-Info "  User: $env:USERNAME"
Write-Info "  Computer: $env:COMPUTERNAME"
Write-Host ""

# ============================================================================
# Core Tools
# ============================================================================

Write-Info "═══ Core Development Tools ═══"
Write-Host ""

# Git
Test-Component -Name "Git" -Test {
    try {
        $null = Get-Command git -ErrorAction Stop
        $version = Get-ToolVersion "git"
        Write-Host -NoNewline " ($version) "
        return $true
    } catch {
        return $false
    }
} -SuccessMessage "Git is installed" -FailureMessage "Git is required. Install with: choco install git"

# Node.js
Test-Component -Name "Node.js" -Test {
    try {
        $null = Get-Command node -ErrorAction Stop
        $version = Get-ToolVersion "node"
        Write-Host -NoNewline " ($version) "
        return $true
    } catch {
        return $false
    }
} -SuccessMessage "Node.js is installed" -FailureMessage "Node.js is required. Install with: choco install nodejs-lts"

# npm
Test-Component -Name "npm" -Test {
    try {
        $null = Get-Command npm -ErrorAction Stop
        $version = Get-ToolVersion "npm"
        Write-Host -NoNewline " ($version) "
        return $true
    } catch {
        return $false
    }
} -SuccessMessage "npm is installed" -FailureMessage "npm should be installed with Node.js"

# Python
Test-Component -Name "Python" -Test {
    try {
        $null = Get-Command python -ErrorAction Stop
        $version = Get-ToolVersion "python"
        Write-Host -NoNewline " ($version) "
        return $true
    } catch {
        return $false
    }
} -SuccessMessage "Python is installed" -FailureMessage "Python is required. Install with: choco install python310"

# pip
Test-Component -Name "pip" -Test {
    try {
        $null = Get-Command pip -ErrorAction Stop
        $version = Get-ToolVersion "pip"
        Write-Host -NoNewline " ($version) "
        return $true
    } catch {
        return $false
    }
} -SuccessMessage "pip is installed" -FailureMessage "pip should be installed with Python"

Write-Host ""

# ============================================================================
# Solana Development Tools
# ============================================================================

Write-Info "═══ Solana Development Tools ═══"
Write-Host ""

# Rust
Test-Component -Name "Rust (rustc)" -Test {
    try {
        $null = Get-Command rustc -ErrorAction Stop
        $version = Get-ToolVersion "rustc"
        Write-Host -NoNewline " ($version) "
        return $true
    } catch {
        return $false
    }
} -SuccessMessage "Rust compiler is installed" -FailureMessage "Rust is required for Solana development"

# Cargo
Test-Component -Name "Cargo" -Test {
    try {
        $null = Get-Command cargo -ErrorAction Stop
        $version = Get-ToolVersion "cargo"
        Write-Host -NoNewline " ($version) "
        return $true
    } catch {
        return $false
    }
} -SuccessMessage "Cargo is installed" -FailureMessage "Cargo should be installed with Rust"

# Solana CLI
Test-Component -Name "Solana CLI" -Test {
    try {
        $null = Get-Command solana -ErrorAction Stop
        $version = Get-ToolVersion "solana"
        Write-Host -NoNewline " ($version) "
        return $true
    } catch {
        return $false
    }
} -SuccessMessage "Solana CLI is installed" -FailureMessage "Install with: .\setup\install-solana.ps1"

# Anchor
Test-Component -Name "Anchor Framework" -Test {
    try {
        $null = Get-Command anchor -ErrorAction Stop
        $version = Get-ToolVersion "anchor"
        Write-Host -NoNewline " ($version) "
        return $true
    } catch {
        return $false
    }
} -SuccessMessage "Anchor is installed" -FailureMessage "Install with: cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked"

# SPL Token CLI
Test-Component -Name "SPL Token CLI" -Required $false -Test {
    try {
        $null = Get-Command spl-token -ErrorAction Stop
        $version = Get-ToolVersion "spl-token"
        Write-Host -NoNewline " ($version) "
        return $true
    } catch {
        return $false
    }
} -SuccessMessage "SPL Token CLI is installed" -FailureMessage "Optional: cargo install spl-token-cli"

Write-Host ""

# ============================================================================
# Solana Configuration
# ============================================================================

Write-Info "═══ Solana Configuration ═══"
Write-Host ""

# Check Solana config
Test-Component -Name "Solana Config" -Test {
    try {
        $config = solana config get 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            $config | ForEach-Object { Write-Info "    $_" }
            return $true
        }
        return $false
    } catch {
        return $false
    }
} -SuccessMessage "Solana CLI is configured" -FailureMessage "Run: solana config set --url devnet"

# Check for keypair
Test-Component -Name "Solana Keypair" -Test {
    $keypairPath = "$env:USERPROFILE\.config\solana\id.json"
    if (Test-Path $keypairPath) {
        try {
            $address = solana address 2>&1
            Write-Host -NoNewline " ($address) "
            return $true
        } catch {
            return $false
        }
    }
    return $false
} -SuccessMessage "Keypair exists" -FailureMessage "Create with: solana-keygen new"

# Check SOL balance
Test-Component -Name "SOL Balance" -Required $false -Test {
    try {
        $balance = solana balance 2>&1
        Write-Host -NoNewline " ($balance) "
        return $true
    } catch {
        return $false
    }
} -SuccessMessage "Balance check successful" -FailureMessage "Request airdrop with: solana airdrop 2"

Write-Host ""

# ============================================================================
# Project Structure
# ============================================================================

Write-Info "═══ Project Structure ═══"
Write-Host ""

$rootDir = Split-Path $PSScriptRoot -Parent

# Check directories
Test-Component -Name "Programs Directory" -Test {
    Test-Path (Join-Path $rootDir "programs")
} -FailureMessage "programs/ directory not found"

Test-Component -Name "Bot Hub Directory" -Required $false -Test {
    Test-Path (Join-Path $rootDir "bot-hub")
} -FailureMessage "bot-hub/ directory not found"

Test-Component -Name "Frontend Directory" -Required $false -Test {
    Test-Path (Join-Path $rootDir "frontend")
} -FailureMessage "frontend/ directory not found"

Test-Component -Name "Setup Directory" -Test {
    Test-Path (Join-Path $rootDir "setup")
} -FailureMessage "setup/ directory not found"

Write-Host ""

# ============================================================================
# Environment Files
# ============================================================================

Write-Info "═══ Environment Configuration ═══"
Write-Host ""

Test-Component -Name "Root .env" -Required $false -Test {
    Test-Path (Join-Path $rootDir ".env")
} -FailureMessage "Run: .\setup\config-wizard.ps1"

Test-Component -Name "Bot Hub .env" -Required $false -Test {
    $envPath = Join-Path $rootDir "bot-hub\.env"
    Test-Path $envPath
} -FailureMessage "Run: .\setup\config-wizard.ps1"

Test-Component -Name "Frontend .env.local" -Required $false -Test {
    $envPath = Join-Path $rootDir "frontend\.env.local"
    Test-Path $envPath
} -FailureMessage "Run: .\setup\config-wizard.ps1"

Write-Host ""

# ============================================================================
# Bot Hub Dependencies
# ============================================================================

$botHubDir = Join-Path $rootDir "bot-hub"
if (Test-Path $botHubDir) {
    Write-Info "═══ Bot Hub Dependencies ═══"
    Write-Host ""

    # Check virtual environment
    Test-Component -Name "Python Virtual Environment" -Required $false -Test {
        Test-Path (Join-Path $botHubDir "venv")
    } -FailureMessage "Run: .\setup\install-bot-hub.ps1"

    # Check requirements.txt
    Test-Component -Name "requirements.txt" -Required $false -Test {
        Test-Path (Join-Path $botHubDir "requirements.txt")
    } -FailureMessage "Run: .\setup\install-bot-hub.ps1"

    # Check key Python packages
    if (Test-Path (Join-Path $botHubDir "venv\Scripts\python.exe")) {
        $venvPython = Join-Path $botHubDir "venv\Scripts\python.exe"

        Test-Component -Name "discord.py" -Required $false -Test {
            $result = & $venvPython -c "import discord; print('OK')" 2>&1
            return $result -eq "OK"
        }

        Test-Component -Name "tweepy" -Required $false -Test {
            $result = & $venvPython -c "import tweepy; print('OK')" 2>&1
            return $result -eq "OK"
        }

        Test-Component -Name "Flask" -Required $false -Test {
            $result = & $venvPython -c "import flask; print('OK')" 2>&1
            return $result -eq "OK"
        }
    }

    Write-Host ""
}

# ============================================================================
# Frontend Dependencies
# ============================================================================

$frontendDir = Join-Path $rootDir "frontend"
if (Test-Path $frontendDir) {
    Write-Info "═══ Frontend Dependencies ═══"
    Write-Host ""

    # Check package.json
    Test-Component -Name "package.json" -Required $false -Test {
        Test-Path (Join-Path $frontendDir "package.json")
    } -FailureMessage "Run: .\setup\install-frontend.ps1"

    # Check node_modules
    Test-Component -Name "node_modules" -Required $false -Test {
        Test-Path (Join-Path $frontendDir "node_modules")
    } -FailureMessage "Run: cd frontend && npm install"

    # Check key packages
    $packageJsonPath = Join-Path $frontendDir "package.json"
    if (Test-Path $packageJsonPath) {
        $packageJson = Get-Content $packageJsonPath | ConvertFrom-Json

        Test-Component -Name "@solana/web3.js" -Required $false -Test {
            $null -ne $packageJson.dependencies.'@solana/web3.js'
        }

        Test-Component -Name "@solana/wallet-adapter-react" -Required $false -Test {
            $null -ne $packageJson.dependencies.'@solana/wallet-adapter-react'
        }

        Test-Component -Name "Next.js" -Required $false -Test {
            $null -ne $packageJson.dependencies.'next'
        }
    }

    Write-Host ""
}

# ============================================================================
# Network Connectivity
# ============================================================================

Write-Info "═══ Network Connectivity ═══"
Write-Host ""

Test-Component -Name "Internet Connection" -Test {
    try {
        $null = Test-Connection -ComputerName "8.8.8.8" -Count 1 -Quiet
        return $?
    } catch {
        return $false
    }
} -FailureMessage "No internet connection"

Test-Component -Name "Solana Devnet" -Required $false -Test {
    try {
        $response = Invoke-WebRequest -Uri "https://api.devnet.solana.com" -Method Post -Body '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' -ContentType "application/json" -TimeoutSec 5 -UseBasicParsing
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
} -FailureMessage "Cannot reach Solana devnet"

Test-Component -Name "GitHub.com" -Required $false -Test {
    try {
        $response = Invoke-WebRequest -Uri "https://github.com" -TimeoutSec 5 -UseBasicParsing
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
} -FailureMessage "Cannot reach GitHub"

Write-Host ""

# ============================================================================
# Optional Services
# ============================================================================

Write-Info "═══ Optional Services ═══"
Write-Host ""

# Docker
Test-Component -Name "Docker" -Required $false -Test {
    try {
        $null = Get-Command docker -ErrorAction Stop
        $version = Get-ToolVersion "docker"
        Write-Host -NoNewline " ($version) "
        return $true
    } catch {
        return $false
    }
} -FailureMessage "Docker Desktop not installed (optional)"

# Redis
Test-Component -Name "Redis Server" -Required $false -Test {
    try {
        $redis = Get-Service -Name "Redis" -ErrorAction SilentlyContinue
        return $null -ne $redis
    } catch {
        return $false
    }
} -FailureMessage "Redis not running (optional, required for Bot Hub caching)"

# PostgreSQL
Test-Component -Name "PostgreSQL" -Required $false -Test {
    try {
        $postgres = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
        return $null -ne $postgres
    } catch {
        return $false
    }
} -FailureMessage "PostgreSQL not running (optional)"

Write-Host ""

# ============================================================================
# Build Tests
# ============================================================================

Write-Info "═══ Build Capability Tests ═══"
Write-Host ""

# Test Anchor build (if programs directory exists)
$programsDir = Join-Path $rootDir "programs"
if (Test-Path $programsDir) {
    Test-Component -Name "Anchor Build Test" -Required $false -Test {
        Push-Location $programsDir
        try {
            if (Test-Path "Anchor.toml") {
                $output = anchor build --help 2>&1
                return $LASTEXITCODE -eq 0
            }
            return $false
        } catch {
            return $false
        } finally {
            Pop-Location
        }
    } -FailureMessage "Anchor build not available"
}

# Test npm build (if frontend exists)
if (Test-Path $frontendDir) {
    Test-Component -Name "npm Build Test" -Required $false -Test {
        Push-Location $frontendDir
        try {
            if (Test-Path "package.json") {
                $output = npm run build --help 2>&1
                return $LASTEXITCODE -eq 0
            }
            return $false
        } catch {
            return $false
        } finally {
            Pop-Location
        }
    } -FailureMessage "npm build not available"
}

Write-Host ""

# ============================================================================
# Summary
# ============================================================================

Write-Host ""
Write-Info "═══════════════════════════════════════════════════════════"
Write-Info "                    Verification Summary"
Write-Info "═══════════════════════════════════════════════════════════"
Write-Host ""

Write-Info "  Total Tests: $script:TotalTests"
Write-Success "  Passed: $script:PassedTests"
Write-Warning "  Warnings: $script:WarningTests"
Write-Error "  Failed: $script:FailedTests"
Write-Host ""

if ($script:FailedTests -gt 0) {
    Write-Error "Failed Components:"
    foreach ($item in $script:FailedItems) {
        Write-Error "  • $item"
    }
    Write-Host ""
}

# Calculate success rate
$successRate = [math]::Round(($script:PassedTests / $script:TotalTests) * 100, 1)

if ($script:FailedTests -eq 0) {
    Write-Success "═══════════════════════════════════════════════════════════"
    Write-Success "  ✓ All critical components verified successfully!"
    Write-Success "  Success Rate: $successRate%"
    Write-Success "═══════════════════════════════════════════════════════════"
    Write-Host ""
    Write-Success "Your ZenBeasts development environment is ready! 🎉"
    Write-Host ""
    Write-Info "Next steps:"
    Write-Info "  1. Configure environment: .\setup\config-wizard.ps1"
    Write-Info "  2. Build programs: cd programs && anchor build"
    Write-Info "  3. Start Bot Hub: cd bot-hub && python orchestrator.py"
    Write-Info "  4. Start frontend: cd frontend && npm run dev"
    Write-Host ""
    exit 0
} else {
    Write-Warning "═══════════════════════════════════════════════════════════"
    Write-Warning "  ⚠ Some components need attention"
    Write-Warning "  Success Rate: $successRate%"
    Write-Warning "═══════════════════════════════════════════════════════════"
    Write-Host ""
    Write-Info "Recommendations:"
    Write-Info "  • Review failed components above"
    Write-Info "  • Run component-specific installers:"
    Write-Info "    - .\setup\install-solana.ps1"
    Write-Info "    - .\setup\install-bot-hub.ps1"
    Write-Info "    - .\setup\install-frontend.ps1"
    Write-Info "  • Check the installation guide: .\INSTALLATION_GUIDE.md"
    Write-Info "  • Run this verification again after fixes"
    Write-Host ""
    exit 1
}
