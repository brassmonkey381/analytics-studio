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
$reportExit = $LASTEXITCODE

# Events lane: in-app event/session stream for michi-maker and tcgscan. It runs
# after the DAU lane and its failures are non-fatal - a missing event stream
# must not cost us the day's DAU history, which cannot be backfilled.
& node (Join-Path $root "scripts\events.mjs") 2>&1 | Out-File $log -Append -Encoding utf8
$eventsExit = $LASTEXITCODE
& node (Join-Path $root "scripts\events-report.mjs") 2>&1 | Out-File $log -Append -Encoding utf8
$eventsReportExit = $LASTEXITCODE

# Plans lane: distinct accounts per entitlement tier. Also non-fatal.
& node (Join-Path $root "scripts\plans.mjs") 2>&1 | Out-File $log -Append -Encoding utf8
$plansExit = $LASTEXITCODE

# Shares lane: who opens a binder that is not theirs. Also non-fatal.
& node (Join-Path $root "scripts\shares.mjs") 2>&1 | Out-File $log -Append -Encoding utf8
$sharesExit = $LASTEXITCODE

# Usage lane: daily binders/slots/scans/cards plus credit consumption. Also non-fatal.
& node (Join-Path $root "scripts\usage.mjs") 2>&1 | Out-File $log -Append -Encoding utf8
$usageExit = $LASTEXITCODE

# Geo lane: state-by-state ingestion and enrichment coverage. Also non-fatal.
& node (Join-Path $root "scripts\geo.mjs") 2>&1 | Out-File $log -Append -Encoding utf8
$geoExit = $LASTEXITCODE

# Enrich lane: per-script enrichment debt; accumulates its own daily history,
# so a missed day is a hole in the burn-down chart. Also non-fatal.
& node (Join-Path $root "scripts\enrich.mjs") 2>&1 | Out-File $log -Append -Encoding utf8

"collect exit=$collectExit report exit=$reportExit events exit=$eventsExit eventsReport exit=$eventsReportExit plans exit=$plansExit shares exit=$sharesExit usage exit=$usageExit geo exit=$geoExit enrich exit=$LASTEXITCODE" | Out-File $log -Append -Encoding utf8

# ---------------------------------------------------------------------------
# Auto-commit the day's data.
#
# Only the counts-only files are staged: they are the accumulating history and
# cannot be regenerated once days age out of the window. Everything that embeds
# emails (accounts.json, journeys.json, the HTML reports, logs) is gitignored.
#
# The scan below is a fail-closed backstop, NOT the primary defence - .gitignore
# is. If anything that looks like an email, key or IP reaches the staged diff,
# this unstages and refuses to commit rather than guessing.
# ---------------------------------------------------------------------------
$AutoCommit = $true
$AutoPush   = $true

function Write-Log([string]$msg) { $msg | Out-File $log -Append -Encoding utf8 }

if ($AutoCommit -and (Test-Path (Join-Path $root ".git"))) {
  Push-Location $root
  try {
    git add -- "data/metrics.json" "data/events.json" "data/plans.json" "data/shares.json" "data/usage.json" "data/geo.json" "data/enrich.json" "reports/events.md" 2>&1 | Out-Null
    $staged = @(git diff --cached --name-only)

    if ($staged.Count -eq 0) {
      Write-Log "auto-commit: no data changes, nothing to commit"
    }
    else {
      $diff = (git diff --cached | Out-String)
      # Email addresses, Supabase PATs, secret keys, JWTs, and IPv4 literals.
      $pattern = '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}' +
                 '|sbp_[A-Za-z0-9]{8}' +
                 '|sb_secret_[A-Za-z0-9]' +
                 '|eyJhbGciOi' +
                 '|EXCLUDED_IPS=[0-9]' +
                 '|(?<![\d.])((25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(25[0-5]|2[0-4]\d|1?\d?\d)(?![\d.])'
      $hits = @($diff -split "`n" | Select-String -Pattern $pattern)

      if ($hits.Count -gt 0) {
        git reset -q -- "data/metrics.json" "data/events.json" "data/plans.json" "data/shares.json" "data/usage.json" "data/geo.json" "data/enrich.json" "reports/events.md" 2>&1 | Out-Null
        Write-Log "auto-commit: ABORTED - staged diff matched $($hits.Count) sensitive pattern(s); nothing committed."
        foreach ($h in $hits | Select-Object -First 5) {
          $line = $h.Line.Trim()
          Write-Log ("  " + $line.Substring(0, [Math]::Min(120, $line.Length)))
        }
        Write-Log "  Inspect with: git diff -- data/metrics.json data/events.json reports/events.md"
      }
      else {
        $stamp = Get-Date -Format "yyyy-MM-dd"
        git commit -q -m "chore(data): daily metrics and events for $stamp" -m "Automated by run-daily.ps1. Counts only; emails and keys stay untracked." 2>&1 | Out-File $log -Append -Encoding utf8
        if ($LASTEXITCODE -eq 0) {
          Write-Log "auto-commit: committed $($staged -join ', ')"
          if ($AutoPush) {
            git push -q origin HEAD 2>&1 | Out-File $log -Append -Encoding utf8
            if ($LASTEXITCODE -eq 0) { Write-Log "auto-commit: pushed to origin" }
            else { Write-Log "auto-commit: push FAILED (exit $LASTEXITCODE) - commit is local only" }
          }
        }
        else {
          Write-Log "auto-commit: commit FAILED (exit $LASTEXITCODE)"
        }
      }
    }
  }
  catch {
    Write-Log "auto-commit: error - $($_.Exception.Message)"
  }
  finally { Pop-Location }
}

# Keep the last 60 logs
Get-ChildItem $logDir -Filter "run-*.log" | Sort-Object Name -Descending | Select-Object -Skip 60 | Remove-Item -Force
exit $collectExit
