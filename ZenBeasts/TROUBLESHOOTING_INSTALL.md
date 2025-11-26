# Installation Troubleshooting Guide

Quick fixes for common installation issues with ZenBeasts automated setup.

---

## 🔍 Menu Selection Issues

### Problem: "Invalid option selected" Error

**Symptoms:**
- You enter a number (1-6) but get "Invalid option selected"
- Menu keeps rejecting your input

**Solutions:**

1. **Run the test script first:**
   ```powershell
   .\test-installer.ps1
   ```
   This will show you exactly what's being captured and help debug the issue.

2. **Check your input:**
   - Enter ONLY the number (e.g., `1`)
   - Don't add any extra text or spaces
   - Press Enter once

3. **Character encoding issue:**
   ```powershell
   # Set console to UTF-8
   [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
   [Console]::InputEncoding = [System.Text.Encoding]::UTF8
   
   # Then run installer again
   .\install.ps1
   ```

4. **Run with explicit mode:**
   ```powershell
   # Skip the menu entirely
   .\install.ps1 -Mode full        # For full stack
   .\install.ps1 -Mode solana      # For Solana only
   .\install.ps1 -Mode bot-hub     # For Bot Hub only
   .\install.ps1 -Mode frontend    # For Frontend only
   ```

---

## 🔐 PowerShell Execution Policy

### Problem: Script Won't Run

**Error Message:**
```
cannot be loaded because running scripts is disabled on this system
```

**Solution:**
```powershell
# Run PowerShell as Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Then try again
.\install.ps1
```

**Alternative:**
```powershell
# Run once without changing policy
PowerShell -ExecutionPolicy Bypass -File .\install.ps1
```

---

## 🛠️ Administrator Privileges

### Problem: Installation Fails Due to Permissions

**Solution:**
1. Right-click PowerShell
2. Select "Run as Administrator"
3. Navigate to project: `cd C:\Users\babylove23\ZenBeasts`
4. Run installer: `.\install.ps1`

**Alternative:**
```powershell
# Start elevated PowerShell from current directory
Start-Process powershell -Verb RunAs -ArgumentList "-NoExit", "-Command", "cd '$PWD'"
```

---

## 📦 Chocolatey Installation Fails

### Problem: Choco Won't Install

**Solution:**
```powershell
# Manual Chocolatey installation
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Refresh PATH
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Verify
choco --version
```

---

## 🦀 Rust Installation Issues

### Problem: Rust Won't Install or Not Found

**Solutions:**

1. **Manual Rust installation:**
   ```powershell
   # Download rustup
   Invoke-WebRequest -Uri "https://win.rustup.rs/x86_64" -OutFile "$env:TEMP\rustup-init.exe"
   
   # Run installer
   & "$env:TEMP\rustup-init.exe" -y
   
   # Add to PATH for current session
   $env:Path += ";$env:USERPROFILE\.cargo\bin"
   ```

2. **Rust installed but not found:**
   ```powershell
   # Add Rust to PATH
   $env:Path += ";$env:USERPROFILE\.cargo\bin"
   
   # Verify
   rustc --version
   cargo --version
   ```

3. **Make permanent:**
   ```powershell
   # Add to user PATH permanently
   $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
   $newPath = "$currentPath;$env:USERPROFILE\.cargo\bin"
   [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
   
   # Restart PowerShell
   ```

---

## ⛓️ Solana CLI Issues

### Problem: Solana Not Found After Installation

**Solution:**
```powershell
# Add Solana to PATH
$solanaPath = "$env:USERPROFILE\.local\share\solana\install\active_release\bin"
$env:Path += ";$solanaPath"

# Make permanent
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
$newPath = "$currentPath;$solanaPath"
[Environment]::SetEnvironmentVariable("Path", $newPath, "User")

# Verify
solana --version
```

### Problem: Solana Version Mismatch

**Solution:**
```powershell
# Update to specific version
solana-install init 1.17.16

# Or update to latest
solana-install update
```

---

## ⚓ Anchor Installation Fails

### Problem: Anchor Build/Install Fails

**Solutions:**

1. **Update Rust first:**
   ```powershell
   rustup update stable
   ```

2. **Install/Update Anchor:**
   ```powershell
   cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked --force
   ```

3. **Check dependencies:**
   ```powershell
   # Install build tools
   choco install visualstudio2022buildtools -y
   choco install visualstudio2022-workload-vctools -y
   ```

4. **Use Anchor Version Manager (avm):**
   ```powershell
   cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
   avm install latest
   avm use latest
   ```

---

## 🐍 Python Issues

### Problem: Python Not Found

**Solution:**
```powershell
# Install Python via Chocolatey
choco install python310 -y

# Refresh PATH
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Verify
python --version
pip --version
```

### Problem: Virtual Environment Won't Activate

**Solution:**
```powershell
# For Bot Hub
cd bot-hub

# Try different activation methods
.\venv\Scripts\Activate.ps1

# If that fails
.\venv\Scripts\activate.bat

# If still fails, set execution policy
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process

# Then try again
.\venv\Scripts\Activate.ps1
```

---

## 📦 Node.js Issues

### Problem: Node/npm Not Found

**Solution:**
```powershell
# Install Node.js via Chocolatey
choco install nodejs-lts -y

# Refresh PATH
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Verify
node --version
npm --version
```

### Problem: npm Install Fails

**Solution:**
```powershell
# Clear npm cache
npm cache clean --force

# Update npm
npm install -g npm@latest

# Try install again
cd frontend
npm install
```

---

## 🐳 Docker Issues

### Problem: Docker Won't Start

**Solutions:**

1. **Check Docker is running:**
   ```powershell
   docker --version
   docker ps
   ```

2. **Start Docker Desktop manually**

3. **Restart Docker:**
   - Right-click Docker Desktop in system tray
   - Select "Restart"

4. **Check WSL 2:**
   ```powershell
   wsl --status
   wsl --update
   ```

---

## 🌐 Network/Download Issues

### Problem: Downloads Fail or Timeout

**Solutions:**

1. **Check internet connection:**
   ```powershell
   Test-Connection -ComputerName 8.8.8.8 -Count 4
   ```

2. **Use different DNS:**
   ```powershell
   # Set DNS to Google
   # Control Panel > Network > Adapter Settings > Properties > IPv4 > DNS
   # Primary: 8.8.8.8
   # Secondary: 8.8.4.4
   ```

3. **Disable VPN/Proxy temporarily**

4. **Try different time/network**

---

## 📝 Configuration Issues

### Problem: .env Files Not Created

**Solution:**
```powershell
# Manually create from templates
cp .env.template .env
cp bot-hub\.env.template bot-hub\.env
cp frontend\.env.template frontend\.env.local

# Or run setup
.\setup\config-wizard.ps1
```

### Problem: Configuration Wizard Fails

**Solution:**
```powershell
# Manual configuration
# Edit files directly:
notepad .env
notepad bot-hub\.env
notepad frontend\.env.local
```

---

## 🔍 Verification Fails

### Problem: verify-setup.ps1 Shows Errors

**Solutions:**

1. **Check which component failed:**
   ```powershell
   .\setup\verify-setup.ps1
   # Note which components show [X]
   ```

2. **Install missing components:**
   ```powershell
   # For specific component
   .\setup\install-solana.ps1      # If Solana failed
   .\setup\install-bot-hub.ps1     # If Bot Hub failed
   .\setup\install-frontend.ps1    # If Frontend failed
   ```

3. **Check PATH:**
   ```powershell
   $env:Path -split ';'
   # Should include paths to installed tools
   ```

---

## 🔄 PATH Not Updating

### Problem: Commands Not Found After Install

**Solutions:**

1. **Restart PowerShell** (simplest)

2. **Refresh PATH in current session:**
   ```powershell
   $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
   ```

3. **Add paths manually:**
   ```powershell
   # Rust
   $env:Path += ";$env:USERPROFILE\.cargo\bin"
   
   # Solana
   $env:Path += ";$env:USERPROFILE\.local\share\solana\install\active_release\bin"
   
   # Node.js (usually automatic)
   $env:Path += ";C:\Program Files\nodejs"
   ```

4. **Make permanent:**
   ```powershell
   # Add to User PATH
   $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
   $newPath = "$currentPath;$env:USERPROFILE\.cargo\bin;$env:USERPROFILE\.local\share\solana\install\active_release\bin"
   [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
   ```

---

## 📋 Check Installation Log

**View detailed logs:**
```powershell
# View log file
cat setup\install.log

# View last 50 lines
Get-Content setup\install.log -Tail 50

# Search for errors
Select-String -Path setup\install.log -Pattern "ERROR"
```

---

## 🧪 Test Individual Components

### Test Solana
```powershell
solana --version
solana config get
anchor --version
```

### Test Python
```powershell
python --version
pip --version
cd bot-hub
python -c "import discord; print('Discord.py OK')"
```

### Test Node.js
```powershell
node --version
npm --version
cd frontend
npm list
```

---

## 🆘 Still Having Issues?

### Debug Script
```powershell
# Run the test installer
.\test-installer.ps1
```

### Collect Debug Info
```powershell
# Create debug report
@"
=== System Info ===
OS: $([System.Environment]::OSVersion.VersionString)
PowerShell: $($PSVersionTable.PSVersion)
User: $env:USERNAME

=== Installed Tools ===
Git: $(git --version 2>&1)
Node: $(node --version 2>&1)
Python: $(python --version 2>&1)
Rust: $(rustc --version 2>&1)
Solana: $(solana --version 2>&1)
Anchor: $(anchor --version 2>&1)

=== PATH ===
$($env:Path -split ';' | Out-String)

=== Recent Log ===
$(Get-Content setup\install.log -Tail 20 -ErrorAction SilentlyContinue | Out-String)
"@ | Out-File debug-report.txt

Write-Host "Debug report saved to: debug-report.txt"
```

### Clean Install
```powershell
# Remove existing installations (CAREFUL!)
# This will uninstall everything

# Uninstall via Chocolatey
choco uninstall nodejs git python rust -y

# Remove directories
Remove-Item -Recurse -Force "$env:USERPROFILE\.cargo" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:USERPROFILE\.local\share\solana" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "bot-hub\venv" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "frontend\node_modules" -ErrorAction SilentlyContinue

# Run installer again
.\install.ps1
```

---

## 📞 Getting Help

1. **Check logs:** `cat setup\install.log`
2. **Run test:** `.\test-installer.ps1`
3. **Create debug report:** See "Collect Debug Info" above
4. **Search documentation:**
   - [INSTALLATION_GUIDE.md](./INSTALLATION_GUIDE.md)
   - [QUICK_START.md](./QUICK_START.md)
   - [AUTOMATED_SETUP.md](./AUTOMATED_SETUP.md)

---

## ✅ Quick Fixes Checklist

- [ ] Run PowerShell as Administrator
- [ ] Set execution policy: `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`
- [ ] Restart PowerShell after installations
- [ ] Refresh PATH: `$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")`
- [ ] Check internet connection
- [ ] Disable antivirus temporarily
- [ ] Run test script: `.\test-installer.ps1`
- [ ] Check logs: `cat setup\install.log`
- [ ] Run verification: `.\setup\verify-setup.ps1`
- [ ] Try component-specific installer
- [ ] Use explicit mode: `.\install.ps1 -Mode full`

---

**Most Common Solution:** Restart PowerShell and refresh PATH!