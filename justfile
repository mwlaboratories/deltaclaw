port := "5173"
dev_url := "http://localhost:" + port

dev: _free-port
    npx vite --host 0.0.0.0 --port {{port}} --strictPort

simulate: dev-bg
    node node_modules/@evenrealities/evenhub-simulator/bin/index.js {{dev_url}}

qr:
    #!/usr/bin/env bash
    ts_ip=$(tailscale ip -4 2>/dev/null)
    if [ -n "$ts_ip" ]; then
      npx evenhub qr --url "http://${ts_ip}:{{port}}/"
    else
      npx evenhub qr --port {{port}} --path "/"
    fi

pack:
    npx evenhub pack

screenshots:
    #!/usr/bin/env bash
    REPO="$(pwd)"
    DOCS="$REPO/docs"
    # Kill existing
    ps aux | grep evenhub-simulator | grep -v grep | awk '{print $2}' | xargs -r kill 2>/dev/null
    pid=$(ss -tlnp sport = :5173 2>/dev/null | grep -oP 'pid=\K[0-9]+')
    [ -n "$pid" ] && kill $pid 2>/dev/null
    sleep 0.5
    # Start vite
    nix shell nixpkgs#nodejs_22 -c node_modules/.bin/vite --host 0.0.0.0 --port 5173 --strictPort &>/dev/null &
    for i in $(seq 1 20); do curl -s http://localhost:5173/ >/dev/null 2>&1 && break; sleep 0.3; done
    # Start simulator
    FHS=$(ls -t /nix/store/*deltaclaw-fhs/bin/deltaclaw-fhs 2>/dev/null | head -1)
    DELTACLAW_CWD="$REPO" $FHS -c "node node_modules/@evenrealities/evenhub-simulator/bin/index.js http://localhost:5173" &>/dev/null &
    sleep 6
    # Find glasses window
    GID=$(niri msg windows | grep -B1 "Glasses Display" | head -1 | grep -oP '\d+')
    WX=$(niri msg windows | grep -A15 "ID $GID" | grep "Workspace-view" | grep -oP '\d+' | head -1)
    WY=$(niri msg windows | grep -A15 "ID $GID" | grep "Workspace-view" | grep -oP '\d+' | tail -1)
    WW=$(niri msg windows | grep -A15 "ID $GID" | grep "Window size" | grep -oP '\d+' | head -1)
    WH=$(niri msg windows | grep -A15 "ID $GID" | grep "Window size" | grep -oP '\d+' | tail -1)
    CX=$((WX+2)); CY=$((WY+46)); CW=$((WW-4)); CH=$((WH-48))
    CROP="${CW}x${CH}+${CX}+${CY}"
    shot() { nix shell nixpkgs#grim nixpkgs#imagemagick -c bash -c "grim /tmp/dc-f.png && magick /tmp/dc-f.png -crop $CROP $DOCS/dc-$1.png"; }
    key() { nix shell nixpkgs#wtype -c wtype -k "$1"; }
    niri msg action focus-window --id $GID; sleep 0.3
    # Welcome
    shot welcome
    # Channels
    key Return; sleep 1
    shot channels
    # Scroll to philosopher
    key Down; sleep 0.1; key Down; sleep 0.1; key Down; sleep 0.1; key Down; sleep 0.3
    shot channels-scroll
    # Enter philosopher
    key Return; sleep 1
    shot philosopher
    # Back to channels
    key Return; sleep 0.1; key Return; sleep 1
    # Up to coder
    key Up; sleep 0.1; key Up; sleep 0.1; key Up; sleep 0.3
    key Return; sleep 1
    shot messages
    # Record
    key Return; sleep 1
    shot recording
    # Cleanup
    ps aux | grep evenhub-simulator | grep -v grep | awk '{print $2}' | xargs -r kill 2>/dev/null
    pid=$(ss -tlnp sport = :5173 2>/dev/null | grep -oP 'pid=\K[0-9]+')
    [ -n "$pid" ] && kill $pid 2>/dev/null
    echo "Screenshots saved to docs/"
    ls $DOCS/dc-*.png

[private]
_free-port:
    #!/usr/bin/env bash
    pid=$(ss -tlnp sport = :{{port}} 2>/dev/null | grep -oP 'pid=\K[0-9]+')
    if [ -n "$pid" ]; then
      echo "Killing stale process on port {{port}} (pid $pid)"
      kill $pid 2>/dev/null
      sleep 0.3
    fi

# start vite in background, wait for it to be ready
[private]
dev-bg: _free-port
    #!/usr/bin/env bash
    npx vite --host 0.0.0.0 --port {{port}} --strictPort &
    for i in $(seq 1 30); do
      curl -s {{dev_url}} > /dev/null && exit 0
      sleep 0.3
    done
    echo "Vite failed to start" && exit 1
