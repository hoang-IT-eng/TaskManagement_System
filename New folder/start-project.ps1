# Script to start both Backend and Frontend
# Usage: .\start-project.ps1

Write-Host "`n================================================================" -ForegroundColor Cyan
Write-Host "    STARTING TASK MANAGEMENT PROJECT" -ForegroundColor Green
Write-Host "================================================================`n" -ForegroundColor Cyan

# Check if .NET is installed
Write-Host "[1] Checking .NET SDK..." -ForegroundColor Yellow
try {
    $dotnetVersion = dotnet --version
    Write-Host "   .NET SDK Version: $dotnetVersion" -ForegroundColor Green
} catch {
    Write-Host "   ERROR: .NET SDK not found!" -ForegroundColor Red
    Write-Host "   Please install .NET SDK 10.0 or later" -ForegroundColor Red
    exit 1
}

# Check if Python is installed
Write-Host "`n[2] Checking Python..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version
    Write-Host "   Python Version: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "   WARNING: Python not found!" -ForegroundColor Yellow
    Write-Host "   You can use Live Server extension in VS Code instead" -ForegroundColor Yellow
}

# Start Backend
Write-Host "`n[3] Starting Backend (ASP.NET Core API)..." -ForegroundColor Yellow
Write-Host "   Port: 5000" -ForegroundColor Cyan
Write-Host "   URL: http://localhost:5000" -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\TaskManagement.API'; Write-Host 'Starting Backend...' -ForegroundColor Green; dotnet run"

# Wait for backend to start
Write-Host "   Waiting for backend to start..." -ForegroundColor Gray
Start-Sleep -Seconds 5

# Start Frontend
Write-Host "`n[4] Starting Frontend (Vanilla JS)..." -ForegroundColor Yellow
Write-Host "   Port: 8000" -ForegroundColor Cyan
Write-Host "   URL: http://localhost:8000" -ForegroundColor Cyan

if (Get-Command python -ErrorAction SilentlyContinue) {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\vanilla-frontend'; Write-Host 'Starting Frontend...' -ForegroundColor Green; python -m http.server 8000"
} else {
    Write-Host "   Please start frontend manually:" -ForegroundColor Yellow
    Write-Host "   cd vanilla-frontend" -ForegroundColor White
    Write-Host "   python -m http.server 8000" -ForegroundColor White
    Write-Host "   Or use Live Server extension in VS Code" -ForegroundColor White
}

Write-Host "`n================================================================" -ForegroundColor Cyan
Write-Host "    PROJECT STARTED!" -ForegroundColor Green
Write-Host "================================================================`n" -ForegroundColor Cyan

Write-Host "Backend:  http://localhost:5000" -ForegroundColor Green
Write-Host "Frontend: http://localhost:8000" -ForegroundColor Green
Write-Host "Swagger:  http://localhost:5000/swagger`n" -ForegroundColor Green

Write-Host "Press any key to exit this window..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

