# TruthLens AI – MongoDB Local Launcher
# Run this script in PowerShell (as Administrator is NOT required for local data dir)
# This creates a local ./data/db directory and starts MongoDB pointing to it.

$dataDir = "$PSScriptRoot\data\db"
$logDir  = "$PSScriptRoot\data\logs"

# Create directories if they don't exist
if (-not (Test-Path $dataDir)) {
    New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
    Write-Host "[MongoDB] Created data directory: $dataDir"
}
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir  -Force | Out-Null
}

# Try to find mongod.exe in common install paths
$mongodPaths = @(
    "C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe",
    "C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe",
    "C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe",
    "C:\Program Files\MongoDB\Server\5.0\bin\mongod.exe"
)

$mongodExe = $null
foreach ($p in $mongodPaths) {
    if (Test-Path $p) {
        $mongodExe = $p
        break
    }
}

if (-not $mongodExe) {
    Write-Host ""
    Write-Host "  MongoDB not found in common paths." -ForegroundColor Red
    Write-Host "  Please install MongoDB Community from:" -ForegroundColor Yellow
    Write-Host "  https://www.mongodb.com/try/download/community" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Alternatively, use MongoDB Atlas (free cloud):" -ForegroundColor Yellow
    Write-Host "  https://www.mongodb.com/cloud/atlas/register" -ForegroundColor Cyan
    Write-Host "  Then update MONGO_URI in backend/.env" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "  Starting MongoDB..." -ForegroundColor Green
Write-Host "  Data : $dataDir" -ForegroundColor Gray
Write-Host "  Port : 27017" -ForegroundColor Gray
Write-Host "  Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

& $mongodExe --dbpath $dataDir --logpath "$logDir\mongod.log" --logappend
