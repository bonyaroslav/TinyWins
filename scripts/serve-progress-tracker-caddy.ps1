param(
    [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
    [string]$Listen = "127.0.0.1:8787",
    [string]$LogPath = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")).Path "server.caddy.log"),
    [string]$ErrorLogPath = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")).Path "server.caddy.err.log")
)

$ErrorActionPreference = "Stop"

$caddy = Get-Command caddy -ErrorAction Stop

Set-Location $Root

$arguments = @(
    "file-server"
    "--listen"
    $Listen
    "--root"
    $Root
    "--access-log"
)

Start-Process -FilePath $caddy.Source `
    -ArgumentList $arguments `
    -WorkingDirectory $Root `
    -NoNewWindow `
    -Wait `
    -RedirectStandardOutput $LogPath `
    -RedirectStandardError $ErrorLogPath
