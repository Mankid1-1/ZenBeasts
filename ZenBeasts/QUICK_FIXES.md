# ZenBeasts Installation - Quick Fixes

**Common issues and instant solutions**

---

## 🔥 Issue: .NET Framework Installation Keeps Retrying

### Symptoms
```
The registry key for .Net 4.8 was not found or this is forced
WARNING: A reboot is required.
WARNING: Try #1 of .NET framework install failed with exit code '16389'. Trying again.
```

### Quick Fix (Choose One)

#### Option 1: Reboot and Resume (Recommended)
```powershell
# 1. Press Ctrl+C to stop current installation
# 2. Reboot your computer
# 3. After reboot, run:
.\install.ps1 -Resume
```

#### Option 2: Skip .NET Framework
```powershell
# 1. Press Ctrl+C to stop current installation
# 2. Install Chocolatey manually without .NET:
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
$env:chocolateyIgnoreDependencies = 'true'
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# 3. Continue installation:
.\install.ps1 -Mode full -SkipInstalled
```

#### Option 3: Force Continue
```powershell
# Continue despite errors
.\install.ps1 -Mode full -Force
```

---

## 🔄 Issue: Installation Stuck or Taking Too Long

### Quick Fix
```powershell
# 1. Open a new PowerShell window (keep old one open)
# 2. Check what's running:
Get-Process | Where-Object {$_.ProcessName -match "choco|cargo|npm|python"}

# 3. If Chocolatey is stuck on .NET, close it:
# Press Ctrl+C in the installer window

# 4. Resume with force flag:
.\install.ps1 -Resume -Force
```

---

## ⚠️ Issue: "A reboot is required"

### Quick Fix
```powershell
# Option 1: Reboot now
Restart-Computer

# After reboot:
.\install.ps1 -Resume

# Option 2: Continue without reboot (may have issues)
.\install.ps1 -Mode full -Force -Silent
```

---

## 🚫 Issue: "Cannot run scripts" or "Execution Policy"

### Quick Fix
```powershell
# Run as Administrator:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Or bypass for single run:
PowerShell -ExecutionPolicy Bypass -File .\install.ps1
```

---

## 💥 Issue: Installation Failed Midway

### Quick Fix
```powershell
# Resume from where it failed:
.\install.ps1 -Resume

# Or start fresh with skip installed:
.\install.ps1 -Mode full -SkipInstalled

# Or force through errors:
.\install.ps1 -Mode full -Force
```

---

## 🔍 Issue: Command Not Found After Install

### Quick Fix
```powershell
# Refresh PATH in current session:
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Verify:
git --version
node --version
python --version
cargo --version
solana --version

# If still not found, restart PowerShell
```

---

## 📦 Issue: Chocolatey Install Fails

### Quick Fix
```powershell
# Manual Chocolatey installation:
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Verify:
choco --version

# Continue installation:
.\install.ps1 -Mode full -SkipInstalled
```

---

## 🌐 Issue: Network Timeout / Download Fails

### Quick Fix
```powershell
# The installer auto-retries 3 times
# To increase retries, the installer handles this automatically

# If still failing, check internet:
Test-Connection 8.8.8.8 -Count 4

# Try with verbose logging to see what's failing:
.\install.ps1 -Mode full -LogLevel Verbose
```

---

## 🐌 Issue: Anchor Installation Taking Forever

### What's Normal
- Anchor compiles from source
- Takes 10-20 minutes on first install
- No output during compilation is NORMAL
- Don't cancel it!

### Quick Check
```powershell
# In another PowerShell window, check if cargo is running:
Get-Process cargo

# If running, wait patiently
# If not running and installer is stuck, Ctrl+C and retry:
.\install.ps1 -Resume
```

---

## 🔧 Issue: Need to Start Over

### Quick Fix
```powershell
# Remove state file to start fresh:
Remove-Item setup\.install-state.json -Force

# Clear logs:
Remove-Item setup\install.log -Force

# Start fresh:
.\install.ps1 -Mode full
```

---

## 📝 Issue: Need to See What Happened

### Quick Fix
```powershell
# Check logs:
cat setup\install.log

# See only errors:
Select-String -Path setup\install.log -Pattern "ERROR"

# Verbose mode for next run:
.\install.ps1 -Mode full -LogLevel Verbose
```

---

## ⚡ Ultra Quick Start (Skip Issues)

```powershell
# If you just want it to work, try this sequence:

# 1. Close all other programs
# 2. Run as Administrator
# 3. Use these commands:

Set-ExecutionPolicy Bypass -Scope Process -Force
.\install.ps1 -Mode full -Silent -Force

# Wait patiently (30-45 minutes)
# If it asks to reboot, do it and run:
.\install.ps1 -Resume
```

---

## 🎯 Most Common Solution

**90% of issues are solved by:**

```powershell
# 1. Restart PowerShell as Administrator
# 2. Run this:
.\install.ps1 -Mode full -SkipInstalled -Force

# 3. If it asks to reboot, reboot and run:
.\install.ps1 -Resume
```

---

## 📞 Still Stuck?

1. **Check logs:** `cat setup\install.log | Select-String "ERROR"`
2. **Test menu:** `.\test-installer.ps1`
3. **Run verification:** `.\install.ps1 -Verify`
4. **Read full guide:** `.\TROUBLESHOOTING_INSTALL.md`

---

## 🎓 Pro Tips

**Avoid Issues:**
- ✅ Run as Administrator
- ✅ Close other programs
- ✅ Stable internet connection
- ✅ At least 20GB free space
- ✅ Be patient (full install takes 30-45 min)

**Speed Up Install:**
- Use `-SkipInstalled` if retrying
- Use `-Silent` to skip prompts
- Reboot when asked to reboot
- Don't cancel Anchor compilation

**Debug Issues:**
- Use `-LogLevel Verbose` to see details
- Check `setup\install.log` for errors
- Use `-DryRun` to preview changes
- Use `-Verify` to check what's installed

---

**Quick Reference Card:**

```
Issue                  | Command
-----------------------|----------------------------------------
Reboot Required        | Restart, then: .\install.ps1 -Resume
.NET Framework Stuck   | Ctrl+C, then: .\install.ps1 -Force
Installation Failed    | .\install.ps1 -Resume
Command Not Found      | Restart PowerShell
Start Fresh            | .\install.ps1 -Mode full -SkipInstalled
See Errors            | cat setup\install.log
Be Patient            | Coffee break (Anchor takes 15 min)
Ultimate Fix          | Reboot + .\install.ps1 -Resume
```

---

**Remember:** The installer has automatic retry logic. Most issues resolve themselves!

Just be patient and let it work. ☕