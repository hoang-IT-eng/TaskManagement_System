# Script để restart TaskManagement API

Write-Host "Đang tìm process TaskManagement.API..." -ForegroundColor Yellow

# Tìm process đang chạy
$process = Get-Process | Where-Object {$_.ProcessName -eq "TaskManagement.API"}

if ($process) {
    Write-Host "Đang dừng process TaskManagement.API (PID: $($process.Id))..." -ForegroundColor Yellow
    Stop-Process -Id $process.Id -Force
    Start-Sleep -Seconds 2
    Write-Host "Đã dừng ứng dụng." -ForegroundColor Green
} else {
    Write-Host "Không tìm thấy process TaskManagement.API đang chạy." -ForegroundColor Yellow
}

# Kiểm tra port 5000
$port = netstat -ano | findstr :5000
if ($port) {
    Write-Host "Port 5000 vẫn đang được sử dụng. Đang giải phóng..." -ForegroundColor Yellow
    $portInfo = $port | Select-String -Pattern "LISTENING\s+(\d+)" | ForEach-Object { $_.Matches.Groups[1].Value }
    if ($portInfo) {
        Stop-Process -Id $portInfo -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
}

Write-Host "`nĐang khởi động lại ứng dụng..." -ForegroundColor Yellow
Set-Location "TaskManagement.API"
dotnet run



