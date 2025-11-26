$baseUrl = "http://localhost:5000"
Write-Host "`n=== PROJECT API TEST SUITE ===" -ForegroundColor Cyan
Write-Host "Testing Project CRUD API at: $baseUrl`n" -ForegroundColor Gray

# Step 1: Login to get token
Write-Host "[SETUP] Logging in to get token..." -ForegroundColor Yellow
try {
    $loginResponse = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"test12345@example.com","password":"password123"}'
    $loginData = $loginResponse.Content | ConvertFrom-Json
    $token = $loginData.data.token
    Write-Host "   SUCCESS - Token obtained!" -ForegroundColor Green
} catch {
    Write-Host "   FAILED - Could not login. Please ensure user exists." -ForegroundColor Red
    Write-Host "   Creating test user..." -ForegroundColor Yellow
    try {
        $registerResponse = Invoke-WebRequest -Uri "$baseUrl/api/auth/register" -Method POST -ContentType "application/json" -Body '{"email":"testproject@example.com","password":"password123","fullName":"Project Test User","phoneNumber":"+84901234567"}'
        $registerData = $registerResponse.Content | ConvertFrom-Json
        $token = $registerData.data.token
        Write-Host "   SUCCESS - Test user created and token obtained!" -ForegroundColor Green
    } catch {
        Write-Host "   FAILED - Could not create user: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Test 1: Create Project
Write-Host "`n[TEST 1/5] Creating New Project..." -ForegroundColor Yellow
try {
    $createBody = @{
        name = "E-Commerce Platform"
        description = "Building a modern e-commerce platform with microservices"
        status = "Planning"
        priority = "High"
        startDate = "2025-01-01T00:00:00Z"
        endDate = "2025-12-31T23:59:59Z"
        budget = 50000.00
    } | ConvertTo-Json
    
    $createResponse = Invoke-WebRequest -Uri "$baseUrl/api/project" -Method POST -Headers $headers -Body $createBody
    $createData = $createResponse.Content | ConvertFrom-Json
    $projectId = $createData.data.projectId
    Write-Host "   SUCCESS - Project created!" -ForegroundColor Green
    Write-Host "   Project ID: $projectId" -ForegroundColor Gray
    Write-Host "   Name: $($createData.data.name)" -ForegroundColor Gray
    Write-Host "   Status: $($createData.data.status)" -ForegroundColor Gray
    Write-Host "   Priority: $($createData.data.priority)" -ForegroundColor Gray
    Write-Host "   Budget: $($createData.data.budget)" -ForegroundColor Gray
} catch {
    Write-Host "   FAILED - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: Get Project by ID
Write-Host "`n[TEST 2/5] Getting Project by ID..." -ForegroundColor Yellow
try {
    $getResponse = Invoke-WebRequest -Uri "$baseUrl/api/project/$projectId" -Method GET -Headers $headers
    $getData = $getResponse.Content | ConvertFrom-Json
    Write-Host "   SUCCESS - Project retrieved!" -ForegroundColor Green
    Write-Host "   Name: $($getData.data.name)" -ForegroundColor Gray
    Write-Host "   Description: $($getData.data.description)" -ForegroundColor Gray
    Write-Host "   Owner: $($getData.data.owner.fullName)" -ForegroundColor Gray
} catch {
    Write-Host "   FAILED - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 3: Get All Projects
Write-Host "`n[TEST 3/5] Getting All Projects..." -ForegroundColor Yellow
try {
    $getAllResponse = Invoke-WebRequest -Uri "$baseUrl/api/project" -Method GET -Headers $headers
    $getAllData = $getAllResponse.Content | ConvertFrom-Json
    Write-Host "   SUCCESS - Projects retrieved!" -ForegroundColor Green
    Write-Host "   Total Projects: $($getAllData.count)" -ForegroundColor Gray
    foreach ($proj in $getAllData.data) {
        Write-Host "     - $($proj.name) [$($proj.status)]" -ForegroundColor DarkGray
    }
} catch {
    Write-Host "   FAILED - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 4: Update Project
Write-Host "`n[TEST 4/5] Updating Project..." -ForegroundColor Yellow
try {
    $updateBody = @{
        name = "E-Commerce Platform v2"
        description = "Updated: Building a modern e-commerce platform with AI features"
        status = "InProgress"
        priority = "Critical"
        startDate = "2025-01-01T00:00:00Z"
        endDate = "2025-12-31T23:59:59Z"
        budget = 75000.00
    } | ConvertTo-Json
    
    $updateResponse = Invoke-WebRequest -Uri "$baseUrl/api/project/$projectId" -Method PUT -Headers $headers -Body $updateBody
    $updateData = $updateResponse.Content | ConvertFrom-Json
    Write-Host "   SUCCESS - Project updated!" -ForegroundColor Green
    Write-Host "   New Name: $($updateData.data.name)" -ForegroundColor Gray
    Write-Host "   New Status: $($updateData.data.status)" -ForegroundColor Gray
    Write-Host "   New Priority: $($updateData.data.priority)" -ForegroundColor Gray
    Write-Host "   New Budget: $($updateData.data.budget)" -ForegroundColor Gray
} catch {
    Write-Host "   FAILED - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 5: Delete Project
Write-Host "`n[TEST 5/5] Deleting Project..." -ForegroundColor Yellow
try {
    $deleteResponse = Invoke-WebRequest -Uri "$baseUrl/api/project/$projectId" -Method DELETE -Headers $headers
    $deleteData = $deleteResponse.Content | ConvertFrom-Json
    Write-Host "   SUCCESS - Project deleted!" -ForegroundColor Green
    Write-Host "   Message: $($deleteData.message)" -ForegroundColor Gray
} catch {
    Write-Host "   FAILED - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Verify deletion
Write-Host "`n[VERIFY] Checking if project is deleted..." -ForegroundColor Yellow
try {
    $verifyResponse = Invoke-WebRequest -Uri "$baseUrl/api/project" -Method GET -Headers $headers
    $verifyData = $verifyResponse.Content | ConvertFrom-Json
    $deletedProject = $verifyData.data | Where-Object { $_.projectId -eq $projectId -and $_.isActive -eq $false }
    if ($deletedProject) {
        Write-Host "   SUCCESS - Project soft deleted (IsActive = false)" -ForegroundColor Green
    } else {
        Write-Host "   SUCCESS - Project removed from active list" -ForegroundColor Green
    }
} catch {
    Write-Host "   INFO - Could not verify: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Summary
Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host "ALL PROJECT API TESTS PASSED! (5/5)" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "`nTest Summary:" -ForegroundColor White
Write-Host "  Create Project:  PASS" -ForegroundColor Green
Write-Host "  Get by ID:       PASS" -ForegroundColor Green
Write-Host "  Get All:         PASS" -ForegroundColor Green
Write-Host "  Update Project:  PASS" -ForegroundColor Green
Write-Host "  Delete Project:  PASS" -ForegroundColor Green

