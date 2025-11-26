# ZenBeasts Configuration Wizard
# Version: 1.0.0
# Interactive setup for all configuration files

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

# Banner
function Show-Banner {
    Write-Host ""
    Write-ColorOutput Magenta @"
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║              ZenBeasts Configuration Wizard               ║
║                                                           ║
║         Interactive setup for API keys and config         ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
"@
    Write-Host ""
}

# Prompt for input with validation
function Get-ConfigValue {
    param(
        [string]$Prompt,
        [string]$Default = "",
        [bool]$Required = $false,
        [bool]$Secret = $false,
        [string]$Validation = ""
    )

    $promptText = $Prompt
    if ($Default) {
        $promptText += " [$Default]"
    }
    if ($Required) {
        $promptText += " *"
    }
    $promptText += ": "

    while ($true) {
        if ($Secret) {
            $value = Read-Host -Prompt $promptText -AsSecureString
            $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($value)
            $value = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
        } else {
            $value = Read-Host -Prompt $promptText
        }

        if ([string]::IsNullOrWhiteSpace($value)) {
            if ($Default) {
                return $Default
            } elseif (-not $Required) {
                return ""
            } else {
                Write-Warning "This field is required!"
                continue
            }
        }

        if ($Validation -and $value -notmatch $Validation) {
            Write-Warning "Invalid format. Please try again."
            continue
        }

        return $value
    }
}

# Generate random secret
function New-RandomSecret {
    param([int]$Length = 32)
    $chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
    $secret = -join ((1..$Length) | ForEach-Object { $chars[(Get-Random -Maximum $chars.Length)] })
    return $secret
}

# Main configuration
Show-Banner

Write-Info "This wizard will help you configure ZenBeasts components."
Write-Info "Fields marked with * are required."
Write-Info "Press Enter to use default values shown in [brackets]."
Write-Host ""

$proceed = Read-Host "Continue? (Y/n)"
if ($proceed -eq 'n' -or $proceed -eq 'N') {
    Write-Info "Configuration cancelled."
    exit 0
}

# ============================================================================
# Component Selection
# ============================================================================

Write-Host ""
Write-Info "═══ Component Selection ═══"
Write-Host ""

$components = @{
    Solana = $false
    BotHub = $false
    Frontend = $false
}

Write-Host "Which components would you like to configure?"
Write-Host ""

$configureSolana = Read-Host "Configure Solana programs? (Y/n)"
$components.Solana = ($configureSolana -ne 'n' -and $configureSolana -ne 'N')

$configureBotHub = Read-Host "Configure Bot Hub? (Y/n)"
$components.BotHub = ($configureBotHub -ne 'n' -and $configureBotHub -ne 'N')

$configureFrontend = Read-Host "Configure Frontend? (Y/n)"
$components.Frontend = ($configureFrontend -ne 'n' -and $configureFrontend -ne 'N')

# ============================================================================
# Solana Configuration
# ============================================================================

if ($components.Solana) {
    Write-Host ""
    Write-Info "═══ Solana Configuration ═══"
    Write-Host ""

    $solanaConfig = @{}

    # Network selection
    Write-Host "Select Solana network:"
    Write-Host "1. Devnet (Development)"
    Write-Host "2. Testnet (Testing)"
    Write-Host "3. Mainnet-beta (Production)"
    Write-Host ""

    $networkChoice = Read-Host "Select network (1-3) [1]"
    if ([string]::IsNullOrWhiteSpace($networkChoice)) {
        $networkChoice = "1"
    }

    $solanaConfig.Network = switch ($networkChoice) {
        "1" { "devnet" }
        "2" { "testnet" }
        "3" { "mainnet-beta" }
        default { "devnet" }
    }

    # RPC Endpoint
    $defaultRpc = switch ($solanaConfig.Network) {
        "devnet" { "https://api.devnet.solana.com" }
        "testnet" { "https://api.testnet.solana.com" }
        "mainnet-beta" { "https://api.mainnet-beta.solana.com" }
    }

    $solanaConfig.RpcUrl = Get-ConfigValue -Prompt "Solana RPC URL" -Default $defaultRpc

    # Helius API Key (optional but recommended)
    Write-Host ""
    Write-Info "Helius provides enhanced RPC and DAS API for compressed NFTs."
    Write-Info "Sign up at: https://helius.xyz/"
    $solanaConfig.HeliusApiKey = Get-ConfigValue -Prompt "Helius API Key (optional)"

    # Program IDs (will be filled after deployment)
    Write-Host ""
    Write-Info "Program IDs will be set after deployment."
    Write-Info "Leave blank for now if not deployed yet."
    $solanaConfig.NftFactoryProgramId = Get-ConfigValue -Prompt "NFT Factory Program ID"
    $solanaConfig.ActivitiesProgramId = Get-ConfigValue -Prompt "Activities Program ID"
    $solanaConfig.EconomyProgramId = Get-ConfigValue -Prompt "Economy Program ID"

    Write-Success "✓ Solana configuration complete"
}

# ============================================================================
# Bot Hub Configuration
# ============================================================================

if ($components.BotHub) {
    Write-Host ""
    Write-Info "═══ Bot Hub Configuration ═══"
    Write-Host ""

    $botHubConfig = @{}

    # Discord Configuration
    Write-Host ""
    Write-Info "--- Discord Bot Configuration ---"
    Write-Info "Create a bot at: https://discord.com/developers/applications"
    Write-Host ""

    $botHubConfig.DiscordToken = Get-ConfigValue -Prompt "Discord Bot Token" -Required $true -Secret $true
    $botHubConfig.DiscordGuildId = Get-ConfigValue -Prompt "Discord Guild (Server) ID"
    $botHubConfig.DiscordClientId = Get-ConfigValue -Prompt "Discord Client ID"

    # Twitter Configuration
    Write-Host ""
    Write-Info "--- Twitter/X Bot Configuration ---"
    Write-Info "Get API keys at: https://developer.twitter.com/"
    Write-Host ""

    $configureTwitter = Read-Host "Configure Twitter bot? (y/N)"
    if ($configureTwitter -eq 'y' -or $configureTwitter -eq 'Y') {
        $botHubConfig.TwitterApiKey = Get-ConfigValue -Prompt "Twitter API Key" -Required $true -Secret $true
        $botHubConfig.TwitterApiSecret = Get-ConfigValue -Prompt "Twitter API Secret" -Required $true -Secret $true
        $botHubConfig.TwitterAccessToken = Get-ConfigValue -Prompt "Twitter Access Token" -Required $true -Secret $true
        $botHubConfig.TwitterAccessSecret = Get-ConfigValue -Prompt "Twitter Access Token Secret" -Required $true -Secret $true
        $botHubConfig.TwitterBearerToken = Get-ConfigValue -Prompt "Twitter Bearer Token" -Secret $true
    }

    # OpenAI Configuration
    Write-Host ""
    Write-Info "--- AI Configuration (Optional) ---"
    Write-Info "Get API key at: https://platform.openai.com/"
    Write-Host ""

    $configureOpenAI = Read-Host "Configure OpenAI for content generation? (y/N)"
    if ($configureOpenAI -eq 'y' -or $configureOpenAI -eq 'Y') {
        $botHubConfig.OpenAIApiKey = Get-ConfigValue -Prompt "OpenAI API Key" -Secret $true
        $botHubConfig.OpenAIModel = Get-ConfigValue -Prompt "OpenAI Model" -Default "gpt-4-turbo-preview"
    }

    # Anthropic Claude (optional)
    $configureClaude = Read-Host "Configure Anthropic Claude? (y/N)"
    if ($configureClaude -eq 'y' -or $configureClaude -eq 'Y') {
        $botHubConfig.AnthropicApiKey = Get-ConfigValue -Prompt "Anthropic API Key" -Secret $true
    }

    # Redis Configuration
    Write-Host ""
    Write-Info "--- Redis Configuration ---"
    $botHubConfig.RedisHost = Get-ConfigValue -Prompt "Redis Host" -Default "localhost"
    $botHubConfig.RedisPort = Get-ConfigValue -Prompt "Redis Port" -Default "6379"
    $botHubConfig.RedisPassword = Get-ConfigValue -Prompt "Redis Password (if any)" -Secret $true
    $botHubConfig.RedisDb = Get-ConfigValue -Prompt "Redis DB" -Default "0"

    # PostgreSQL (optional)
    Write-Host ""
    $configurePostgres = Read-Host "Configure PostgreSQL database? (y/N)"
    if ($configurePostgres -eq 'y' -or $configurePostgres -eq 'Y') {
        $botHubConfig.PostgresHost = Get-ConfigValue -Prompt "PostgreSQL Host" -Default "localhost"
        $botHubConfig.PostgresPort = Get-ConfigValue -Prompt "PostgreSQL Port" -Default "5432"
        $botHubConfig.PostgresDb = Get-ConfigValue -Prompt "PostgreSQL Database" -Default "zenbeasts"
        $botHubConfig.PostgresUser = Get-ConfigValue -Prompt "PostgreSQL User" -Default "postgres"
        $botHubConfig.PostgresPassword = Get-ConfigValue -Prompt "PostgreSQL Password" -Secret $true
    }

    # Bot Hub Settings
    Write-Host ""
    Write-Info "--- Bot Hub Settings ---"
    $botHubConfig.BotHubPort = Get-ConfigValue -Prompt "Dashboard Port" -Default "5000"
    $botHubConfig.BotHubHost = Get-ConfigValue -Prompt "Dashboard Host" -Default "0.0.0.0"
    $botHubConfig.DebugMode = Get-ConfigValue -Prompt "Debug Mode (true/false)" -Default "true"
    $botHubConfig.LogLevel = Get-ConfigValue -Prompt "Log Level (DEBUG/INFO/WARNING/ERROR)" -Default "INFO"

    # Webhooks
    Write-Host ""
    $botHubConfig.WebhookUrl = Get-ConfigValue -Prompt "Webhook URL (for notifications, optional)"
    $botHubConfig.ErrorWebhookUrl = Get-ConfigValue -Prompt "Error Webhook URL (optional)"

    # Security
    Write-Host ""
    Write-Info "--- Security Settings ---"
    Write-Info "Generating random secrets..."
    $botHubConfig.SecretKey = New-RandomSecret -Length 32
    $botHubConfig.JwtSecret = New-RandomSecret -Length 32
    Write-Success "✓ Security keys generated"

    Write-Success "✓ Bot Hub configuration complete"
}

# ============================================================================
# Frontend Configuration
# ============================================================================

if ($components.Frontend) {
    Write-Host ""
    Write-Info "═══ Frontend Configuration ═══"
    Write-Host ""

    $frontendConfig = @{}

    # Use Solana config if available
    if ($components.Solana) {
        $frontendConfig.SolanaNetwork = $solanaConfig.Network
        $frontendConfig.SolanaRpcUrl = $solanaConfig.RpcUrl
        $frontendConfig.HeliusApiKey = $solanaConfig.HeliusApiKey
        $frontendConfig.NftFactoryProgramId = $solanaConfig.NftFactoryProgramId
        $frontendConfig.ActivitiesProgramId = $solanaConfig.ActivitiesProgramId
        $frontendConfig.EconomyProgramId = $solanaConfig.EconomyProgramId
        Write-Info "Using Solana configuration from previous step"
    } else {
        $networkChoice = Read-Host "Solana network (devnet/testnet/mainnet-beta) [devnet]"
        $frontendConfig.SolanaNetwork = if ($networkChoice) { $networkChoice } else { "devnet" }

        $frontendConfig.SolanaRpcUrl = Get-ConfigValue -Prompt "Solana RPC URL" -Default "https://api.devnet.solana.com"
        $frontendConfig.HeliusApiKey = Get-ConfigValue -Prompt "Helius API Key (optional)"
        $frontendConfig.NftFactoryProgramId = Get-ConfigValue -Prompt "NFT Factory Program ID"
        $frontendConfig.ActivitiesProgramId = Get-ConfigValue -Prompt "Activities Program ID"
        $frontendConfig.EconomyProgramId = Get-ConfigValue -Prompt "Economy Program ID"
    }

    # API Configuration
    Write-Host ""
    Write-Info "--- API Configuration ---"
    $frontendConfig.ApiBaseUrl = Get-ConfigValue -Prompt "API Base URL" -Default "http://localhost:8080"
    $frontendConfig.WsUrl = Get-ConfigValue -Prompt "WebSocket URL" -Default "ws://localhost:8080"

    # Feature Flags
    Write-Host ""
    Write-Info "--- Feature Flags ---"
    $enableCnfts = Read-Host "Enable Compressed NFTs? (y/N)"
    $frontendConfig.EnableCompressedNfts = ($enableCnfts -eq 'y' -or $enableCnfts -eq 'Y')

    $enableStaking = Read-Host "Enable Staking? (y/N)"
    $frontendConfig.EnableStaking = ($enableStaking -eq 'y' -or $enableStaking -eq 'Y')

    $enableBreeding = Read-Host "Enable Breeding? (y/N)"
    $frontendConfig.EnableBreeding = ($enableBreeding -eq 'y' -or $enableBreeding -eq 'Y')

    # Analytics (optional)
    Write-Host ""
    Write-Info "--- Analytics (Optional) ---"
    $configureAnalytics = Read-Host "Configure analytics? (y/N)"
    if ($configureAnalytics -eq 'y' -or $configureAnalytics -eq 'Y') {
        $frontendConfig.GaTrackingId = Get-ConfigValue -Prompt "Google Analytics Tracking ID"
        $frontendConfig.MixpanelToken = Get-ConfigValue -Prompt "Mixpanel Token"
    }

    # Environment
    $frontendConfig.Environment = Get-ConfigValue -Prompt "Environment (development/production)" -Default "development"

    # WalletConnect (optional)
    Write-Host ""
    $frontendConfig.WalletConnectProjectId = Get-ConfigValue -Prompt "WalletConnect Project ID (optional)"

    Write-Success "✓ Frontend configuration complete"
}

# ============================================================================
# Write Configuration Files
# ============================================================================

Write-Host ""
Write-Info "═══ Writing Configuration Files ═══"
Write-Host ""

$rootDir = Split-Path $PSScriptRoot -Parent

# Write main .env file
if ($components.Solana) {
    $envPath = Join-Path $rootDir ".env"
    Write-Info "Writing $envPath..."

    $envContent = @"
# ZenBeasts Main Configuration
# Generated by config-wizard.ps1 on $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

# Solana Configuration
SOLANA_NETWORK=$($solanaConfig.Network)
SOLANA_RPC_URL=$($solanaConfig.RpcUrl)
HELIUS_API_KEY=$($solanaConfig.HeliusApiKey)

# Program IDs
NFT_FACTORY_PROGRAM_ID=$($solanaConfig.NftFactoryProgramId)
ACTIVITIES_PROGRAM_ID=$($solanaConfig.ActivitiesProgramId)
ECONOMY_PROGRAM_ID=$($solanaConfig.EconomyProgramId)
"@

    Set-Content -Path $envPath -Value $envContent
    Write-Success "✓ Created $envPath"
}

# Write Bot Hub .env file
if ($components.BotHub) {
    $botHubEnvPath = Join-Path $rootDir "bot-hub\.env"
    Write-Info "Writing $botHubEnvPath..."

    $botHubEnvContent = @"
# ZenBeasts Bot Hub Configuration
# Generated by config-wizard.ps1 on $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

# Discord Configuration
DISCORD_BOT_TOKEN=$($botHubConfig.DiscordToken)
DISCORD_GUILD_ID=$($botHubConfig.DiscordGuildId)
DISCORD_CLIENT_ID=$($botHubConfig.DiscordClientId)

# Twitter Configuration
TWITTER_API_KEY=$($botHubConfig.TwitterApiKey)
TWITTER_API_SECRET=$($botHubConfig.TwitterApiSecret)
TWITTER_ACCESS_TOKEN=$($botHubConfig.TwitterAccessToken)
TWITTER_ACCESS_TOKEN_SECRET=$($botHubConfig.TwitterAccessSecret)
TWITTER_BEARER_TOKEN=$($botHubConfig.TwitterBearerToken)

# OpenAI Configuration
OPENAI_API_KEY=$($botHubConfig.OpenAIApiKey)
OPENAI_MODEL=$($botHubConfig.OpenAIModel)

# Anthropic Configuration
ANTHROPIC_API_KEY=$($botHubConfig.AnthropicApiKey)

# Redis Configuration
REDIS_HOST=$($botHubConfig.RedisHost)
REDIS_PORT=$($botHubConfig.RedisPort)
REDIS_PASSWORD=$($botHubConfig.RedisPassword)
REDIS_DB=$($botHubConfig.RedisDb)

# PostgreSQL Configuration
POSTGRES_HOST=$($botHubConfig.PostgresHost)
POSTGRES_PORT=$($botHubConfig.PostgresPort)
POSTGRES_DB=$($botHubConfig.PostgresDb)
POSTGRES_USER=$($botHubConfig.PostgresUser)
POSTGRES_PASSWORD=$($botHubConfig.PostgresPassword)

# Bot Hub Settings
BOT_HUB_PORT=$($botHubConfig.BotHubPort)
BOT_HUB_HOST=$($botHubConfig.BotHubHost)
DEBUG_MODE=$($botHubConfig.DebugMode)
LOG_LEVEL=$($botHubConfig.LogLevel)

# Webhooks
WEBHOOK_URL=$($botHubConfig.WebhookUrl)
ERROR_WEBHOOK_URL=$($botHubConfig.ErrorWebhookUrl)

# Security
SECRET_KEY=$($botHubConfig.SecretKey)
JWT_SECRET=$($botHubConfig.JwtSecret)

# Solana (for blockchain integration)
SOLANA_RPC_URL=$($solanaConfig.RpcUrl)
SOLANA_NETWORK=$($solanaConfig.Network)
HELIUS_API_KEY=$($solanaConfig.HeliusApiKey)

# Analytics
ANALYTICS_ENABLED=true
METRICS_PORT=9090

# Rate Limiting
RATE_LIMIT_ENABLED=true
MAX_REQUESTS_PER_MINUTE=60
"@

    # Create bot-hub directory if it doesn't exist
    $botHubDir = Join-Path $rootDir "bot-hub"
    if (-not (Test-Path $botHubDir)) {
        New-Item -ItemType Directory -Path $botHubDir -Force | Out-Null
    }

    Set-Content -Path $botHubEnvPath -Value $botHubEnvContent
    Write-Success "✓ Created $botHubEnvPath"
}

# Write Frontend .env.local file
if ($components.Frontend) {
    $frontendEnvPath = Join-Path $rootDir "frontend\.env.local"
    Write-Info "Writing $frontendEnvPath..."

    $frontendEnvContent = @"
# ZenBeasts Frontend Configuration
# Generated by config-wizard.ps1 on $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

# Solana Configuration
NEXT_PUBLIC_SOLANA_NETWORK=$($frontendConfig.SolanaNetwork)
NEXT_PUBLIC_SOLANA_RPC_HOST=$($frontendConfig.SolanaRpcUrl)

# Program IDs
NEXT_PUBLIC_NFT_FACTORY_PROGRAM_ID=$($frontendConfig.NftFactoryProgramId)
NEXT_PUBLIC_ACTIVITIES_PROGRAM_ID=$($frontendConfig.ActivitiesProgramId)
NEXT_PUBLIC_ECONOMY_PROGRAM_ID=$($frontendConfig.EconomyProgramId)

# Helius API
NEXT_PUBLIC_HELIUS_API_KEY=$($frontendConfig.HeliusApiKey)

# Metaplex
NEXT_PUBLIC_METAPLEX_METADATA_PROGRAM_ID=metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s

# API Configuration
NEXT_PUBLIC_API_BASE_URL=$($frontendConfig.ApiBaseUrl)
NEXT_PUBLIC_WS_URL=$($frontendConfig.WsUrl)

# Feature Flags
NEXT_PUBLIC_ENABLE_COMPRESSED_NFTS=$($frontendConfig.EnableCompressedNfts.ToString().ToLower())
NEXT_PUBLIC_ENABLE_STAKING=$($frontendConfig.EnableStaking.ToString().ToLower())
NEXT_PUBLIC_ENABLE_BREEDING=$($frontendConfig.EnableBreeding.ToString().ToLower())

# Analytics
NEXT_PUBLIC_GA_TRACKING_ID=$($frontendConfig.GaTrackingId)
NEXT_PUBLIC_MIXPANEL_TOKEN=$($frontendConfig.MixpanelToken)

# Environment
NEXT_PUBLIC_ENVIRONMENT=$($frontendConfig.Environment)

# WalletConnect
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=$($frontendConfig.WalletConnectProjectId)
"@

    # Create frontend directory if it doesn't exist
    $frontendDir = Join-Path $rootDir "frontend"
    if (-not (Test-Path $frontendDir)) {
        New-Item -ItemType Directory -Path $frontendDir -Force | Out-Null
    }

    Set-Content -Path $frontendEnvPath -Value $frontendEnvContent
    Write-Success "✓ Created $frontendEnvPath"
}

# ============================================================================
# Summary
# ============================================================================

Write-Host ""
Write-Success "═══════════════════════════════════════════════════════════"
Write-Success "        Configuration Complete!"
Write-Success "═══════════════════════════════════════════════════════════"
Write-Host ""

Write-Info "Configuration files created:"
if ($components.Solana) {
    Write-Info "  ✓ .env"
}
if ($components.BotHub) {
    Write-Info "  ✓ bot-hub/.env"
}
if ($components.Frontend) {
    Write-Info "  ✓ frontend/.env.local"
}
Write-Host ""

Write-Warning "⚠ SECURITY REMINDER:"
Write-Warning "  • Never commit .env files to version control"
Write-Warning "  • Keep your API keys and secrets safe"
Write-Warning "  • Use different keys for development and production"
Write-Host ""

Write-Info "Next Steps:"
if ($components.Solana) {
    Write-Info "  1. Build and deploy Solana programs"
    Write-Info "     cd programs && anchor build && anchor deploy"
    Write-Info "  2. Update Program IDs in configuration files"
}
if ($components.BotHub) {
    Write-Info "  3. Start Bot Hub orchestrator"
    Write-Info "     cd bot-hub && python orchestrator.py"
}
if ($components.Frontend) {
    Write-Info "  4. Start frontend development server"
    Write-Info "     cd frontend && npm run dev"
}
Write-Host ""

Write-Success "Configuration wizard complete! 🎉"
Write-Host ""
