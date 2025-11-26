# ZenBeasts Bot Hub Installation Script
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
Write-Info "║        ZenBeasts Bot Hub Installation Setup        ║"
Write-Info "╚════════════════════════════════════════════════════╝"
Write-Host ""

# Check if Python is installed
Write-Info "Checking Python installation..."
try {
    $pythonVersion = python --version 2>&1
    Write-Success "✓ Python found: $pythonVersion"
} catch {
    Write-Error "✗ Python not found. Please run the main installer first."
    exit 1
}

# Navigate to bot-hub directory
$botHubDir = Join-Path $PSScriptRoot "..\bot-hub"
if (-not (Test-Path $botHubDir)) {
    Write-Info "Creating bot-hub directory..."
    New-Item -ItemType Directory -Path $botHubDir -Force | Out-Null
}

Push-Location $botHubDir

try {
    # Create virtual environment
    Write-Info "`nCreating Python virtual environment..."
    if (Test-Path "venv") {
        Write-Info "Virtual environment already exists. Removing old one..."
        Remove-Item -Recurse -Force "venv"
    }

    python -m venv venv

    if ($LASTEXITCODE -eq 0) {
        Write-Success "✓ Virtual environment created"
    } else {
        Write-Error "✗ Failed to create virtual environment"
        exit 1
    }

    # Activate virtual environment
    Write-Info "Activating virtual environment..."
    $activateScript = ".\venv\Scripts\Activate.ps1"

    if (Test-Path $activateScript) {
        & $activateScript
        Write-Success "✓ Virtual environment activated"
    } else {
        Write-Warning "⚠ Could not find activation script. Trying alternative..."
        $env:Path = "$PWD\venv\Scripts;" + $env:Path
    }

    # Upgrade pip
    Write-Info "`nUpgrading pip..."
    python -m pip install --upgrade pip setuptools wheel

    # Install core dependencies
    Write-Info "`nInstalling core dependencies..."

    # Create requirements.txt if it doesn't exist
    if (-not (Test-Path "requirements.txt")) {
        Write-Info "Creating requirements.txt..."
        $requirements = @"
# Core dependencies
discord.py>=2.3.2
tweepy>=4.14.0
openai>=1.3.0
python-dotenv>=1.0.0
pyyaml>=6.0.1
requests>=2.31.0
aiohttp>=3.9.0
pillow>=10.1.0

# Database and caching
redis>=5.0.1
aioredis>=2.0.1

# Scheduling and async
apscheduler>=3.10.4
asyncio>=3.4.3

# Web framework for dashboard
flask>=3.0.0
flask-cors>=4.0.0
flask-socketio>=5.3.5

# Data processing
pandas>=2.1.3
numpy>=1.26.2

# Monitoring and logging
prometheus-client>=0.19.0
python-json-logger>=2.0.7

# Testing
pytest>=7.4.3
pytest-asyncio>=0.21.1
pytest-cov>=4.1.0

# Utilities
python-dateutil>=2.8.2
colorama>=0.4.6
tabulate>=0.9.0
"@
        Set-Content -Path "requirements.txt" -Value $requirements
        Write-Success "✓ requirements.txt created"
    }

    Write-Info "Installing packages from requirements.txt..."
    python -m pip install -r requirements.txt

    if ($LASTEXITCODE -eq 0) {
        Write-Success "✓ All dependencies installed successfully"
    } else {
        Write-Warning "⚠ Some dependencies may have failed to install"
    }

    # Install optional dependencies
    Write-Host ""
    $installOptional = Read-Host "Would you like to install optional AI/ML dependencies? (y/N)"
    if ($installOptional -eq 'y' -or $installOptional -eq 'Y') {
        Write-Info "Installing optional dependencies..."

        $optionalDeps = @"
# AI/ML optional dependencies
anthropic>=0.7.0
google-generativeai>=0.3.0
langchain>=0.0.350
transformers>=4.35.2
torch>=2.1.1
"@
        Set-Content -Path "requirements-optional.txt" -Value $optionalDeps
        python -m pip install -r requirements-optional.txt

        if ($LASTEXITCODE -eq 0) {
            Write-Success "✓ Optional dependencies installed"
        } else {
            Write-Warning "⚠ Some optional dependencies failed to install"
        }
    }

    # Create directory structure
    Write-Info "`nCreating directory structure..."

    $directories = @(
        "bots",
        "config",
        "data",
        "logs",
        "tests",
        "dashboard",
        "dashboard/templates",
        "dashboard/static",
        "dashboard/static/css",
        "dashboard/static/js",
        "utils"
    )

    foreach ($dir in $directories) {
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
            Write-Info "  Created: $dir"
        }
    }
    Write-Success "✓ Directory structure created"

    # Create .env template if it doesn't exist
    if (-not (Test-Path ".env.template")) {
        Write-Info "`nCreating .env template..."
        $envTemplate = @"
# ZenBeasts Bot Hub Configuration
# Copy this file to .env and fill in your API keys

# Discord Configuration
DISCORD_BOT_TOKEN=your_discord_bot_token_here
DISCORD_GUILD_ID=your_guild_id_here
DISCORD_CLIENT_ID=your_client_id_here

# Twitter/X Configuration
TWITTER_API_KEY=your_twitter_api_key_here
TWITTER_API_SECRET=your_twitter_api_secret_here
TWITTER_ACCESS_TOKEN=your_twitter_access_token_here
TWITTER_ACCESS_TOKEN_SECRET=your_twitter_access_secret_here
TWITTER_BEARER_TOKEN=your_twitter_bearer_token_here

# OpenAI Configuration (Optional)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4-turbo-preview

# Anthropic Claude (Optional)
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Database Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# PostgreSQL (Optional)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=zenbeasts
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password_here

# Bot Hub Settings
BOT_HUB_PORT=5000
BOT_HUB_HOST=0.0.0.0
DEBUG_MODE=true
LOG_LEVEL=INFO

# Webhooks
WEBHOOK_URL=
ERROR_WEBHOOK_URL=

# Analytics
ANALYTICS_ENABLED=true
METRICS_PORT=9090

# Solana Configuration (for blockchain integration)
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet
HELIUS_API_KEY=your_helius_api_key_here

# Rate Limiting
RATE_LIMIT_ENABLED=true
MAX_REQUESTS_PER_MINUTE=60

# Security
SECRET_KEY=change_this_to_a_random_secret_key
JWT_SECRET=change_this_to_a_random_jwt_secret
"@
        Set-Content -Path ".env.template" -Value $envTemplate
        Write-Success "✓ .env.template created"
    }

    # Copy to .env if it doesn't exist
    if (-not (Test-Path ".env")) {
        Copy-Item ".env.template" ".env"
        Write-Success "✓ .env file created (please configure your API keys)"
    }

    # Create basic config.yaml
    if (-not (Test-Path "config/config.yaml")) {
        Write-Info "`nCreating default configuration..."
        $configYaml = @"
# ZenBeasts Bot Hub Configuration

orchestrator:
  check_interval: 60  # seconds
  restart_on_failure: true
  max_restart_attempts: 3
  health_check_interval: 300  # seconds

bots:
  twitter:
    enabled: true
    schedule: "*/30 * * * *"  # Every 30 minutes
    priority: high

  discord:
    enabled: true
    priority: high

  content:
    enabled: true
    schedule: "0 */4 * * *"  # Every 4 hours
    priority: medium

  analytics:
    enabled: true
    schedule: "0 * * * *"  # Hourly
    priority: low

  deployment:
    enabled: false
    priority: high

  monitoring:
    enabled: true
    schedule: "*/5 * * * *"  # Every 5 minutes
    priority: medium

  rewards:
    enabled: true
    schedule: "0 0 * * *"  # Daily
    priority: medium

  marketing:
    enabled: true
    schedule: "0 9,15 * * *"  # 9 AM and 3 PM
    priority: low

logging:
  level: INFO
  format: "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
  file: "logs/bot-hub.log"
  max_bytes: 10485760  # 10MB
  backup_count: 5

dashboard:
  enabled: true
  host: "0.0.0.0"
  port: 5000
  auth_required: true

monitoring:
  prometheus_enabled: true
  metrics_port: 9090

notifications:
  discord_webhook: ""
  email_enabled: false
"@
        Set-Content -Path "config/config.yaml" -Value $configYaml
        Write-Success "✓ config.yaml created"
    }

    # Create basic orchestrator.py if it doesn't exist
    if (-not (Test-Path "orchestrator.py")) {
        Write-Info "`nCreating orchestrator.py..."
        $orchestratorCode = @"
#!/usr/bin/env python3
"""
ZenBeasts Bot Hub Orchestrator
Central controller for all automation bots
"""

import os
import sys
import time
import logging
import yaml
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/orchestrator.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

class BotOrchestrator:
    """Main orchestrator for managing all bots"""

    def __init__(self):
        self.config = self.load_config()
        self.bots = {}
        self.running = False

    def load_config(self):
        """Load configuration from YAML file"""
        config_path = Path('config/config.yaml')
        if config_path.exists():
            with open(config_path, 'r') as f:
                return yaml.safe_load(f)
        return {}

    def start(self):
        """Start the orchestrator and all enabled bots"""
        logger.info("🚀 Starting ZenBeasts Bot Hub Orchestrator...")
        logger.info(f"Configuration loaded: {len(self.config.get('bots', {}))} bot(s) configured")

        self.running = True

        # TODO: Load and start individual bots
        enabled_bots = [name for name, config in self.config.get('bots', {}).items()
                       if config.get('enabled', False)]

        logger.info(f"✓ Enabled bots: {', '.join(enabled_bots)}")

        # Keep running
        try:
            while self.running:
                time.sleep(60)  # Check every minute
                # TODO: Health checks
        except KeyboardInterrupt:
            logger.info("Shutting down...")
            self.stop()

    def stop(self):
        """Stop all bots gracefully"""
        logger.info("Stopping Bot Hub Orchestrator...")
        self.running = False
        # TODO: Stop all bots
        logger.info("✓ Bot Hub stopped")

def main():
    """Main entry point"""
    logger.info("=" * 60)
    logger.info("ZenBeasts Bot Hub v1.0.0")
    logger.info("=" * 60)

    orchestrator = BotOrchestrator()
    orchestrator.start()

if __name__ == "__main__":
    main()
"@
        Set-Content -Path "orchestrator.py" -Value $orchestratorCode
        Write-Success "✓ orchestrator.py created"
    }

    # Create a simple test script
    Write-Info "`nCreating test script..."
    $testScript = @"
#!/usr/bin/env python3
"""Test script for Bot Hub installation"""

import sys
import importlib.util

def test_import(package_name):
    """Test if a package can be imported"""
    spec = importlib.util.find_spec(package_name)
    return spec is not None

def main():
    print("Testing Bot Hub installation...\n")

    required_packages = [
        'discord',
        'tweepy',
        'openai',
        'dotenv',
        'yaml',
        'requests',
        'aiohttp',
        'PIL',
        'redis',
        'flask'
    ]

    all_good = True
    for package in required_packages:
        if test_import(package):
            print(f"✓ {package}")
        else:
            print(f"✗ {package} - MISSING")
            all_good = False

    print()
    if all_good:
        print("✓ All required packages installed successfully!")
        return 0
    else:
        print("✗ Some packages are missing. Please check the installation.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
"@
    Set-Content -Path "test_installation.py" -Value $testScript
    Write-Success "✓ test_installation.py created"

    # Run installation test
    Write-Host ""
    $runTest = Read-Host "Would you like to test the installation now? (Y/n)"
    if ($runTest -ne 'n' -and $runTest -ne 'N') {
        Write-Info "`nTesting installation..."
        python test_installation.py
    }

    # Create README for bot-hub
    if (-not (Test-Path "README.md")) {
        Write-Info "`nCreating Bot Hub README..."
        $readme = @"
# ZenBeasts Bot Hub

Automated bot orchestration system for ZenBeasts project.

## Quick Start

1. **Activate virtual environment:**
   ``````powershell
   # Windows
   .\venv\Scripts\Activate.ps1

   # Linux/macOS
   source venv/bin/activate
   ``````

2. **Configure your API keys:**
   Edit `.env` file with your API keys and tokens

3. **Start the orchestrator:**
   ``````bash
   python orchestrator.py
   ``````

4. **Access the dashboard:**
   Open http://localhost:5000 in your browser

## Available Bots

- **Twitter Bot**: Automated posting and engagement
- **Discord Bot**: Community management and moderation
- **Content Bot**: Content generation and scheduling
- **Analytics Bot**: Metrics tracking and reporting
- **Deployment Bot**: Automated deployment tasks
- **Monitoring Bot**: System health checks
- **Rewards Bot**: Automated reward distribution
- **Marketing Bot**: Campaign management

## Configuration

Edit `config/config.yaml` to customize bot behavior and schedules.

## API Keys Required

- Discord Bot Token: https://discord.com/developers/applications
- Twitter API Keys: https://developer.twitter.com/
- OpenAI API Key (optional): https://platform.openai.com/

## Development

Run tests:
``````bash
pytest tests/
``````

Add new bot:
1. Create new file in `bots/` directory
2. Extend `BotBase` class
3. Add configuration to `config.yaml`

## Documentation

See main project documentation for detailed guides.
"@
        Set-Content -Path "README.md" -Value $readme
        Write-Success "✓ README.md created"
    }

    # Summary
    Write-Host ""
    Write-Success "════════════════════════════════════════════════════"
    Write-Success "     Bot Hub Installation Complete!"
    Write-Success "════════════════════════════════════════════════════"
    Write-Host ""

    Write-Info "Installation Summary:"
    Write-Info "  Python: $(python --version)"
    Write-Info "  Virtual Environment: $PWD\venv"
    Write-Info "  Configuration: config/config.yaml"
    Write-Info "  Environment: .env"
    Write-Host ""

    Write-Info "Next Steps:"
    Write-Info "1. Configure API keys in .env file"
    Write-Info "2. Activate virtual environment: .\venv\Scripts\Activate.ps1"
    Write-Info "3. Start orchestrator: python orchestrator.py"
    Write-Info "4. View logs: tail -f logs/orchestrator.log"
    Write-Host ""

    Write-Warning "⚠ IMPORTANT: Edit the .env file with your API keys before starting!"
    Write-Host ""

    Write-Success "Happy automating! 🤖"
    Write-Host ""

} catch {
    Write-Error "Installation failed: $_"
    exit 1
} finally {
    Pop-Location
}
