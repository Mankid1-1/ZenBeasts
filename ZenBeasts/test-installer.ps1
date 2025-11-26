# Test script for debugging installer menu
# Run this to test the menu system without actually installing anything

Write-Host "Testing Installation Menu System" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Test the menu choice input
Write-Host "=== Installation Options ===" -ForegroundColor Cyan
Write-Host "1. Full Stack Installation (Recommended)"
Write-Host "2. Solana Development Only"
Write-Host "3. Bot Hub Only"
Write-Host "4. Frontend Only"
Write-Host "5. Custom Installation"
Write-Host "6. Exit"
Write-Host ""

$choice = Read-Host "Select an option (1-6)"

# Trim whitespace
$choice = $choice.Trim()

Write-Host ""
Write-Host "Debug Information:" -ForegroundColor Yellow
Write-Host "  Raw input: [$choice]"
Write-Host "  Type: $($choice.GetType().Name)"
Write-Host "  Length: $($choice.Length)"
Write-Host ""

# Test the switch
switch ($choice) {
    "1" {
        Write-Host "[OK] Full Stack Installation selected" -ForegroundColor Green
    }
    "2" {
        Write-Host "[OK] Solana Development selected" -ForegroundColor Green
    }
    "3" {
        Write-Host "[OK] Bot Hub selected" -ForegroundColor Green
    }
    "4" {
        Write-Host "[OK] Frontend selected" -ForegroundColor Green
    }
    "5" {
        Write-Host "[OK] Custom Installation selected" -ForegroundColor Green
    }
    "6" {
        Write-Host "[OK] Exit selected" -ForegroundColor Green
    }
    default {
        Write-Host "[ERROR] Invalid option: '$choice'" -ForegroundColor Red
        Write-Host "The switch statement did not match your input." -ForegroundColor Red
        Write-Host ""
        Write-Host "Please copy this output and share it for debugging." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Test complete!" -ForegroundColor Cyan
