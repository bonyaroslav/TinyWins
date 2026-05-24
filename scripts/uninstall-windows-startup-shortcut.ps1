param(
    [string]$ShortcutName = "Progress Tracker Server.lnk"
)

$ErrorActionPreference = "Stop"

$startupPath = [Environment]::GetFolderPath("Startup")
$shortcutPath = Join-Path $startupPath $ShortcutName

if (Test-Path -LiteralPath $shortcutPath) {
    Remove-Item -LiteralPath $shortcutPath -Force
    Write-Output "Removed Startup shortcut: $shortcutPath"
} else {
    Write-Output "Startup shortcut not found: $shortcutPath"
}
