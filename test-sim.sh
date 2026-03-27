#!/usr/bin/env bash
# Launch vite + simulator, take screenshots at intervals
set -e

REPO="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO"

# Kill any existing instances
fuser -k 5173/tcp 2>/dev/null || true
pkill -f evenhub-simulator 2>/dev/null || true
sleep 0.5

# Start vite (needs node)
nix shell nixpkgs#nodejs_22 -c node_modules/.bin/vite --host 0.0.0.0 --port 5173 --strictPort &>/tmp/deltaclaw-vite.log &
VITE_PID=$!

# Wait for vite
for i in $(seq 1 30); do
  curl -s http://localhost:5173/ > /dev/null 2>&1 && break
  sleep 0.3
done

# Find latest FHS wrapper
FHS_BIN=$(ls -t /nix/store/*deltaclaw-fhs/bin/deltaclaw-fhs 2>/dev/null | head -1)
if [ -z "$FHS_BIN" ]; then
  echo "No FHS binary found. Run 'nix develop' first to build it."
  kill $VITE_PID 2>/dev/null
  exit 1
fi

# Start simulator through FHS (for graphics libs)
export DELTACLAW_CWD="$REPO"
$FHS_BIN -c "node node_modules/@evenrealities/evenhub-simulator/bin/index.js http://localhost:5173" &>/tmp/deltaclaw-sim.log &
SIM_PID=$!

echo "Vite PID: $VITE_PID"
echo "Simulator PID: $SIM_PID"
echo "Waiting for simulator to initialize..."
sleep 5

# Take screenshot
nix shell nixpkgs#grim -c grim /tmp/deltaclaw-test.png 2>/dev/null
echo "Screenshot: /tmp/deltaclaw-test.png"

# Show simulator errors
if grep -i "error\|failed" /tmp/deltaclaw-sim.log 2>/dev/null | grep -v "libEGL\|pci id"; then
  echo "--- Simulator errors ---"
  grep -i "error\|failed" /tmp/deltaclaw-sim.log | grep -v "libEGL\|pci id"
fi

echo ""
echo "Running. Press Ctrl+C to stop."
echo "Screenshots: nix shell nixpkgs#grim -c grim /tmp/deltaclaw-test.png"

trap "kill $VITE_PID $SIM_PID 2>/dev/null" EXIT
wait
