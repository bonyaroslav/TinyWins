param(
    [ValidateSet("Caddy", "Python")]
    [string]$Mode = "Caddy",
    [string]$ShortcutName = "Progress Tracker Server.lnk"
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

$startupPath = [Environment]::GetFolderPath("Startup")
$shortcutPath = Join-Path $startupPath $ShortcutName
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$arguments = "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$launcher`""

$wshShell = New-Object -ComObject WScript.Shell
$shortcut = $wshShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $powershell
$shortcut.Arguments = $arguments
$shortcut.WorkingDirectory = $root
$shortcut.IconLocation = "$powershell,0"
$shortcut.Save()

Write-Output "Created Startup shortcut: $shortcutPath"
