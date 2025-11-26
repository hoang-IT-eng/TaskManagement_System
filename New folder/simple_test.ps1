$baseUrl = "http://localhost:5000"
Write-Host "`n=== TASK MANAGEMENT API TEST SUITE ===" -ForegroundColor Cyan
Write-Host "Testing API at: $baseUrl`n" -ForegroundColor Gray

# Generate random email
$testEmail = "test$(Get-Random -Minimum 10000 -Maximum 99999)@example.com"

# Test 1: Register
Write-Host "[1/5] Testing REGISTER..." -ForegroundColor Yellow
try {
    $registerResponse = Invoke-WebRequest -Uri "$baseUrl/api/auth/register" -Method POST -ContentType "application/json" -Body "{`"email`":`"$testEmail`",`"password`":`"password123`",`"fullName`":`"Test User`",`"phoneNumber`":`"+84901234567`"}"
    $registerData = $registerResponse.Content | ConvertFrom-Json
    Write-Host "   SUCCESS - User registered!" -ForegroundColor Green
    Write-Host "   Email: $testEmail" -ForegroundColor Gray
    Write-Host "   User ID: $($registerData.data.user.userId)" -ForegroundColor Gray
} catch {
    Write-Host "   FAILED - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: Login
Write-Host "`n[2/5] Testing LOGIN..." -ForegroundColor Yellow
try {
    $loginResponse = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method POST -ContentType "application/json" -Body "{`"email`":`"$testEmail`",`"password`":`"password123`"}"
    $loginData = $loginResponse.Content | ConvertFrom-Json
    $token = $loginData.data.token
    Write-Host "   SUCCESS - Login successful!" -ForegroundColor Green
    Write-Host "   Token: $($token.Substring(0,30))..." -ForegroundColor Gray
} catch {
    Write-Host "   FAILED - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 3: Get Profile
Write-Host "`n[3/5] Testing GET PROFILE..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $token"
    }
    $profileResponse = Invoke-WebRequest -Uri "$baseUrl/api/user/profile" -Method GET -Headers $headers
    $profileData = $profileResponse.Content | ConvertFrom-Json
    Write-Host "   SUCCESS - Profile retrieved!" -ForegroundColor Green
    Write-Host "   Name: $($profileData.data.fullName)" -ForegroundColor Gray
    Write-Host "   Email: $($profileData.data.email)" -ForegroundColor Gray
    Write-Host "   Role: $($profileData.data.role)" -ForegroundColor Gray
} catch {
    Write-Host "   FAILED - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 4: Update Profile
Write-Host "`n[4/5] Testing UPDATE PROFILE..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    $updateBody = "{`"fullName`":`"Test User Updated`",`"bio`":`"Software Developer`",`"phoneNumber`":`"+84987654321`"}"
    $updateResponse = Invoke-WebRequest -Uri "$baseUrl/api/user/profile" -Method PUT -Headers $headers -Body $updateBody
    $updateData = $updateResponse.Content | ConvertFrom-Json
    Write-Host "   SUCCESS - Profile updated!" -ForegroundColor Green
    Write-Host "   New Name: $($updateData.data.fullName)" -ForegroundColor Gray
    Write-Host "   New Bio: $($updateData.data.bio)" -ForegroundColor Gray
} catch {
    Write-Host "   FAILED - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 5: Change Password
Write-Host "`n[5/5] Testing CHANGE PASSWORD..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    $passwordBody = "{`"currentPassword`":`"password123`",`"newPassword`":`"newpassword456`"}"
    $passwordResponse = Invoke-WebRequest -Uri "$baseUrl/api/user/change-password" -Method POST -Headers $headers -Body $passwordBody
    $passwordData = $passwordResponse.Content | ConvertFrom-Json
    Write-Host "   SUCCESS - Password changed!" -ForegroundColor Green
} catch {
    Write-Host "   FAILED - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Summary
Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host "ALL TESTS PASSED! (5/5)" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "`nTest Summary:" -ForegroundColor White
Write-Host "  Register:        PASS" -ForegroundColor Green
Write-Host "  Login:           PASS" -ForegroundColor Green
Write-Host "  Get Profile:     PASS" -ForegroundColor Green
Write-Host "  Update Profile:  PASS" -ForegroundColor Green
Write-Host "  Change Password: PASS" -ForegroundColor Green

