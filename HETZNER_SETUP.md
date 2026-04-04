# Hetzner Backend Setup Guide

This guide assumes:
- static frontend stays on `bobsgame.com`
- backend runs on a Hetzner Ubuntu server
- backend public hostname will be `ws.bobsgame.com`
- nginx reverse proxies to the Node/Socket.io process on localhost `127.0.0.1:6065`

## 1. Provision the server
Recommended starting size:
- 2 vCPU
- 8 GB RAM
- 80 GB disk

Recommended OS:
- Ubuntu 24.04 LTS

## 2. DNS
Create an `A` record:
- `ws.bobsgame.com` → your Hetzner server IP

Wait until DNS resolves before attempting TLS.

## 3. Fast Bootstrap Option
A bootstrap helper is now included:
- `server/ops/bootstrap-ubuntu.sh`

You can run it on the VPS as root/sudo to install the core base packages and Node 20:

```bash
bash bootstrap-ubuntu.sh
```

## 4. Manual Base Packages / Node 20
If you prefer doing it manually:

```bash
sudo apt update
sudo apt install -y nginx curl git ufw
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

## 5. Create service user and app directory
```bash
sudo useradd --system --create-home --shell /usr/sbin/nologin bobsgame || true
sudo mkdir -p /opt/bobsgameweb
sudo chown -R $USER:$USER /opt/bobsgameweb
```

## 6. Upload backend files
Copy `bobsgameweb/server/` to:
- `/opt/bobsgameweb/server`

A deploy helper is now included locally:
- `scripts/deploy-backend-vps.sh`

Typical usage:

```bash
BACKEND_HOST=ws.bobsgame.com BACKEND_USER=root BACKEND_INSTALL_DEPS=1 ./scripts/deploy-backend-vps.sh
```

At minimum that directory should contain:
- `index.js`
- `app.js`
- `package.json`
- `package-lock.json`
- `.env.example`
- `ecosystem.config.cjs`
- `ops/`

## 7. Install backend dependencies
```bash
cd /opt/bobsgameweb/server
npm install --omit=dev
```

## 8. Systemd service
Copy:
- `server/ops/systemd/bobsgameweb-server.service`

to:
- `/etc/systemd/system/bobsgameweb-server.service`

Then reload and start:

```bash
sudo cp ops/systemd/bobsgameweb-server.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable bobsgameweb-server
sudo systemctl start bobsgameweb-server
sudo systemctl status bobsgameweb-server
```

## 9. Nginx reverse proxy
Copy:
- `server/ops/nginx/ws.bobsgame.com.conf`

to:
- `/etc/nginx/sites-available/ws.bobsgame.com`

Then enable it:

```bash
sudo cp ops/nginx/ws.bobsgame.com.conf /etc/nginx/sites-available/ws.bobsgame.com
sudo ln -sf /etc/nginx/sites-available/ws.bobsgame.com /etc/nginx/sites-enabled/ws.bobsgame.com
sudo nginx -t
sudo systemctl reload nginx
```

## 10. Firewall
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## 11. Smoke tests before TLS
From your local machine:

```bash
curl -i http://ws.bobsgame.com/
curl -i http://ws.bobsgame.com/healthz
curl -i "http://ws.bobsgame.com/socket.io/?EIO=4&transport=polling"
```

Expected:
- `/` → 200 plain text
- `/healthz` → JSON with `ok: true`
- `/socket.io/...` → Socket.io response, not nginx or app 404

## 12. TLS with Let's Encrypt
Once HTTP is working:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d ws.bobsgame.com
```

Then retest:

```bash
curl -i https://ws.bobsgame.com/healthz
```

## 13. Rebuild frontend against the backend host
On your local machine:

```bash
cd bobsgameweb
VITE_SERVER_URL=https://ws.bobsgame.com npm run build
```

Then redeploy the static frontend to DreamHost.

## 14. Final production test
- open `https://bobsgame.com`
- verify browser network requests target `https://ws.bobsgame.com`
- test lobby creation / leaderboard / multiplayer handshake

## Troubleshooting
### `502 Bad Gateway`
- backend process probably not running
- check:
  ```bash
  sudo systemctl status bobsgameweb-server
  journalctl -u bobsgameweb-server -n 100 --no-pager
  ```

### `/healthz` works but websocket fails
- usually nginx websocket headers or upstream binding issue
- confirm nginx config matches the provided sample

### CORS / connection refused
- verify `ALLOWED_ORIGIN=https://bobsgame.com`
- verify backend is listening on `127.0.0.1:6065` or expected host/port
