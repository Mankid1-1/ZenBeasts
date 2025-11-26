# ZenBeasts Automated Installation Script for Windows
# Version: 2.0.0
# Description: Production-ready automated installation with error handling, retry logic, and resume capability

#Requires -Version 5.1

# ============================================================================
# PARAMETERS
# ============================================================================

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("interactive", "full", "solana", "bot-hub", "frontend", "custom")]
    [string]$Mode = "interactive",

    [Parameter(Mandatory=$false)]
    [switch]$Update,

    [Parameter(Mandatory=$false)]
    [switch]$Verify,

    [Parameter(Mandatory=$false)]
    [switch]$DryRun,

    [Parameter(Mandatory=$false)]
    [switch]$SkipInstalled,

    [Parameter(Mandatory=$false)]
    [switch]$Silent,

    [Parameter(Mandatory=$false)]
    [switch]$Resume,

    [Parameter(Mandatory=$false)]
    [ValidateSet("Quiet", "Normal", "Verbose")]
    [string]$LogLevel = "Normal",

    [Parameter(Mandatory=$false)]
    [switch]$NoColor,

    [Parameter(Mandatory=$false)]
    [switch]$Force
)

# ============================================================================
# SCRIPT CONFIGURATION
# ============================================================================

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ProgressPreference = 'SilentlyContinue'  # Speed up downloads

$script:SCRIPT_VERSION = "2.0.0"
$script:INSTALL_STATE_FILE = "$PSScriptRoot\setup\.install-state.json"
$script:LOG_FILE = "$PSScriptRoot\setup\install.log"
$script:MAX_RETRIES = 3
$script:RETRY_DELAY = 2

# Progress tracking
$script:CurrentStep = 0
$script:TotalSteps = 0
$script:InstallationStartTime = Get-Date

# ============================================================================
# COLOR OUTPUT FUNCTIONS
# ============================================================================

function Write-ColorOutput {
    param(
        [string]$Message,
        [ConsoleColor]$ForegroundColor = [ConsoleColor]::White
    )

    if ($NoColor) {
        Write-Host $Message
    } else {
        $fc = $host.UI.RawUI.ForegroundColor
        $host.UI.RawUI.ForegroundColor = $ForegroundColor
        Write-Host $Message
        $host.UI.RawUI.ForegroundColor = $fc
    }
}

function Write-Success {
    param([string]$Message)
    Write-ColorOutput "  [OK] $Message" -ForegroundColor Green
    Write-Log $Message "SUCCESS"
}

function Write-Info {
    param([string]$Message)
    if ($LogLevel -ne "Quiet") {
        Write-ColorOutput "  [INFO] $Message" -ForegroundColor Cyan
    }
    Write-Log $Message "INFO"
}

function Write-Warning {
    param([string]$Message)
    Write-ColorOutput "  [WARN] $Message" -ForegroundColor Yellow
    Write-Log $Message "WARNING"
}

function Write-Error {
    param([string]$Message)
    Write-ColorOutput "  [ERROR] $Message" -ForegroundColor Red
    Write-Log $Message "ERROR"
}

function Write-Verbose {
    param([string]$Message)
    if ($LogLevel -eq "Verbose") {
        Write-ColorOutput "  [DEBUG] $Message" -ForegroundColor DarkGray
    }
    Write-Log $Message "DEBUG"
}

function Write-StepHeader {
    param([string]$Message)
    $script:CurrentStep++
    Write-Host ""
    Write-ColorOutput "[$script:CurrentStep/$script:TotalSteps] $Message" -ForegroundColor Magenta
    Write-Log "STEP $script:CurrentStep/$script:TotalSteps : $Message" "INFO"
}

# ============================================================================
# BANNER
# ============================================================================

function Show-Banner {
    Write-Host ""
    Write-ColorOutput @"
================================================================
     ________  _   __   ____                    __
    /_  __/ / / | / /  / __ )___  ____ ___  ___/ /_____
     / / / / /|  |/ /  / __  / _ \/ __ `` _ \/ __  / ___/
    / / / /__/ /|  /  / /_/ /  __/ / / / / / /_/ (__  )
   /_/  \____/_/ |_/  /_____/\___/_/ /_/ /_/\__,_/____/

              Automated Installation System v$script:SCRIPT_VERSION
================================================================
"@ -ForegroundColor Cyan
    Write-Host ""
}

# ============================================================================
# LOGGING
# ============================================================================

function Initialize-Logging {
    $logDir = Split-Path $script:LOG_FILE -Parent
    if (-not (Test-Path $logDir)) {
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    }

    # Rotate old logs
    if (Test-Path $script:LOG_FILE) {
        $logSize = (Get-Item $script:LOG_FILE).Length / 1MB
        if ($logSize -gt 10) {
            $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
            Move-Item $script:LOG_FILE "$script:LOG_FILE.$timestamp.old" -Force
        }
    }
}

function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )

    try {
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        $logMessage = "[$timestamp] [$Level] $Message"
        Add-Content -Path $script:LOG_FILE -Value $logMessage -ErrorAction SilentlyContinue
    } catch {
        # Silently fail if logging doesn't work
    }
}

# ============================================================================
# STATE MANAGEMENT (Resume Capability)
# ============================================================================

function Save-InstallState {
    param(
        [hashtable]$State
    )

    try {
        $State['LastUpdated'] = (Get-Date).ToString('o')
        $State | ConvertTo-Json -Depth 10 | Set-Content $script:INSTALL_STATE_FILE
        Write-Verbose "Installation state saved"
    } catch {
        Write-Verbose "Failed to save state: $_"
    }
}

function Get-InstallState {
    try {
        if (Test-Path $script:INSTALL_STATE_FILE) {
            $state = Get-Content $script:INSTALL_STATE_FILE -Raw | ConvertFrom-Json
            return @{
                InstalledComponents = $state.InstalledComponents
                LastStep = $state.LastStep
                InstallMode = $state.InstallMode
            }
        }
    } catch {
        Write-Verbose "Could not load state: $_"
    }

    return @{
        InstalledComponents = @()
        LastStep = 0
        InstallMode = ""
    }
}

function Clear-InstallState {
    if (Test-Path $script:INSTALL_STATE_FILE) {
        Remove-Item $script:INSTALL_STATE_FILE -Force -ErrorAction SilentlyContinue
    }
}

# ============================================================================
# SYSTEM CHECKS
# ============================================================================

function Test-Administrator {
    $currentUser = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    return $currentUser.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Test-InternetConnection {
    param([int]$TimeoutSeconds = 5)

    try {
        $result = Test-Connection -ComputerName "8.8.8.8" -Count 1 -Quiet -ErrorAction Stop
        return $result
    } catch {
        return $false
    }
}

function Test-DiskSpace {
    param([int]$RequiredSpaceGB = 20)

    $drive = (Get-Item $PSScriptRoot).PSDrive
    $freeSpaceGB = [math]::Round((Get-PSDrive $drive.Name).Free / 1GB, 2)

    Write-Verbose "Free space on drive $($drive.Name): ${freeSpaceGB}GB"
    return $freeSpaceGB -ge $RequiredSpaceGB
}

function Get-SystemInfo {
    return @{
        OS = [System.Environment]::OSVersion.VersionString
        PSVersion = $PSVersionTable.PSVersion.ToString()
        Architecture = if ([System.Environment]::Is64BitOperatingSystem) { "64-bit" } else { "32-bit" }
        User = $env:USERNAME
        ComputerName = $env:COMPUTERNAME
        ScriptPath = $PSScriptRoot
    }
}

# ============================================================================
# ENVIRONMENT PATH MANAGEMENT
# ============================================================================

function Update-SessionPath {
    <#
    .SYNOPSIS
    Refreshes the PATH environment variable in the current session without restart
    #>

    Write-Verbose "Refreshing PATH environment variable"

    # Force reload from registry to get latest changes
    $machinePath = [Microsoft.Win32.Registry]::LocalMachine.OpenSubKey("SYSTEM\CurrentControlSet\Control\Session Manager\Environment").GetValue("Path", "", [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)
    $userPath = [Microsoft.Win32.Registry]::CurrentUser.OpenSubKey("Environment").GetValue("Path", "", [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)

    # Combine and remove duplicates
    $allPaths = ($machinePath + ";" + $userPath) -split ';' |
                Where-Object { $_ -ne "" } |
                ForEach-Object { $_.Trim() } |
                Where-Object { $_ } |
                Select-Object -Unique

    $env:Path = $allPaths -join ';'

    # Also refresh environment variables in current process
    [System.Environment]::SetEnvironmentVariable("Path", $env:Path, [System.EnvironmentVariableTarget]::Process)

    Write-Verbose "PATH updated in current session: $($allPaths.Count) paths"
}

function Add-ToPath {
    param(
        [string]$Path,
        [ValidateSet("User", "Machine")]
        [string]$Scope = "User"
    )

    if (-not (Test-Path $Path)) {
        Write-Warning "Path does not exist: $Path"
        return $false
    }

    $currentPath = [Environment]::GetEnvironmentVariable("Path", $Scope)

    if ($currentPath -notlike "*$Path*") {
        $newPath = "$currentPath;$Path"
        [Environment]::SetEnvironmentVariable("Path", $newPath, $Scope)
        Write-Verbose "Added to PATH ($Scope): $Path"
        Update-SessionPath
        return $true
    }

    Write-Verbose "Already in PATH: $Path"
    return $false
}

# ============================================================================
# COMMAND EXISTENCE & VERSION CHECKING
# ============================================================================

function Test-CommandExists {
    param([string]$Command)

    try {
        $null = Get-Command $Command -ErrorAction Stop
        return $true
    } catch {
        # If not in PATH, check common installation locations
        $commonPaths = @(
            "$env:ProgramFiles\Git\cmd",
            "$env:ProgramFiles\Git\bin",
            "${env:ProgramFiles(x86)}\Git\cmd",
            "${env:ProgramFiles(x86)}\Git\bin",
            "$env:ProgramData\chocolatey\bin",
            "$env:LOCALAPPDATA\Programs",
            "$env:ProgramFiles\nodejs",
            "$env:APPDATA\npm",
            "C:\Program Files\Git\cmd",
            "C:\Program Files\Git\bin"
        )

        foreach ($path in $commonPaths) {
            $fullPath = Join-Path $path "$Command.exe"
            if (Test-Path $fullPath -ErrorAction SilentlyContinue) {
                Write-Verbose "Found $Command at: $fullPath"
                # Add this path to session PATH
                if ($env:Path -notlike "*$path*") {
                    $env:Path = "$env:Path;$path"
                }
                return $true
            }
        }

        return $false
    }
}

function Test-GitInstalled {
    # Check if Git executable exists even if not in PATH
    $gitPaths = @(
        "$env:ProgramFiles\Git\cmd\git.exe",
        "$env:ProgramFiles\Git\bin\git.exe",
        "C:\Program Files\Git\cmd\git.exe",
        "C:\Program Files\Git\bin\git.exe",
        "${env:ProgramFiles(x86)}\Git\cmd\git.exe",
        "${env:ProgramFiles(x86)}\Git\bin\git.exe"
    )

    foreach ($gitPath in $gitPaths) {
        if (Test-Path $gitPath) {
            Write-Verbose "Git executable found at: $gitPath"
            # Add to PATH if not already there
            $gitDir = Split-Path $gitPath -Parent
            if ($env:Path -notlike "*$gitDir*") {
                $env:Path = "$env:Path;$gitDir"
            }
            return $true
        }
    }

    return (Test-CommandExists "git")
}

function Get-CommandVersion {
    param(
        [string]$Command,
        [string]$VersionArg = "--version"
    )

    try {
        $output = & $Command $VersionArg 2>&1 | Select-Object -First 1
        return $output.ToString().Trim()
    } catch {
        return "Unknown"
    }
}

function Test-ComponentInstalled {
    param(
        [string]$Name,
        [string]$Command,
        [string]$MinVersion = $null
    )

    Write-Verbose "Checking for $Name..."

    if (-not (Test-CommandExists $Command)) {
        Write-Verbose "$Name not found"
        return $false
    }

    $version = Get-CommandVersion $Command
    Write-Verbose "$Name found: $version"

    # Version checking could be enhanced here if needed

    return $true
}

# ============================================================================
# RETRY LOGIC
# ============================================================================

function Invoke-WithRetry {
    param(
        [scriptblock]$ScriptBlock,
        [int]$MaxRetries = $script:MAX_RETRIES,
        [int]$RetryDelay = $script:RETRY_DELAY,
        [string]$Operation = "Operation"
    )

    $attempt = 0
    $success = $false
    $lastError = $null

    while ($attempt -lt $MaxRetries -and -not $success) {
        $attempt++

        try {
            Write-Verbose "Attempt $attempt of $MaxRetries for: $Operation"
            & $ScriptBlock
            $success = $true
            Write-Verbose "$Operation succeeded on attempt $attempt"
        } catch {
            $lastError = $_
            Write-Verbose "$Operation failed on attempt $attempt`: $lastError"

            if ($attempt -lt $MaxRetries) {
                Write-Warning "Retrying in $RetryDelay seconds... ($attempt/$MaxRetries)"
                Start-Sleep -Seconds $RetryDelay
            }
        }
    }

    if (-not $success) {
        throw "Failed after $MaxRetries attempts: $lastError"
    }

    return $success
}

# ============================================================================
# INSTALLATION FUNCTIONS
# ============================================================================

function Test-RebootRequired {
    try {
        $rebootRequired = Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending" -ErrorAction SilentlyContinue
        if ($rebootRequired) {
            return $true
        }

        $rebootRequired = Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired" -ErrorAction SilentlyContinue
        if ($rebootRequired) {
            return $true
        }

        return $false
    } catch {
        return $false
    }
}

function Install-Chocolatey {
    if ($SkipInstalled -and (Test-CommandExists "choco")) {
        Write-Info "Chocolatey already installed (skipped)"
        return $true
    }

    Write-StepHeader "Installing Chocolatey Package Manager"

    if ($DryRun) {
        Write-Info "[DRY-RUN] Would install Chocolatey"
        return $true
    }

    try {
        if (Test-CommandExists "choco") {
            Write-Success "Chocolatey already installed"
            return $true
        }

        Invoke-WithRetry -Operation "Chocolatey installation" -MaxRetries 1 -ScriptBlock {
            [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
            $env:chocolateyUseWindowsCompression = 'true'
            $env:chocolateyIgnoreDependencies = 'true'
            Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
        }

        Update-SessionPath

        if (Test-CommandExists "choco") {
            Write-Success "Chocolatey installed successfully"

            # Check if reboot is required
            if (Test-RebootRequired) {
                Write-Warning ""
                Write-Warning "=========================================="
                Write-Warning "  REBOOT MAY BE REQUIRED"
                Write-Warning "=========================================="
                Write-Warning "Chocolatey installed .NET Framework which requires a reboot."
                Write-Warning "You can continue installation and reboot later, or reboot now."
                Write-Warning ""

                if (-not $Silent -and -not $Force) {
                    Write-Info "Options:"
                    Write-Info "  1. Continue installation (reboot later)"
                    Write-Info "  2. Reboot now and resume with: .\install.ps1 -Resume"
                    Write-Info "  3. Cancel installation"
                    Write-Host ""

                    $choice = Read-Host "Select option (1-3) [1]"
                    if ([string]::IsNullOrWhiteSpace($choice)) { $choice = "1" }

                    switch ($choice.Trim()) {
                        "2" {
                            Write-Info "Saving installation state..."
                            $state = @{
                                InstalledComponents = @("Chocolatey")
                                LastStep = $script:CurrentStep
                                InstallMode = "full"
                            }
                            Save-InstallState $state
                            Write-Info "Rebooting in 10 seconds... (Ctrl+C to cancel)"
                            Start-Sleep -Seconds 10
                            Restart-Computer -Force
                            exit 0
                        }
                        "3" {
                            Write-Info "Installation cancelled by user"
                            exit 0
                        }
                        default {
                            Write-Info "Continuing installation. Remember to reboot later!"
                        }
                    }
                }
            }

            return $true
        } else {
            throw "Chocolatey command not available after installation"
        }
    } catch {
        Write-Error "Failed to install Chocolatey: $($_.Exception.Message)"
        return $false
    }
}

function Install-Tool {
    param(
        [string]$Name,
        [string]$Command,
        [string]$ChocoPackage,
        [scriptblock]$CustomInstaller = $null,
        [scriptblock]$PostInstall = $null
    )

    if ($SkipInstalled -and (Test-ComponentInstalled -Name $Name -Command $Command)) {
        Write-Info "$Name already installed (skipped)"
        return $true
    }

    Write-StepHeader "Installing $Name"

    if ($DryRun) {
        Write-Info "[DRY-RUN] Would install $Name"
        return $true
    }

    try {
        if (Test-ComponentInstalled -Name $Name -Command $Command) {
            $version = Get-CommandVersion $Command
            Write-Success "$Name already installed: $version"
            return $true
        }

        if ($CustomInstaller) {
            Write-Verbose "Using custom installer for $Name"
            Invoke-WithRetry -Operation "$Name installation" -ScriptBlock $CustomInstaller
        } elseif ($ChocoPackage) {
            Write-Verbose "Installing $Name via Chocolatey: $ChocoPackage"
            Invoke-WithRetry -Operation "$Name installation" -ScriptBlock {
                # Add ignore dependencies to avoid .NET Framework installation loops
                choco install $ChocoPackage -y --force --limit-output --ignore-dependencies
                if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne 3010) {
                    # 3010 = success but reboot required
                    throw "Chocolatey install failed with exit code $LASTEXITCODE"
                }
            }
        } else {
            throw "No installation method specified for $Name"
        }

        # Wait a moment for installers to complete
        Start-Sleep -Seconds 2

        # Refresh PATH multiple times to ensure we get the latest
        Update-SessionPath
        Start-Sleep -Seconds 1
        Update-SessionPath

        if ($PostInstall) {
            Write-Verbose "Running post-install script for $Name"
            & $PostInstall
        }

        # Give the command time to become available
        $maxAttempts = 5
        $attempt = 0
        $commandAvailable = $false

        while ($attempt -lt $maxAttempts -and -not $commandAvailable) {
            $attempt++
            Update-SessionPath

            # For Git specifically, manually add known paths
            if ($Command -eq "git") {
                $gitPaths = @(
                    "$env:ProgramFiles\Git\cmd",
                    "$env:ProgramFiles\Git\bin",
                    "C:\Program Files\Git\cmd",
                    "C:\Program Files\Git\bin"
                )
                foreach ($gitPath in $gitPaths) {
                    if ((Test-Path $gitPath) -and ($env:Path -notlike "*$gitPath*")) {
                        Write-Verbose "Adding Git path: $gitPath"
                        $env:Path = "$env:Path;$gitPath"
                    }
                }
            }

            if (Test-ComponentInstalled -Name $Name -Command $Command) {
                $commandAvailable = $true
                $version = Get-CommandVersion $Command
                Write-Success "$Name installed successfully: $version"
                return $true
            }

            if ($attempt -lt $maxAttempts) {
                Write-Verbose "Command not available yet, waiting... (attempt $attempt/$maxAttempts)"
                Start-Sleep -Seconds 2
            }
        }

        if (-not $commandAvailable) {
            Write-Warning "$Name was installed but command is not immediately available."
            Write-Warning "Please close and reopen your terminal, then run: .\install.ps1 -Resume"

            # Save state so we can resume
            $state = Get-InstallState
            $state.InstalledComponents += $Name
            Save-InstallState -State $state

            throw "$Name command not available after installation. Please restart your terminal and run: .\install.ps1 -Resume"
        }
    } catch {
        Write-Error "Failed to install ${Name}: $($_.Exception.Message)"
        if (-not $Force) {
            throw
        }
        return $false
    }
}

function Install-Git {
    # Check if Git is already installed (even if not in PATH)
    if (Test-GitInstalled) {
        Update-SessionPath
        if (Test-CommandExists "git") {
            $version = Get-CommandVersion "git"
            Write-Success "Git already installed: $version"
            return $true
        }
    }

    $result = Install-Tool -Name "Git" -Command "git" -ChocoPackage "git" -PostInstall {
        # Configure git for better Windows experience
        Update-SessionPath

        # Force add Git paths
        $gitPaths = @(
            "$env:ProgramFiles\Git\cmd",
            "$env:ProgramFiles\Git\bin",
            "C:\Program Files\Git\cmd",
            "C:\Program Files\Git\bin"
        )

        foreach ($gitPath in $gitPaths) {
            if ((Test-Path $gitPath) -and ($env:Path -notlike "*$gitPath*")) {
                Write-Verbose "Adding Git path: $gitPath"
                $env:Path = "$env:Path;$gitPath"
            }
        }

        # Try to configure git
        try {
            $gitExe = Get-Command git -ErrorAction SilentlyContinue
            if ($gitExe) {
                & git config --global core.autocrlf true
                & git config --global core.longpaths true
            }
        } catch {
            Write-Verbose "Could not configure git: $_"
        }
    }

    # Final check for Git
    if (-not $result) {
        # Even if Install-Tool failed, check if Git executable exists
        if (Test-GitInstalled) {
            Write-Success "Git was installed successfully"
            return $true
        }
    }

    return $result
}

function Install-NodeJS {
    return Install-Tool -Name "Node.js" -Command "node" -ChocoPackage "nodejs-lts" -PostInstall {
        Update-SessionPath
        # Update npm to latest
        try {
            npm install -g npm@latest --silent 2>&1 | Out-Null
        } catch {
            Write-Verbose "Could not update npm: $_"
        }
    }
}

function Install-Python {
    return Install-Tool -Name "Python" -Command "python" -ChocoPackage "python310"
}

function Install-Rust {
    $customInstaller = {
        Write-Verbose "Downloading rustup installer"
        $rustupPath = "$env:TEMP\rustup-init.exe"

        $webClient = New-Object System.Net.WebClient
        $webClient.DownloadFile("https://win.rustup.rs/x86_64", $rustupPath)

        Write-Verbose "Running rustup installer"
        Start-Process -FilePath $rustupPath -ArgumentList "-y", "--default-toolchain", "stable" -Wait -NoNewWindow

        if ($LASTEXITCODE -ne 0) {
            throw "Rustup installation failed with exit code $LASTEXITCODE"
        }
    }

    $postInstall = {
        $cargoPath = "$env:USERPROFILE\.cargo\bin"
        Add-ToPath -Path $cargoPath -Scope "User"
    }

    return Install-Tool -Name "Rust" -Command "rustc" -CustomInstaller $customInstaller -PostInstall $postInstall
}

function Install-Solana {
    $customInstaller = {
        Write-Verbose "Downloading Solana installer"
        $solanaInstaller = "$env:TEMP\solana-install.exe"

        $webClient = New-Object System.Net.WebClient
        $webClient.DownloadFile("https://release.solana.com/v1.17.16/solana-install-init-x86_64-pc-windows-msvc.exe", $solanaInstaller)

        Write-Verbose "Running Solana installer"
        Start-Process -FilePath $solanaInstaller -ArgumentList "v1.17.16" -Wait -NoNewWindow

        if ($LASTEXITCODE -ne 0) {
            throw "Solana installation failed with exit code $LASTEXITCODE"
        }
    }

    $postInstall = {
        $solanaPath = "$env:USERPROFILE\.local\share\solana\install\active_release\bin"
        Add-ToPath -Path $solanaPath -Scope "User"
    }

    return Install-Tool -Name "Solana CLI" -Command "solana" -CustomInstaller $customInstaller -PostInstall $postInstall
}

function Install-Anchor {
    $customInstaller = {
        Write-Verbose "Installing Anchor via Cargo (this may take 10-15 minutes)"
        Write-Info "Please be patient, Anchor is compiling from source..."

        cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked --force 2>&1 | Out-Null

        if ($LASTEXITCODE -ne 0) {
            throw "Anchor installation failed with exit code $LASTEXITCODE"
        }
    }

    return Install-Tool -Name "Anchor" -Command "anchor" -CustomInstaller $customInstaller
}

function Install-Docker {
    param([bool]$Optional = $true)

    if ($Optional -and -not $Silent) {
        $response = Read-Host "Install Docker Desktop? (y/N)"
        if ($response -ne 'y' -and $response -ne 'Y') {
            Write-Info "Skipping Docker installation"
            return $true
        }
    }

    return Install-Tool -Name "Docker Desktop" -Command "docker" -ChocoPackage "docker-desktop" -PostInstall {
        Write-Warning "Docker Desktop requires a system restart"
        Write-Info "After reboot, run: .\install.ps1 -Resume"
    }
}

# ============================================================================
# ENVIRONMENT SETUP
# ============================================================================

function Initialize-EnvironmentFiles {
    Write-StepHeader "Setting up environment configuration files"

    if ($DryRun) {
        Write-Info "[DRY-RUN] Would create environment files"
        return $true
    }

    try {
        $filesCreated = 0

        # Main .env
        if (-not (Test-Path ".env") -and (Test-Path ".env.template")) {
            Copy-Item ".env.template" ".env"
            Write-Success "Created .env file"
            $filesCreated++
        }

        # Bot Hub .env
        if ((Test-Path "bot-hub") -and -not (Test-Path "bot-hub\.env") -and (Test-Path "bot-hub\.env.template")) {
            Copy-Item "bot-hub\.env.template" "bot-hub\.env"
            Write-Success "Created bot-hub/.env file"
            $filesCreated++
        }

        # Frontend .env.local
        if ((Test-Path "frontend") -and -not (Test-Path "frontend\.env.local") -and (Test-Path "frontend\.env.template")) {
            Copy-Item "frontend\.env.template" "frontend\.env.local"
            Write-Success "Created frontend/.env.local file"
            $filesCreated++
        }

        if ($filesCreated -eq 0) {
            Write-Info "Environment files already exist"
        }

        return $true
    } catch {
        Write-Error "Failed to setup environment files: $($_.Exception.Message)"
        return $false
    }
}

# ============================================================================
# COMPONENT INSTALLERS
# ============================================================================

function Install-ComponentDependencies {
    param([string]$Component)

    $scriptPath = "$PSScriptRoot\setup\install-$Component.ps1"

    if (-not (Test-Path $scriptPath)) {
        Write-Verbose "Component script not found: $scriptPath"
        return $true
    }

    Write-StepHeader "Installing $Component dependencies"

    if ($DryRun) {
        Write-Info "[DRY-RUN] Would install $Component dependencies"
        return $true
    }

    try {
        & $scriptPath
        return $?
    } catch {
        Write-Error "Failed to install ${Component} dependencies: $($_.Exception.Message)"
        return $false
    }
}

# ============================================================================
# MENU & USER INTERACTION
# ============================================================================

function Show-InstallationMenu {
    Write-Host ""
    Write-ColorOutput "=== Installation Options ===" -ForegroundColor Cyan
    Write-Host "1. Full Stack Installation (Recommended)"
    Write-Host "2. Solana Development Only"
    Write-Host "3. Bot Hub Only"
    Write-Host "4. Frontend Only"
    Write-Host "5. Custom Installation"
    Write-Host "6. Exit"
    Write-Host ""

    do {
        $choice = Read-Host "Select an option (1-6)"
        $choice = $choice.Trim()

        if ($choice -match '^[1-6]$') {
            return $choice
        }

        Write-Warning "Invalid input. Please enter a number between 1 and 6."
    } while ($true)
}

function Confirm-Continue {
    param([string]$Message = "Continue?")

    if ($Silent) {
        return $true
    }

    $response = Read-Host "$Message (Y/n)"
    return ($response -eq '' -or $response -eq 'y' -or $response -eq 'Y')
}

# ============================================================================
# VERIFICATION
# ============================================================================

function Test-Installation {
    Write-Host ""
    Write-ColorOutput "=== Installation Verification ===" -ForegroundColor Cyan
    Write-Host ""

    $results = @{
        Passed = 0
        Failed = 0
        Components = @()
    }

    $components = @(
        @{Name="Git"; Command="git"},
        @{Name="Node.js"; Command="node"},
        @{Name="npm"; Command="npm"},
        @{Name="Python"; Command="python"},
        @{Name="pip"; Command="pip"},
        @{Name="Rust"; Command="rustc"},
        @{Name="Cargo"; Command="cargo"},
        @{Name="Solana CLI"; Command="solana"},
        @{Name="Anchor"; Command="anchor"}
    )

    foreach ($component in $components) {
        $installed = Test-ComponentInstalled -Name $component.Name -Command $component.Command

        if ($installed) {
            $version = Get-CommandVersion $component.Command
            Write-Success "$($component.Name): $version"
            $results.Passed++
        } else {
            Write-Error "$($component.Name): Not found"
            $results.Failed++
        }

        $results.Components += @{
            Name = $component.Name
            Installed = $installed
        }
    }

    Write-Host ""
    Write-ColorOutput "Results: $($results.Passed) passed, $($results.Failed) failed" -ForegroundColor $(if ($results.Failed -eq 0) { "Green" } else { "Yellow" })
    Write-Host ""

    return ($results.Failed -eq 0)
}

# ============================================================================
# PRE-FLIGHT CHECKS
# ============================================================================

function Invoke-PreFlightChecks {
    Write-ColorOutput "=== Pre-Flight System Checks ===" -ForegroundColor Cyan
    Write-Host ""

    $sysInfo = Get-SystemInfo
    Write-Info "OS: $($sysInfo.OS)"
    Write-Info "PowerShell: $($sysInfo.PSVersion)"
    Write-Info "Architecture: $($sysInfo.Architecture)"
    Write-Host ""

    # Check administrator
    if (-not (Test-Administrator)) {
        Write-Warning "Not running as Administrator"
        Write-Warning "Some installations may fail without admin privileges"

        if (-not $Silent -and -not $Force) {
            if (-not (Confirm-Continue "Continue anyway?")) {
                Write-Info "Please restart PowerShell as Administrator"
                exit 1
            }
        }
    } else {
        Write-Success "Running with Administrator privileges"
    }

    # Check internet
    if (-not (Test-InternetConnection)) {
        Write-Error "No internet connection detected"
        Write-Error "Internet connection is required for installation"

        if (-not $Force) {
            exit 1
        }
    } else {
        Write-Success "Internet connection verified"
    }

    # Check disk space
    if (-not (Test-DiskSpace -RequiredSpaceGB 20)) {
        Write-Warning "Less than 20GB free disk space"

        if (-not $Silent -and -not $Force) {
            if (-not (Confirm-Continue)) {
                exit 1
            }
        }
    } else {
        Write-Success "Sufficient disk space available"
    }

    Write-Host ""
}

# ============================================================================
# MAIN INSTALLATION ORCHESTRATOR
# ============================================================================

function Start-Installation {
    param([string]$InstallMode)

    Show-Banner

    if (-not $DryRun) {
        Invoke-PreFlightChecks
    }

    Write-Info "Installation mode: $InstallMode"
    Write-Info "Logs: $script:LOG_FILE"
    if ($DryRun) { Write-Warning "DRY-RUN MODE: No actual changes will be made" }
    if ($SkipInstalled) { Write-Info "Skipping already installed components" }
    Write-Host ""

    # Determine installation choice
    if ($InstallMode -eq "interactive") {
        $choice = Show-InstallationMenu
    } else {
        $choice = $InstallMode
    }

    # Calculate total steps
    $script:TotalSteps = switch ($choice) {
        "1" { 12 }  # Full stack
        "2" { 7 }   # Solana
        "3" { 5 }   # Bot Hub
        "4" { 5 }   # Frontend
        "5" { 10 }  # Custom (approximate)
        "6" { 0 }   # Exit
        default { 0 }
    }

    $script:CurrentStep = 0

    try {
        switch ($choice) {
            "1" {
                # Full Stack Installation
                Write-Host ""
                Write-ColorOutput "=== Full Stack Installation ===" -ForegroundColor Green
                Write-Host ""

                Install-Chocolatey
                Install-Git
                Install-NodeJS
                Install-Python
                Install-Rust
                Install-Solana
                Install-Anchor
                Install-Docker -Optional $true
                Initialize-EnvironmentFiles
                Install-ComponentDependencies "solana"
                Install-ComponentDependencies "bot-hub"
                Install-ComponentDependencies "frontend"

                # Check for reboot requirement
                if (Test-RebootRequired) {
                    Write-Warning ""
                    Write-Warning "=========================================="
                    Write-Warning "  REBOOT REQUIRED"
                    Write-Warning "=========================================="
                    Write-Warning "Some components require a system restart."
                    Write-Warning "After rebooting, run: .\install.ps1 -Resume"
                    Write-Warning ""
                }
            }
            "2" {
                # Solana Development
                Write-Host ""
                Write-ColorOutput "=== Solana Development Installation ===" -ForegroundColor Green
                Write-Host ""

                Install-Chocolatey
                Install-Git
                Install-Rust
                Install-Solana
                Install-Anchor
                Initialize-EnvironmentFiles
                Install-ComponentDependencies "solana"
            }
            "3" {
                # Bot Hub
                Write-Host ""
                Write-ColorOutput "=== Bot Hub Installation ===" -ForegroundColor Green
                Write-Host ""

                Install-Chocolatey
                Install-Git
                Install-Python
                Initialize-EnvironmentFiles
                Install-ComponentDependencies "bot-hub"
            }
            "4" {
                # Frontend
                Write-Host ""
                Write-ColorOutput "=== Frontend Installation ===" -ForegroundColor Green
                Write-Host ""

                Install-Chocolatey
                Install-Git
                Install-NodeJS
                Initialize-EnvironmentFiles
                Install-ComponentDependencies "frontend"
            }
            "5" {
                # Custom Installation
                Write-Host ""
                Write-ColorOutput "=== Custom Installation ===" -ForegroundColor Green
                Write-Host ""

                if (-not $Silent) {
                    Write-Host "Select components to install:"
                    Write-Host ""

                    $installGit = Confirm-Continue "Install Git?"
                    $installNode = Confirm-Continue "Install Node.js?"
                    $installPython = Confirm-Continue "Install Python?"
                    $installRust = Confirm-Continue "Install Rust?"
                    $installSolana = Confirm-Continue "Install Solana CLI?"
                    $installAnchor = Confirm-Continue "Install Anchor?"
                    $installDocker = Confirm-Continue "Install Docker?"
                } else {
                    $installGit = $installNode = $installPython = $installRust = $installSolana = $installAnchor = $installDocker = $true
                }

                Install-Chocolatey
                if ($installGit) { Install-Git }
                if ($installNode) { Install-NodeJS }
                if ($installPython) { Install-Python }
                if ($installRust) { Install-Rust }
                if ($installSolana) { Install-Solana }
                if ($installAnchor) { Install-Anchor }
                if ($installDocker) { Install-Docker -Optional $false }
                Initialize-EnvironmentFiles
            }
            "6" {
                Write-Info "Exiting installer"
                exit 0
            }
            default {
                Write-Error "Invalid option: $choice"
                exit 1
            }
        }

        # Final verification
        Write-Host ""
        Write-ColorOutput "=== Installation Complete ===" -ForegroundColor Green
        Write-Host ""

        $elapsed = (Get-Date) - $script:InstallationStartTime
        Write-Info "Total time: $($elapsed.ToString('mm\:ss'))"
        Write-Host ""

        if (-not $DryRun) {
            Test-Installation

            # Final reboot check
            if (Test-RebootRequired) {
                Write-Host ""
                Write-Warning "=========================================="
                Write-Warning "  REBOOT RECOMMENDED"
                Write-Warning "=========================================="
                Write-Warning "A system restart is recommended to complete installation."
                Write-Warning "Some components may not work until you reboot."
                Write-Host ""

                if (-not $Silent) {
                    $rebootNow = Read-Host "Reboot now? (y/N)"
                    if ($rebootNow -eq 'y' -or $rebootNow -eq 'Y') {
                        Write-Info "Rebooting system in 10 seconds..."
                        Write-Info "Press Ctrl+C to cancel"
                        Start-Sleep -Seconds 10
                        Restart-Computer -Force
                        exit 0
                    }
                }
            }
        }

        # Offer configuration wizard
        if (-not $Silent -and -not $DryRun) {
            Write-Host ""
            if (Confirm-Continue "Run configuration wizard now?") {
                $wizardPath = "$PSScriptRoot\setup\config-wizard.ps1"
                if (Test-Path $wizardPath) {
                    & $wizardPath
                } else {
                    Write-Warning "Configuration wizard not found: $wizardPath"
                }
            } else {
                Write-Info "Run configuration wizard later: .\setup\config-wizard.ps1"
            }
        }

        # Print next steps
        Write-Host ""
        Write-ColorOutput "=== Next Steps ===" -ForegroundColor Cyan
        Write-Info "1. Configure API keys: .\setup\config-wizard.ps1"
        Write-Info "2. Build contracts: cd programs; anchor build"
        Write-Info "3. Start Bot Hub: cd bot-hub; python orchestrator.py"
        Write-Info "4. Launch frontend: cd frontend; npm run dev"
        Write-Host ""
        Write-Info "Documentation:"
        Write-Info "  - Quick Start: .\QUICK_START.md"
        Write-Info "  - Installation: .\INSTALLATION_GUIDE.md"
        Write-Info "  - Troubleshooting: .\TROUBLESHOOTING_INSTALL.md"
        Write-Host ""
        Write-Success "Installation completed successfully! 🎉"
        Write-Host ""

        Clear-InstallState

    } catch {
        Write-Host ""
        Write-Error "Installation failed: $($_.Exception.Message)"
        Write-Error "Stack trace: $($_.ScriptStackTrace)"
        Write-Host ""
        Write-Warning "Check logs for details: $script:LOG_FILE"
        Write-Host ""

        if (-not $Force) {
            exit 1
        }
    }
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

try {
    # Initialize
    Initialize-Logging

    # Handle special modes
    if ($Update) {
        Show-Banner
        Write-Info "Updating ZenBeasts from Git..."

        try {
            git fetch origin
            git pull origin main
            Write-Success "Update complete"
            Write-Info "Re-run installer if needed: .\install.ps1"
        } catch {
            Write-Error "Update failed: $($_.Exception.Message)"
            Write-Info "Manual update: git pull origin main"
            exit 1
        }

        exit 0
    }

    if ($Verify) {
        Show-Banner
        $success = Test-Installation
        exit $(if ($success) { 0 } else { 1 })
    }

    # Map mode parameter
    $modeMap = @{
        "interactive" = "interactive"
        "full" = "1"
        "solana" = "2"
        "bot-hub" = "3"
        "frontend" = "4"
        "custom" = "5"
    }

    $installMode = if ($Mode -eq "interactive") {
        "interactive"
    } else {
        $mapped = $modeMap[$Mode]
        if (-not $mapped) {
            Write-Error "Invalid mode: $Mode"
            Write-Error "Valid modes: interactive, full, solana, bot-hub, frontend, custom"
            exit 1
        }
        $mapped
    }

    # Start installation
    Start-Installation -InstallMode $installMode

} catch {
    Write-Host ""
    Write-Error "Fatal error: $($_.Exception.Message)"
    Write-Error "Location: $($_.InvocationInfo.ScriptName):$($_.InvocationInfo.ScriptLineNumber)"
    Write-Host ""
    Write-Warning "Check logs: $script:LOG_FILE"
    Write-Info "For help, see: .\TROUBLESHOOTING_INSTALL.md"
    Write-Host ""
    exit 1
}
