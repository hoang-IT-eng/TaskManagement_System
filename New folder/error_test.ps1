$baseUrl = "http://localhost:5000"
Write-Host "`n=== ERROR HANDLING TEST SUITE ===" -ForegroundColor Cyan
Write-Host "Testing error scenarios...`n" -ForegroundColor Gray

$passedTests = 0
$totalTests = 5

# Test 1: Register with duplicate email
Write-Host "[1/5] Testing DUPLICATE EMAIL..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/auth/register" -Method POST -ContentType "application/json" -Body "{`"email`":`"test12345@example.com`",`"password`":`"password123`",`"fullName`":`"Test`",`"phoneNumber`":`"+84901234567`"}"
    Write-Host "   FAILED - Should have returned error" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "   SUCCESS - Correctly rejected duplicate email (400)" -ForegroundColor Green
        $passedTests++
    } else {
        Write-Host "   FAILED - Wrong status code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}

# Test 2: Login with wrong password
Write-Host "`n[2/5] Testing WRONG PASSWORD..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method POST -ContentType "application/json" -Body "{`"email`":`"test12345@example.com`",`"password`":`"wrongpassword`"}"
    Write-Host "   FAILED - Should have returned error" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "   SUCCESS - Correctly rejected wrong password (400)" -ForegroundColor Green
        $passedTests++
    } else {
        Write-Host "   FAILED - Wrong status code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}

# Test 3: Access protected endpoint without token
Write-Host "`n[3/5] Testing NO TOKEN..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/user/profile" -Method GET
    Write-Host "   FAILED - Should have returned error" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "   SUCCESS - Correctly rejected no token (401 Unauthorized)" -ForegroundColor Green
        $passedTests++
    } else {
        Write-Host "   FAILED - Wrong status code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}

# Test 4: Invalid email format
Write-Host "`n[4/5] Testing INVALID EMAIL FORMAT..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/auth/register" -Method POST -ContentType "application/json" -Body "{`"email`":`"notanemail`",`"password`":`"password123`",`"fullName`":`"Test`",`"phoneNumber`":`"+84901234567`"}"
    Write-Host "   FAILED - Should have returned validation error" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "   SUCCESS - Correctly rejected invalid email (400)" -ForegroundColor Green
        $passedTests++
    } else {
        Write-Host "   FAILED - Wrong status code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}

# Test 5: Change password with wrong current password
Write-Host "`n[5/5] Testing WRONG CURRENT PASSWORD..." -ForegroundColor Yellow
# First login to get a valid token
try {
    $loginResponse = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method POST -ContentType "application/json" -Body "{`"email`":`"test12345@example.com`",`"password`":`"password123`"}"
    $loginData = $loginResponse.Content | ConvertFrom-Json
    $token = $loginData.data.token
    
    # Try to change password with wrong current password
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    $response = Invoke-WebRequest -Uri "$baseUrl/api/user/change-password" -Method POST -Headers $headers -Body "{`"currentPassword`":`"wrongpassword`",`"newPassword`":`"newpass123`"}"
    Write-Host "   FAILED - Should have returned error" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "   SUCCESS - Correctly rejected wrong current password (400)" -ForegroundColor Green
        $passedTests++
    } else {
        Write-Host "   FAILED - Wrong status code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}

# Summary
Write-Host "`n======================================" -ForegroundColor Cyan
if ($passedTests -eq $totalTests) {
    Write-Host "ALL ERROR TESTS PASSED! ($passedTests/$totalTests)" -ForegroundColor Green
} else {
    Write-Host "SOME TESTS FAILED ($passedTests/$totalTests)" -ForegroundColor Yellow
}
Write-Host "======================================" -ForegroundColor Cyan

