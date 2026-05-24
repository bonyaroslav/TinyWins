param(
    [ValidateSet("Caddy", "Python")]
    [string]$Mode = "Caddy",
    [string]$TaskName = "Progress Tracker Server"
)

$ErrorActionPreference = "Stop"

$scriptName = if ($Mode -eq "Caddy") {
    "serve-progress-tracker-caddy.ps1"
} else {
    "serve-progress-tracker.ps1"
}

$launcher = Join-Path $PSScriptRoot $scriptName
if (-not (Test-Path -LiteralPath $launcher)) {
    throw "Launcher script not found: $launcher"
}

if ($Mode -eq "Caddy") {
    Get-Command caddy -ErrorAction Stop > $null
} else {
    Get-Command python -ErrorAction Stop > $null
}

$pwsh = Get-Command pwsh -ErrorAction SilentlyContinue
$powershell = if ($pwsh) {
    $pwsh.Source
} else {
    (Get-Command powershell -ErrorAction Stop).Source
}

$taskRun = "`"'$powershell' -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$launcher`"`""

& schtasks.exe /Create /TN $TaskName /SC ONLOGON /TR $taskRun /F

if ($LASTEXITCODE -ne 0) {
    throw "Failed to create scheduled task. Run this script from an elevated PowerShell window, or use scripts/install-windows-startup-shortcut.ps1 for a per-user Startup-folder shortcut."
}
