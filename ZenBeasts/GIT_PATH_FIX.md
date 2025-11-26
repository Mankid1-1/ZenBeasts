# Git PATH Issue - Quick Fix Guide

**Last Updated:** 2024
**Issue:** Git installed successfully but command not available in terminal

---

## 🔍 Problem Description

You're seeing this error:
```
[ERROR] Failed to install Git: Git command not available after installation. Try restarting your terminal.
```

**What's happening:**
- Git was installed successfully by Chocolatey
- The installation added Git to the system PATH
- However, your current PowerShell session hasn't picked up the PATH changes
- This is a Windows environment variable caching issue

---

## ✅ Quick Solutions (Choose One)

### Solution 1: Run the Fix Script (RECOMMENDED)

We've created an automated fix script:

```powershell
.\fix-git-path.ps1
```

This script will:
1. Find your Git installation
2. Add Git to your current session PATH
3. Test if Git is accessible
4. Optionally add Git to your permanent PATH
5. Continue with the installation

**After running the fix script:**
```powershell
# Resume the installation
.\install.ps1 -Resume
```

---

### Solution 2: Restart Terminal (EASIEST)

1. **Close** your current PowerShell window completely
2. **Open a new** PowerShell window as Administrator
3. Navigate back to the ZenBeasts directory:
   ```powershell
   cd C:\Users\babylove23\ZenBeasts
   ```
4. Resume the installation:
   ```powershell
   .\install.ps1 -Resume
   ```

The `-Resume` flag will:
- Skip already installed components (like Git)
- Continue from where it left off
- Complete the remaining installations

---

### Solution 3: Manual PATH Fix (ADVANCED)

If the above don't work, manually add Git to your PATH:

```powershell
# Add Git to current session
$env:Path += ";C:\Program Files\Git\cmd"
$env:Path += ";C:\Program Files\Git\bin"

# Verify Git is accessible
git --version

# Continue installation
.\install.ps1 -Resume
```

To make it permanent:
```powershell
# Add to user PATH permanently
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
$userPath += ";C:\Program Files\Git\cmd;C:\Program Files\Git\bin"
[Environment]::SetEnvironmentVariable("Path", $userPath, "User")
```

---

### Solution 4: Fresh Installation (NUCLEAR OPTION)

If nothing else works:

```powershell
# Uninstall Git
choco uninstall git -y

# Close PowerShell completely

# Open new PowerShell as Administrator

# Reinstall Git
choco install git -y

# Close PowerShell again

# Open new PowerShell as Administrator

# Verify Git works
git --version

# Run ZenBeasts installation
cd C:\Users\babylove23\ZenBeasts
.\install.ps1 -mode full
```

---

## 🔍 Verify Git Installation

Run these commands to check if Git is properly installed:

```powershell
# Check if Git command exists
Get-Command git

# Check Git version
git --version

# Check Git installation location
where.exe git

# Check current PATH (look for Git entries)
$env:Path -split ';' | Select-String -Pattern 'git'
```

**Expected output:**
```
CommandType     Name      Version    Source
-----------     ----      -------    ------
Application     git.exe   2.51.2.0   C:\Program Files\Git\cmd\git.exe

git version 2.51.2.windows.1
```

---

## 🛠️ Why This Happens

1. **Chocolatey installs Git** → Files placed in `C:\Program Files\Git\`
2. **Chocolatey updates system PATH** → Registry is modified
3. **Current PowerShell session** → Still using old PATH from when it started
4. **PATH refresh needed** → Session must reload environment variables

Windows doesn't automatically refresh environment variables in running processes. You need to either:
- Restart the terminal (new process = new environment)
- Manually refresh the PATH in the current session
- Use our fix script to automate the refresh

---

## 📋 Technical Details

### Git Installation Locations
Git is typically installed at:
```
C:\Program Files\Git\
├── cmd\          <- git.exe lives here
├── bin\          <- Additional Git tools
└── mingw64\bin\  <- Git dependencies
```

### PATH Variables
Windows has multiple PATH scopes:
- **System PATH** (Machine level) - `HKLM\SYSTEM\...\Environment`
- **User PATH** (User level) - `HKCU\Environment`
- **Process PATH** (Current session) - `$env:Path`

Chocolatey adds Git to System PATH, but your current PowerShell session only sees the Process PATH from when it started.

---

## 🔧 Our Fix (What We Improved)

We've updated `install.ps1` with better PATH handling:

1. **Multiple PATH refresh attempts** - Tries 5 times with delays
2. **Direct registry reading** - Bypasses environment variable cache
3. **Common path scanning** - Searches known Git locations
4. **Special Git detection** - Checks if executable exists on disk
5. **Session PATH injection** - Manually adds Git paths
6. **Resume capability** - Can continue after terminal restart

**New functions added:**
- `Test-GitInstalled` - Checks if Git files exist
- Enhanced `Update-SessionPath` - Reads directly from registry
- Enhanced `Test-CommandExists` - Searches common locations
- Better retry logic in `Install-Tool` - Multiple attempts with waiting

---

## 📞 Still Having Issues?

If Git installation continues to fail:

1. **Check Windows version:**
   ```powershell
   [System.Environment]::OSVersion.Version
   ```
   Minimum: Windows 10 1809 or Windows Server 2019

2. **Check PowerShell version:**
   ```powershell
   $PSVersionTable.PSVersion
   ```
   Minimum: PowerShell 5.1

3. **Check for antivirus interference:**
   - Some antivirus software blocks PATH modifications
   - Temporarily disable and try again

4. **Check permissions:**
   - Ensure you're running PowerShell as Administrator
   - Check if your user has permission to modify environment variables

5. **Check disk space:**
   ```powershell
   Get-PSDrive C | Select-Object Used,Free
   ```
   Need at least 1GB free for Git

6. **Check for conflicts:**
   ```powershell
   # Check if multiple Git installations exist
   Get-ChildItem -Path "C:\Program Files" -Filter "git.exe" -Recurse -ErrorAction SilentlyContinue
   ```

---

## 🚀 Next Steps

Once Git is working:

```powershell
# Option 1: Resume installation
.\install.ps1 -Resume

# Option 2: Start fresh (skips already installed)
.\install.ps1 -mode full -SkipInstalled

# Option 3: Verify everything first
.\install.ps1 -Verify
```

---

## 📚 Related Documentation

- [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md) - Complete installation guide
- [TROUBLESHOOTING_INSTALL.md](TROUBLESHOOTING_INSTALL.md) - General troubleshooting
- [QUICK_START.md](QUICK_START.md) - Quick start guide
- [AUTOMATED_SETUP.md](AUTOMATED_SETUP.md) - Automation details

---

## 💡 Pro Tips

1. **Always run PowerShell as Administrator** for installations
2. **Use Windows Terminal** instead of PowerShell ISE (better environment variable handling)
3. **Keep PowerShell updated** - Run `winget install Microsoft.PowerShell`
4. **Close VS Code/IDEs** before running installers (they cache PATH)
5. **Restart after major installations** if you have time

---

## ✅ Success Checklist

- [ ] Git command works: `git --version`
- [ ] Git is configured: `git config --global --list`
- [ ] PATH includes Git: `$env:Path -split ';' | Select-String git`
- [ ] Can continue installation: `.\install.ps1 -Resume`

---

**Questions? Issues?**

1. Check `setup\install.log` for detailed error messages
2. Run `.\test-installer.ps1` to diagnose issues
3. Review [TROUBLESHOOTING_INSTALL.md](TROUBLESHOOTING_INSTALL.md)

**This issue is NORMAL and EXPECTED on Windows!** Just restart your terminal. 🙂

---

*ZenBeasts Installation System v2.0*