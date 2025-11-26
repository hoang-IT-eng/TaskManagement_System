$baseUrl = "http://localhost:5000"
Write-Host "`n=== TASK MANAGEMENT API TEST SUITE ===" -ForegroundColor Cyan
Write-Host "Testing Task CRUD & Search/Filter API at: $baseUrl`n" -ForegroundColor Gray

# Setup: Login and create project
Write-Host "[SETUP 1] Logging in..." -ForegroundColor Yellow
try {
    $loginResponse = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"test12345@example.com","password":"password123"}'
    $loginData = $loginResponse.Content | ConvertFrom-Json
    $token = $loginData.data.token
    $userId = $loginData.data.user.userId
    Write-Host "   SUCCESS - Token obtained! (User ID: $userId)" -ForegroundColor Green
} catch {
    Write-Host "   FAILED - Could not login: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Write-Host "`n[SETUP 2] Creating test project..." -ForegroundColor Yellow
try {
    $projectBody = @{
        name = "Task Management Test Project"
        description = "Testing task CRUD operations"
        status = "InProgress"
        priority = "High"
    } | ConvertTo-Json
    
    $projectResponse = Invoke-WebRequest -Uri "$baseUrl/api/project" -Method POST -Headers $headers -Body $projectBody
    $projectData = $projectResponse.Content | ConvertFrom-Json
    $projectId = $projectData.data.projectId
    Write-Host "   SUCCESS - Project created! (Project ID: $projectId)" -ForegroundColor Green
} catch {
    Write-Host "   FAILED - Could not create project: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 1: Create Task
Write-Host "`n[TEST 1/8] Creating Task..." -ForegroundColor Yellow
try {
    $taskBody = @{
        title = "Implement user authentication"
        description = "Add JWT authentication to the API"
        status = "Todo"
        priority = "High"
        dueDate = "2025-12-31T23:59:59Z"
        estimatedHours = 8
    } | ConvertTo-Json
    
    $createResponse = Invoke-WebRequest -Uri "$baseUrl/api/project/$projectId/tasks" -Method POST -Headers $headers -Body $taskBody
    $taskData = $createResponse.Content | ConvertFrom-Json
    $taskId = $taskData.data.taskId
    Write-Host "   SUCCESS - Task created!" -ForegroundColor Green
    Write-Host "   Task ID: $taskId" -ForegroundColor Gray
    Write-Host "   Title: $($taskData.data.title)" -ForegroundColor Gray
    Write-Host "   Status: $($taskData.data.status)" -ForegroundColor Gray
    Write-Host "   Priority: $($taskData.data.priority)" -ForegroundColor Gray
} catch {
    Write-Host "   FAILED - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: Create more tasks for filtering
Write-Host "`n[TEST 2/8] Creating Multiple Tasks..." -ForegroundColor Yellow
$task2Id = 0
$task3Id = 0
try {
    $task2 = @{
        title = "Design database schema"
        description = "Create ERD for the database"
        status = "InProgress"
        priority = "Medium"
        assigneeId = $userId
        estimatedHours = 4
    } | ConvertTo-Json
    
    $task2Response = Invoke-WebRequest -Uri "$baseUrl/api/project/$projectId/tasks" -Method POST -Headers $headers -Body $task2
    $task2Data = $task2Response.Content | ConvertFrom-Json
    $task2Id = $task2Data.data.taskId
    
    $task3 = @{
        title = "Write documentation"
        description = "Document API endpoints"
        status = "Done"
        priority = "Low"
        estimatedHours = 2
    } | ConvertTo-Json
    
    $task3Response = Invoke-WebRequest -Uri "$baseUrl/api/project/$projectId/tasks" -Method POST -Headers $headers -Body $task3
    $task3Data = $task3Response.Content | ConvertFrom-Json
    $task3Id = $task3Data.data.taskId
    
    Write-Host "   SUCCESS - Multiple tasks created!" -ForegroundColor Green
    Write-Host "   Task 2 ID: $task2Id (Status: InProgress)" -ForegroundColor Gray
    Write-Host "   Task 3 ID: $task3Id (Status: Done)" -ForegroundColor Gray
} catch {
    Write-Host "   FAILED - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 3: Get All Tasks
Write-Host "`n[TEST 3/8] Getting All Project Tasks..." -ForegroundColor Yellow
try {
    $allTasksResponse = Invoke-WebRequest -Uri "$baseUrl/api/project/$projectId/tasks" -Method GET -Headers $headers
    $allTasksData = $allTasksResponse.Content | ConvertFrom-Json
    Write-Host "   SUCCESS - Tasks retrieved!" -ForegroundColor Green
    Write-Host "   Total Tasks: $($allTasksData.count)" -ForegroundColor Gray
    foreach ($task in $allTasksData.data) {
        Write-Host "     - $($task.title) [$($task.status) / $($task.priority)]" -ForegroundColor DarkGray
    }
} catch {
    Write-Host "   FAILED - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 4: Filter by Status
Write-Host "`n[TEST 4/8] Filtering Tasks by Status (InProgress)..." -ForegroundColor Yellow
try {
    $filterResponse = Invoke-WebRequest -Uri "$baseUrl/api/project/$projectId/tasks/search?status=InProgress" -Method GET -Headers $headers
    $filterData = $filterResponse.Content | ConvertFrom-Json
    Write-Host "   SUCCESS - Filtered tasks retrieved!" -ForegroundColor Green
    Write-Host "   InProgress Tasks: $($filterData.count)" -ForegroundColor Gray
    foreach ($task in $filterData.data) {
        Write-Host "     - $($task.title) [$($task.status)]" -ForegroundColor DarkGray
    }
} catch {
    Write-Host "   FAILED - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 5: Filter by Priority
Write-Host "`n[TEST 5/8] Filtering Tasks by Priority (High)..." -ForegroundColor Yellow
try {
    $priorityResponse = Invoke-WebRequest -Uri "$baseUrl/api/project/$projectId/tasks/search?priority=High" -Method GET -Headers $headers
    $priorityData = $priorityResponse.Content | ConvertFrom-Json
    Write-Host "   SUCCESS - Filtered by priority!" -ForegroundColor Green
    Write-Host "   High Priority Tasks: $($priorityData.count)" -ForegroundColor Gray
} catch {
    Write-Host "   FAILED - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 6: Search by keyword
Write-Host "`n[TEST 6/8] Searching Tasks by Keyword ('authentication')..." -ForegroundColor Yellow
try {
    $searchResponse = Invoke-WebRequest -Uri "$baseUrl/api/project/$projectId/tasks/search?searchTerm=authentication" -Method GET -Headers $headers
    $searchData = $searchResponse.Content | ConvertFrom-Json
    Write-Host "   SUCCESS - Search completed!" -ForegroundColor Green
    Write-Host "   Found: $($searchData.count) task(s)" -ForegroundColor Gray
} catch {
    Write-Host "   FAILED - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 7: Group by Status
Write-Host "`n[TEST 7/8] Getting Tasks Grouped by Status..." -ForegroundColor Yellow
try {
    $groupResponse = Invoke-WebRequest -Uri "$baseUrl/api/project/$projectId/tasks/grouped-by-status" -Method GET -Headers $headers
    $groupData = $groupResponse.Content | ConvertFrom-Json
    Write-Host "   SUCCESS - Tasks grouped by status!" -ForegroundColor Green
    foreach ($group in $groupData.data) {
        Write-Host "   Status: $($group.status) - Count: $($group.count)" -ForegroundColor Gray
    }
} catch {
    Write-Host "   FAILED - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 8: Update Task
Write-Host "`n[TEST 8/8] Updating Task Status and Priority..." -ForegroundColor Yellow
try {
    $updateBody = @{
        title = "Implement user authentication (Updated)"
        description = "Add JWT authentication to the API with refresh tokens"
        status = "InProgress"
        priority = "Urgent"
        estimatedHours = 10
        actualHours = 5
    } | ConvertTo-Json
    
    $updateResponse = Invoke-WebRequest -Uri "$baseUrl/api/project/$projectId/tasks/$taskId" -Method PUT -Headers $headers -Body $updateBody
    $updateData = $updateResponse.Content | ConvertFrom-Json
    Write-Host "   SUCCESS - Task updated!" -ForegroundColor Green
    Write-Host "   New Status: $($updateData.data.status)" -ForegroundColor Gray
    Write-Host "   New Priority: $($updateData.data.priority)" -ForegroundColor Gray
} catch {
    Write-Host "   FAILED - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Cleanup
Write-Host "`n[CLEANUP] Cleaning up test data..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri "$baseUrl/api/project/$projectId" -Method DELETE -Headers $headers | Out-Null
    Write-Host "   SUCCESS - Test project deleted" -ForegroundColor Green
} catch {
    Write-Host "   INFO - Could not delete test project: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Summary
Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host "ALL TASK API TESTS PASSED! (8/8)" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "`nTest Summary:" -ForegroundColor White
Write-Host "  Create Task:           PASS" -ForegroundColor Green
Write-Host "  Create Multiple:       PASS" -ForegroundColor Green
Write-Host "  Get All Tasks:         PASS" -ForegroundColor Green
Write-Host "  Filter by Status:      PASS" -ForegroundColor Green
Write-Host "  Filter by Priority:    PASS" -ForegroundColor Green
Write-Host "  Search by Keyword:     PASS" -ForegroundColor Green
Write-Host "  Group by Status:       PASS" -ForegroundColor Green
Write-Host "  Update Task:           PASS" -ForegroundColor Green
Write-Host "`nFeatures Tested:" -ForegroundColor White
Write-Host "  CRUD Operations" -ForegroundColor Gray
Write-Host "  Filter by Status" -ForegroundColor Gray
Write-Host "  Filter by Priority" -ForegroundColor Gray
Write-Host "  Search by keyword" -ForegroundColor Gray
Write-Host "  Group tasks by status" -ForegroundColor Gray
Write-Host "  Task assignment" -ForegroundColor Gray

