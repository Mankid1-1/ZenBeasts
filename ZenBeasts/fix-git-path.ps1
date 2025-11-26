#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Quick fix script to add Git to PATH and verify installation

.DESCRIPTION
    This script manually adds Git to the system PATH if it's installed but not accessible.
    Useful when Chocolatey installs Git but it's not immediately available in the current session.

.EXAMPLE
    .\fix-git-path.ps1
#>

Write-Host "=== Git PATH Fix Script ===" -ForegroundColor Cyan
Write-Host ""

# Function to test if Git is accessible
function Test-GitCommand {
    try {
        $null = Get-Command git -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

# Function to find Git installation
function Find-GitInstallation {
    $possiblePaths = @(
        "$env:ProgramFiles\Git",
        "${env:ProgramFiles(x86)}\Git",
        "C:\Program Files\Git",
        "C:\Program Files (x86)\Git",
        "$env:ProgramData\chocolatey\lib\git\tools"
    )

    foreach ($basePath in $possiblePaths) {
        if (Test-Path $basePath) {
            Write-Host "[FOUND] Git installation at: $basePath" -ForegroundColor Green
            return $basePath
        }
    }

    return $null
}

# Check if Git is already accessible
if (Test-GitCommand) {
    $version = git --version
    Write-Host "[OK] Git is already accessible: $version" -ForegroundColor Green
    exit 0
}

Write-Host "[INFO] Git command not found in PATH, searching..." -ForegroundColor Yellow

# Find Git installation
$gitBase = Find-GitInstallation

if (-not $gitBase) {
    Write-Host "[ERROR] Git installation not found on this system" -ForegroundColor Red
    Write-Host "[INFO] Install Git with: choco install git -y" -ForegroundColor Yellow
    exit 1
}

# Add Git paths to current session
$gitCmdPath = Join-Path $gitBase "cmd"
$gitBinPath = Join-Path $gitBase "bin"
$gitMingwPath = Join-Path $gitBase "mingw64\bin"

$pathsToAdd = @()

if (Test-Path $gitCmdPath) {
    $pathsToAdd += $gitCmdPath
    Write-Host "[INFO] Found Git cmd: $gitCmdPath" -ForegroundColor Cyan
}

if (Test-Path $gitBinPath) {
    $pathsToAdd += $gitBinPath
    Write-Host "[INFO] Found Git bin: $gitBinPath" -ForegroundColor Cyan
}

if (Test-Path $gitMingwPath) {
    $pathsToAdd += $gitMingwPath
    Write-Host "[INFO] Found Git mingw64: $gitMingwPath" -ForegroundColor Cyan
}

if ($pathsToAdd.Count -eq 0) {
    Write-Host "[ERROR] Git directories found but no executable paths exist" -ForegroundColor Red
    exit 1
}

# Add to current session PATH
Write-Host ""
Write-Host "[INFO] Adding Git paths to current session..." -ForegroundColor Yellow

foreach ($path in $pathsToAdd) {
    if ($env:Path -notlike "*$path*") {
        $env:Path = "$path;$env:Path"
        Write-Host "[ADDED] $path" -ForegroundColor Green
    } else {
        Write-Host "[SKIP] Already in PATH: $path" -ForegroundColor Gray
    }
}

# Refresh environment from registry
Write-Host ""
Write-Host "[INFO] Refreshing environment from registry..." -ForegroundColor Yellow

try {
    $machinePath = [Microsoft.Win32.Registry]::LocalMachine.OpenSubKey(
        "SYSTEM\CurrentControlSet\Control\Session Manager\Environment"
    ).GetValue("Path", "", [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)

    $userPath = [Microsoft.Win32.Registry]::CurrentUser.OpenSubKey(
        "Environment"
    ).GetValue("Path", "", [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)

    $allPaths = ($machinePath + ";" + $userPath) -split ';' |
                Where-Object { $_ } |
                Select-Object -Unique

    $env:Path = $allPaths -join ';'
    Write-Host "[OK] Environment refreshed from registry" -ForegroundColor Green
} catch {
    Write-Host "[WARN] Could not refresh from registry: $_" -ForegroundColor Yellow
}

# Test if Git is now accessible
Write-Host ""
Write-Host "[INFO] Testing Git command..." -ForegroundColor Yellow

if (Test-GitCommand) {
    $version = git --version
    Write-Host "[SUCCESS] Git is now accessible!" -ForegroundColor Green
    Write-Host "[INFO] Version: $version" -ForegroundColor Cyan
    Write-Host ""

    # Configure Git
    Write-Host "[INFO] Configuring Git for Windows..." -ForegroundColor Yellow
    try {
        git config --global core.autocrlf true 2>$null
        git config --global core.longpaths true 2>$null
        Write-Host "[OK] Git configured successfully" -ForegroundColor Green
    } catch {
        Write-Host "[WARN] Could not configure Git: $_" -ForegroundColor Yellow
    }

    # Add to user PATH permanently
    Write-Host ""
    Write-Host "[INFO] Would you like to add Git to your user PATH permanently?" -ForegroundColor Yellow
    Write-Host "[INFO] This will make Git available in all future PowerShell sessions." -ForegroundColor Cyan
    $response = Read-Host "Add to permanent PATH? (y/n)"

    if ($response -eq 'y' -or $response -eq 'Y') {
        try {
            $currentUserPath = [Environment]::GetEnvironmentVariable("Path", "User")

            foreach ($path in $pathsToAdd) {
                if ($currentUserPath -notlike "*$path*") {
                    $currentUserPath = "$currentUserPath;$path"
                }
            }

            [Environment]::SetEnvironmentVariable("Path", $currentUserPath, "User")
            Write-Host "[OK] Git added to permanent user PATH" -ForegroundColor Green
            Write-Host "[INFO] Restart your terminal for changes to take effect in new sessions" -ForegroundColor Cyan
        } catch {
            Write-Host "[ERROR] Failed to update permanent PATH: $_" -ForegroundColor Red
        }
    } else {
        Write-Host "[INFO] Skipped permanent PATH update" -ForegroundColor Gray
        Write-Host "[WARN] Git will only be available in this session" -ForegroundColor Yellow
    }

    Write-Host ""
    Write-Host "[SUCCESS] Git is ready to use!" -ForegroundColor Green
    Write-Host "[INFO] You can now continue with the installation" -ForegroundColor Cyan
    exit 0

} else {
    Write-Host "[ERROR] Git command still not accessible after adding paths" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting steps:" -ForegroundColor Yellow
    Write-Host "1. Close and reopen your terminal" -ForegroundColor White
    Write-Host "2. Run this script again" -ForegroundColor White
    Write-Host "3. If still not working, reinstall Git: choco uninstall git -y && choco install git -y" -ForegroundColor White
    Write-Host "4. Restart your computer as a last resort" -ForegroundColor White
    exit 1
}
