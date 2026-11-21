# Registers (or re-registers) the Windows Scheduled Task that runs all portal
# scrapers periodically. Run this once, manually, from PowerShell:
#
#   powershell -ExecutionPolicy Bypass -File .\scripts\register-scrape-task.ps1
#
# Default schedule: every 2 hours, daily. Edit -RepetitionInterval below
# to change frequency.

$TaskName = "SynapsePortal-PortalScrape"
$ScriptPath = Join-Path $PSScriptRoot "run-scrape.ps1"

$Action = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$ScriptPath`""

$Trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) `
    -RepetitionInterval (New-TimeSpan -Hours 2) `
    -RepetitionDuration ([TimeSpan]::MaxValue)

$Settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
    -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 30)

Register-ScheduledTask -TaskName $TaskName `
    -Action $Action -Trigger $Trigger -Settings $Settings `
    -Description "Periodically scrapes live claim figures from provider portals (IHX, Health India, East West Assist, FHPL) into the Synapse Portal DB." `
    -Force

Write-Host "Registered scheduled task '$TaskName'. It will run every 2 hours."
Write-Host "View/edit it in Task Scheduler, or run: Get-ScheduledTask -TaskName '$TaskName'"
