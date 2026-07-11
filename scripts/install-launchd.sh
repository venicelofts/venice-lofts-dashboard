#!/bin/zsh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLIST_SRC="$ROOT/launchd/com.itinerary.scan.plist"
PLIST_DST="$HOME/Library/LaunchAgents/com.itinerary.scan.plist"

mkdir -p "$HOME/Library/LaunchAgents"
mkdir -p "$HOME/Library/Logs"
cp "$PLIST_SRC" "$PLIST_DST"
launchctl bootout "gui/$(id -u)/com.itinerary.scan" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST_DST"
launchctl enable "gui/$(id -u)/com.itinerary.scan"
echo "Loaded com.itinerary.scan (daily 07:00). Logs: ~/Library/Logs/itinerary-scan*.log"
