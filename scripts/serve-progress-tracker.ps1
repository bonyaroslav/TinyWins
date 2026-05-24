param(
    [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
    [string]$ListenHost = "127.0.0.1",
    [int]$Port = 8787,
    [string]$LogPath = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")).Path "server.log")
)

$ErrorActionPreference = "Stop"

$python = Get-Command python -ErrorAction Stop

Set-Location $Root

& $python.Source -m http.server $Port --bind $ListenHost *>> $LogPath
