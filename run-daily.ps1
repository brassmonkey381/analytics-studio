# Daily analytics lane: collect metrics, rebuild reports, log the run.
$ErrorActionPreference = "Continue"

# Node writes UTF-8 to stdout; without this PowerShell decodes it as the console
# OEM codepage and every non-ASCII character lands in the log as mojibake.
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$root = $PSScriptRoot
$logDir = Join-Path $root "logs"
New-Item -ItemType Directory -Force $logDir | Out-Null
$log = Join-Path $logDir ("run-" + (Get-Date -Format "yyyy-MM-dd") + ".log")

"=== Analytics daily run $(Get-Date -Format o) ===" | Out-File $log -Append -Encoding utf8
& node (Join-Path $root "scripts\collect.mjs") 2>&1 | Out-File $log -Append -Encoding utf8
$collectExit = $LASTEXITCODE
& node (Join-Path $root "scripts\report.mjs") 2>&1 | Out-File $log -Append -Encoding utf8
"collect exit=$collectExit report exit=$LASTEXITCODE" | Out-File $log -Append -Encoding utf8

# Keep the last 60 logs
Get-ChildItem $logDir -Filter "run-*.log" | Sort-Object Name -Descending | Select-Object -Skip 60 | Remove-Item -Force
exit $collectExit
