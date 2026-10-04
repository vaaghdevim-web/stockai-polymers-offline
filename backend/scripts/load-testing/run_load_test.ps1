# PowerShell Runner for Telemetry Burst Rate Load Testing (1,000 req/sec)
param (
    [string]$TargetUrl = "http://localhost:8080/api/v1",
    [string]$OutputFile = "load-test-results.json"
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " StockAI Engineer 2 - 1,000 req/sec Burst Load Test Suite" -ForegroundColor Green
Write-Host " Target Endpoint: $TargetUrl" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

# Verify if k6 is installed
if (Get-Command k6 -ErrorAction SilentlyContinue) {
    Write-Host "[INFO] Found k6 executable in PATH. Initiating distributed load test..." -ForegroundColor Green
    $env:TARGET_URL = $TargetUrl
    k6 run --summary-export "$PSScriptRoot\$OutputFile" "$PSScriptRoot\k6-telemetry-load-test.js"
} else {
    Write-Host "[WARN] k6 executable is not installed or not in PATH." -ForegroundColor Yellow
    Write-Host "[INFO] To install k6 on Windows, run: winget install k6 --source winget" -ForegroundColor Yellow
    Write-Host "[INFO] Running native in-process JUnit multi-threaded load benchmark suite instead..." -ForegroundColor Cyan
    Set-Location -Path "$PSScriptRoot\..\.."
    .\mvnw.cmd test "-Dtest=TelemetryBurstRateLoadTest" "-Dmaven.compiler.release=23"
}
