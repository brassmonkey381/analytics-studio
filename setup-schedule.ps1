# Registers (or refreshes) the Windows Scheduled Task that runs the daily lane.
# Safe to re-run; overwrites the existing task definition.
$root = $PSScriptRoot
$taskName = "AnalyticsStudio Daily"
$action = New-ScheduledTaskAction -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$root\run-daily.ps1`""
$trigger = New-ScheduledTaskTrigger -Daily -At "08:07"
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopIfGoingOnBatteries `
  -AllowStartIfOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 30)
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Force
Write-Host "Registered '$taskName' - runs daily at 08:07 (catches up at next boot if missed)."
