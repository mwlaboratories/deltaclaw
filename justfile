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
