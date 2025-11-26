# Simple PowerShell Script to Create Admin User
# This script will help you create an admin user

Write-Host "=== Create Admin User for SmartWork ===" -ForegroundColor Cyan
Write-Host ""

# Method 1: Register via API then update in database
Write-Host "Method 1: Register user then update role in database" -ForegroundColor Yellow
Write-Host ""

$API_BASE_URL = "http://localhost:5000/api"

# Check if backend is running
try {
    $response = Invoke-WebRequest -Uri "$API_BASE_URL/auth/test" -Method GET -ErrorAction SilentlyContinue
} catch {
    Write-Host "⚠ Backend API is not running or not accessible at $API_BASE_URL" -ForegroundColor Yellow
    Write-Host "Please start the backend first: cd TaskManagement.API && dotnet run" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "Step 1: Register a new user via frontend or API" -ForegroundColor Green
Write-Host "  - Go to: http://localhost:8000" -ForegroundColor White
Write-Host "  - Click 'Sign Up'" -ForegroundColor White
Write-Host "  - Email: admin@smartwork.com" -ForegroundColor White
Write-Host "  - Password: Admin123!" -ForegroundColor White
Write-Host "  - Full Name: Admin User" -ForegroundColor White
Write-Host ""

Write-Host "Step 2: Update the user role to Admin in database" -ForegroundColor Green
Write-Host "  Run this SQL command in SQL Server Management Studio:" -ForegroundColor White
Write-Host ""
Write-Host "  USE TaskManagementDB;" -ForegroundColor Cyan
Write-Host "  GO" -ForegroundColor Cyan
Write-Host "  UPDATE Users SET Role = 'Admin' WHERE Email = 'admin@smartwork.com';" -ForegroundColor Cyan
Write-Host "  GO" -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 3: Logout and login again with admin account" -ForegroundColor Green
Write-Host "  - The Admin menu will appear in the navbar" -ForegroundColor White
Write-Host ""

Write-Host "=== Alternative: Direct SQL Insert ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "If you want to create admin user directly in database:" -ForegroundColor Yellow
Write-Host "1. Generate BCrypt hash for password 'Admin123!'" -ForegroundColor White
Write-Host "2. Use the create-admin-user.sql script" -ForegroundColor White
Write-Host "3. Replace the PasswordHash placeholder with the generated hash" -ForegroundColor White
Write-Host ""

Write-Host "To generate BCrypt hash, you can:" -ForegroundColor Yellow
Write-Host "  - Use online BCrypt generator: https://bcrypt-generator.com/" -ForegroundColor White
Write-Host "  - Use .NET code: BCrypt.Net.BCrypt.HashPassword('Admin123!', 11)" -ForegroundColor White
Write-Host ""

Write-Host "=== Quick SQL Command ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "If user already exists, just run:" -ForegroundColor Yellow
Write-Host "  UPDATE Users SET Role = 'Admin' WHERE Email = 'admin@smartwork.com';" -ForegroundColor Green
Write-Host ""

