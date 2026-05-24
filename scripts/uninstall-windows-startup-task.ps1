param(
    [string]$TaskName = "Progress Tracker Server"
)

$ErrorActionPreference = "Stop"

& schtasks.exe /Delete /TN $TaskName /F
