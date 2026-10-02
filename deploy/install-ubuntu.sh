#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
APP_DIR="$(pwd)"
if [[ "$EUID" -ne 0 ]]; then echo 'Run with sudo bash deploy/install-ubuntu.sh'; exit 1; fi
APP_USER="${SUDO_USER:-ubuntu}"
id "$APP_USER" >/dev/null
[[ -f dist/client/index.html && -f server/standalone.js ]]
command -v nginx >/dev/null
NODE_BIN="$(command -v node)"
install -d -o "$APP_USER" -g "$(id -gn "$APP_USER")" -m 750 /var/lib/codename
install -d -m 755 /var/www/codename
cp -a dist/client/. /var/www/codename/
chmod -R a+rX /var/www/codename
cat > /etc/systemd/system/codename.service <<UNIT
[Unit]
Description=Codename multiplayer room service
After=network.target
[Service]
User=$APP_USER
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
Environment=PORT=3001
Environment=DATABASE_PATH=/var/lib/codename/rooms.sqlite
ExecStart=$NODE_BIN $APP_DIR/server/standalone.js
Restart=on-failure
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
UMask=0077
[Install]
WantedBy=multi-user.target
UNIT
cat > /etc/nginx/sites-available/codename <<'NGINX'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    root /var/www/codename;
    index index.html;
    client_max_body_size 600k;
    add_header X-Content-Type-Options nosniff always;
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $http_host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 20s;
    }
    location / { try_files $uri $uri/ /index.html; }
    location ~ /\. { deny all; }
}
NGINX
# Keep the original default config available for rollback.
if [[ -e /etc/nginx/sites-enabled/default ]]; then
    cp -L /etc/nginx/sites-enabled/default /etc/nginx/sites-available/default.before-codename
    rm /etc/nginx/sites-enabled/default
fi
ln -sfn /etc/nginx/sites-available/codename /etc/nginx/sites-enabled/codename
nginx -t
systemctl daemon-reload
systemctl enable codename nginx
systemctl restart codename
systemctl reload nginx
for attempt in {1..10}; do
    status="$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1/api/rooms/ABCDEF || true)"
    if [[ "$status" == 404 ]]; then
        systemctl is-active codename nginx
        echo 'Deployment ready locally. Allow TCP 80 in the cloud firewall to access the site.'
        exit 0
    fi
    sleep 1
done
journalctl -u codename --no-pager -n 30
exit 1
