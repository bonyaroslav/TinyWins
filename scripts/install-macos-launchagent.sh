#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LABEL="local.progress-tracker"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
CADDY_BIN="${CADDY_BIN:-$(command -v caddy || true)}"

if [[ -z "$CADDY_BIN" ]]; then
  echo "caddy was not found on PATH. Install it first, for example: brew install caddy" >&2
  exit 1
fi

mkdir -p "$HOME/Library/LaunchAgents"

cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>
  <key>WorkingDirectory</key>
  <string>$ROOT</string>
  <key>ProgramArguments</key>
  <array>
    <string>$CADDY_BIN</string>
    <string>file-server</string>
    <string>--listen</string>
    <string>127.0.0.1:8787</string>
    <string>--root</string>
    <string>$ROOT</string>
    <string>--access-log</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>$ROOT/server.caddy.log</string>
  <key>StandardErrorPath</key>
  <string>$ROOT/server.caddy.err.log</string>
</dict>
</plist>
PLIST

launchctl unload "$PLIST" >/dev/null 2>&1 || true
launchctl load "$PLIST"
launchctl start "$LABEL"

echo "Installed LaunchAgent: $PLIST"
echo "Open http://127.0.0.1:8787/app/"
