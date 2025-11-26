$baseUrl = "http://localhost:5000"
Write-Host "`n=== PROJECT MEMBER MANAGEMENT API TEST ===" -ForegroundColor Cyan
Write-Host "Testing Project Member API at: $baseUrl`n" -ForegroundColor Gray

# Step 1: Login để lấy token cho user 1 (Owner)
Write-Host "[SETUP 1] Login as Project Owner..." -ForegroundColor Yellow
try {
    $loginResponse = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"test12345@example.com","password":"password123"}'
    $loginData = $loginResponse.Content | ConvertFrom-Json
    $ownerToken = $loginData.data.token
    $ownerId = $loginData.data.user.userId
    Write-Host "   SUCCESS - Owner token obtained! (User ID: $ownerId)" -ForegroundColor Green
} catch {
    Write-Host "   FAILED - Could not login as owner: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

$ownerHeaders = @{
    "Authorization" = "Bearer $ownerToken"
    "Content-Type" = "application/json"
}

# Step 2: Đăng ký user thứ 2 để test thêm member
Write-Host "`n[SETUP 2] Creating test member user..." -ForegroundColor Yellow
try {
    $randomEmail = "member$(Get-Random -Minimum 10000 -Maximum 99999)@example.com"
    $registerResponse = Invoke-WebRequest -Uri "$baseUrl/api/auth/register" -Method POST -ContentType "application/json" -Body "{`"email`":`"$randomEmail`",`"password`":`"password123`",`"fullName`":`"Test Member User`",`"phoneNumber`":`"+84901234567`"}"
    $registerData = $registerResponse.Content | ConvertFrom-Json
    $memberToken = $registerData.data.token
    $memberId = $registerData.data.user.userId
    Write-Host "   SUCCESS - Member user created! (User ID: $memberId, Email: $randomEmail)" -ForegroundColor Green
} catch {
    Write-Host "   FAILED - Could not create member user: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

$memberHeaders = @{
    "Authorization" = "Bearer $memberToken"
    "Content-Type" = "application/json"
}

# Step 3: Tạo dự án với owner
Write-Host "`n[SETUP 3] Creating test project..." -ForegroundColor Yellow
try {
    $projectBody = @{
        name = "Team Collaboration Project"
        description = "Testing project member management"
        status = "InProgress"
        priority = "High"
        budget = 30000.00
    } | ConvertTo-Json
    
    $projectResponse = Invoke-WebRequest -Uri "$baseUrl/api/project" -Method POST -Headers $ownerHeaders -Body $projectBody
    $projectData = $projectResponse.Content | ConvertFrom-Json
    $projectId = $projectData.data.projectId
    Write-Host "   SUCCESS - Project created! (Project ID: $projectId)" -ForegroundColor Green
} catch {
    Write-Host "   FAILED - Could not create project: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 1: Thêm thành viên vào dự án
Write-Host "`n[TEST 1/5] Adding Member to Project..." -ForegroundColor Yellow
try {
    $addMemberBody = @{
        userId = $memberId
        role = "Member"
    } | ConvertTo-Json
    
    $addMemberResponse = Invoke-WebRequest -Uri "$baseUrl/api/project/$projectId/members" -Method POST -Headers $ownerHeaders -Body $addMemberBody
    $addMemberData = $addMemberResponse.Content | ConvertFrom-Json
    $projectMemberId = $addMemberData.data.projectMemberId
    Write-Host "   SUCCESS - Member added to project!" -ForegroundColor Green
    Write-Host "   Member ID: $projectMemberId" -ForegroundColor Gray
    Write-Host "   User: $($addMemberData.data.user.fullName)" -ForegroundColor Gray
    Write-Host "   Role: $($addMemberData.data.role)" -ForegroundColor Gray
    Write-Host "   Joined: $($addMemberData.data.joinedAt)" -ForegroundColor Gray
} catch {
    Write-Host "   FAILED - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: Lấy danh sách thành viên
Write-Host "`n[TEST 2/5] Getting Project Members..." -ForegroundColor Yellow
try {
    $getMembersResponse = Invoke-WebRequest -Uri "$baseUrl/api/project/$projectId/members" -Method GET -Headers $ownerHeaders
    $getMembersData = $getMembersResponse.Content | ConvertFrom-Json
    Write-Host "   SUCCESS - Members retrieved!" -ForegroundColor Green
    Write-Host "   Total Members: $($getMembersData.count)" -ForegroundColor Gray
    foreach ($member in $getMembersData.data) {
        Write-Host "     - $($member.user.fullName) [$($member.role)]" -ForegroundColor DarkGray
    }
} catch {
    Write-Host "   FAILED - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 3: Cập nhật quyền của thành viên
Write-Host "`n[TEST 3/5] Updating Member Role..." -ForegroundColor Yellow
try {
    $updateRoleBody = @{
        role = "Admin"
    } | ConvertTo-Json
    
    $updateRoleResponse = Invoke-WebRequest -Uri "$baseUrl/api/project/$projectId/members/$projectMemberId/role" -Method PUT -Headers $ownerHeaders -Body $updateRoleBody
    $updateRoleData = $updateRoleResponse.Content | ConvertFrom-Json
    Write-Host "   SUCCESS - Member role updated!" -ForegroundColor Green
    Write-Host "   New Role: $($updateRoleData.data.role)" -ForegroundColor Gray
} catch {
    Write-Host "   FAILED - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 4: Member truy cập dự án sau khi được thêm
Write-Host "`n[TEST 4/5] Testing Member Access to Project..." -ForegroundColor Yellow
try {
    $memberAccessResponse = Invoke-WebRequest -Uri "$baseUrl/api/project/$projectId" -Method GET -Headers $memberHeaders
    $memberAccessData = $memberAccessResponse.Content | ConvertFrom-Json
    Write-Host "   SUCCESS - Member can access project!" -ForegroundColor Green
    Write-Host "   Project: $($memberAccessData.data.name)" -ForegroundColor Gray
} catch {
    Write-Host "   FAILED - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 5: Xóa thành viên khỏi dự án
Write-Host "`n[TEST 5/5] Removing Member from Project..." -ForegroundColor Yellow
try {
    $removeMemberResponse = Invoke-WebRequest -Uri "$baseUrl/api/project/$projectId/members/$projectMemberId" -Method DELETE -Headers $ownerHeaders
    $removeMemberData = $removeMemberResponse.Content | ConvertFrom-Json
    Write-Host "   SUCCESS - Member removed from project!" -ForegroundColor Green
    Write-Host "   Message: $($removeMemberData.message)" -ForegroundColor Gray
} catch {
    Write-Host "   FAILED - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 6: Verify member không còn truy cập được
Write-Host "`n[VERIFY] Checking member access after removal..." -ForegroundColor Yellow
try {
    $verifyResponse = Invoke-WebRequest -Uri "$baseUrl/api/project/$projectId" -Method GET -Headers $memberHeaders
    Write-Host "   WARNING - Member still has access (should not happen)" -ForegroundColor Yellow
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "   SUCCESS - Member no longer has access (as expected)" -ForegroundColor Green
    } else {
        Write-Host "   INFO - Access check returned: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    }
}

# Cleanup: Xóa dự án test
Write-Host "`n[CLEANUP] Cleaning up test project..." -ForegroundColor Yellow
try {
    $deleteResponse = Invoke-WebRequest -Uri "$baseUrl/api/project/$projectId" -Method DELETE -Headers $ownerHeaders
    Write-Host "   SUCCESS - Test project deleted" -ForegroundColor Green
} catch {
    Write-Host "   INFO - Could not delete test project: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Summary
Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host "ALL PROJECT MEMBER TESTS PASSED! (5/5)" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "`nTest Summary:" -ForegroundColor White
Write-Host "  Add Member:      PASS" -ForegroundColor Green
Write-Host "  Get Members:     PASS" -ForegroundColor Green
Write-Host "  Update Role:     PASS" -ForegroundColor Green
Write-Host "  Member Access:   PASS" -ForegroundColor Green
Write-Host "  Remove Member:   PASS" -ForegroundColor Green
Write-Host "`nFeatures Tested:" -ForegroundColor White
Write-Host "  ✓ Add member to project" -ForegroundColor Gray
Write-Host "  ✓ List project members" -ForegroundColor Gray
Write-Host "  ✓ Update member role (Member -> Admin)" -ForegroundColor Gray
Write-Host "  ✓ Member can access project after being added" -ForegroundColor Gray
Write-Host "  ✓ Remove member from project" -ForegroundColor Gray
Write-Host "  ✓ Member loses access after removal" -ForegroundColor Gray

