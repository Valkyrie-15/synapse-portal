# Wrapper invoked by the Windows Scheduled Task. Runs every portal scraper
# from the project directory and appends output to a log file so failures
# are visible even though the task runs unattended.

$ProjectDir = Split-Path -Parent $PSScriptRoot
$LogDir = Join-Path $ProjectDir "logs"
$LogFile = Join-Path $LogDir "portal-scrape.log"

if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir | Out-Null
}

# Keep temp files and the npm cache off a full C: drive
$env:TEMP = "D:/tmp"
$env:TMP = "D:/tmp"
$env:npm_config_cache = "D:/npm-cache"
if (-not (Test-Path $env:TEMP)) { New-Item -ItemType Directory -Path $env:TEMP | Out-Null }

Set-Location $ProjectDir

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Add-Content -Path $LogFile -Value "----- $timestamp -----"

npm run scrape *>> $LogFile

$exitCode = $LASTEXITCODE
Add-Content -Path $LogFile -Value "Exit code: $exitCode"
exit $exitCode
