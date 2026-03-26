port := "5173"
dev_url := "http://localhost:" + port

dev:
    npx vite --host 0.0.0.0 --port {{port}}

simulate: dev-bg
    node node_modules/@evenrealities/evenhub-simulator/bin/index.js {{dev_url}}

qr:
    npx evenhub qr --port {{port}} --path "/"

pack:
    npx evenhub pack

# start vite in background, wait for it to be ready
[private]
dev-bg:
    #!/usr/bin/env bash
    npx vite --host 0.0.0.0 --port {{port}} &
    for i in $(seq 1 30); do
      curl -s {{dev_url}} > /dev/null && exit 0
      sleep 0.3
    done
    echo "Vite failed to start" && exit 1
