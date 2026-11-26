#!/bin/bash
# 🦇 Double-click me (Mac). Puts Checkpoint Charlie in Docker Desktop for good.
cd "$(dirname "$0")" || exit 1
echo "🦇 Waking up Checkpoint Charlie..."
if ! docker info >/dev/null 2>&1; then
  echo "Opening Docker Desktop, give it a minute..."
  open -a Docker 2>/dev/null
  until docker info >/dev/null 2>&1; do sleep 3; done
fi
if ! grep -q "^DISCORD_TOKEN=..*" .env 2>/dev/null; then
  read -s -p "Paste Charlie's bot token (it stays hidden), then press Enter: " T; echo
  printf "DISCORD_TOKEN=%s\nGUILD_ID=1540905721879593030\n" "$T" > .env
  chmod 600 .env
fi
docker compose up -d --build || { echo "Something broke. Screenshot this window for Claude."; read -p "Press Enter to close"; exit 1; }
echo "Waiting for Charlie to check in..."
for _ in $(seq 1 30); do
  if docker compose logs 2>/dev/null | grep -q "guarding the checkpoint"; then
    echo; echo "✅ Charlie is ALIVE in Docker. He restarts on his own whenever Docker Desktop runs."
    echo "Tip: Docker Desktop → Settings → General → 'Start Docker Desktop when you sign in' = on."
    read -p "Press Enter to close"; exit 0
  fi
  sleep 2
done
echo "He didn't check in. Last log lines (send a screenshot to Claude, token is never shown):"
docker compose logs --tail 15
read -p "Press Enter to close"
