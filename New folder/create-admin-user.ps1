# PowerShell Script to Create Admin User
# This script will create an admin user via API

$API_BASE_URL = "http://localhost:5000/api"

Write-Host "=== Creating Admin User ===" -ForegroundColor Cyan

# Step 1: Register a new user
Write-Host "`nStep 1: Registering new user..." -ForegroundColor Yellow

$registerData = @{
    email = "admin@smartwork.com"
    password = "Admin123!"
    fullName = "Admin User"
    phoneNumber = ""
} | ConvertTo-Json

try {
    $registerResponse = Invoke-RestMethod -Uri "$API_BASE_URL/auth/register" `
        -Method POST `
        -ContentType "application/json" `
        -Body $registerData
    
    Write-Host "✓ User registered successfully!" -ForegroundColor Green
    $token = $registerResponse.data.token
    $userId = $registerResponse.data.user.userId
    
    Write-Host "User ID: $userId" -ForegroundColor Gray
    Write-Host "Token: $token" -ForegroundColor Gray
    
    # Step 2: Update user role to Admin
    Write-Host "`nStep 2: Updating user role to Admin..." -ForegroundColor Yellow
    
    # Note: This requires admin access, so we need to update directly in database
    Write-Host "⚠ Note: Updating role requires admin access." -ForegroundColor Yellow
    Write-Host "Please run the SQL script (create-admin-user.sql) to set the role to Admin." -ForegroundColor Yellow
    Write-Host "`nOr manually update in database:" -ForegroundColor Yellow
    Write-Host "UPDATE Users SET Role = 'Admin' WHERE Email = 'admin@smartwork.com'" -ForegroundColor Cyan
    
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
        if ($errorResponse.message -like "*already exists*") {
            Write-Host "⚠ User already exists!" -ForegroundColor Yellow
            Write-Host "Please update the role manually in database:" -ForegroundColor Yellow
            Write-Host "UPDATE Users SET Role = 'Admin' WHERE Email = 'admin@smartwork.com'" -ForegroundColor Cyan
        } else {
            Write-Host "✗ Error: $($errorResponse.message)" -ForegroundColor Red
        }
    } else {
        Write-Host "✗ Error: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "Make sure the backend API is running on http://localhost:5000" -ForegroundColor Yellow
    }
}

Write-Host "`n=== Done ===" -ForegroundColor Cyan
Write-Host "`nLogin credentials:" -ForegroundColor Green
Write-Host "Email: admin@smartwork.com" -ForegroundColor White
Write-Host "Password: Admin123!" -ForegroundColor White

