# Hetzner Backend Hardening Checklist

Use this after the backend is functional on the VPS.

## Base OS
- [ ] SSH key auth is enabled
- [ ] password SSH is disabled if no longer needed
- [ ] root login is disabled or tightly controlled after setup
- [ ] system packages are updated
- [ ] unattended upgrades considered if desired

## Firewall / Network
- [ ] only ports 22, 80, and 443 are exposed publicly
- [ ] backend Node process listens only on localhost (`127.0.0.1:6065`) when using nginx
- [ ] `ufw status` looks correct

## TLS / Proxy
- [ ] HTTPS works for `ws.bobsgame.com`
- [ ] HTTP redirects to HTTPS
- [ ] HSTS enabled if appropriate
- [ ] `/healthz` works over HTTPS
- [ ] `/socket.io/?EIO=4&transport=polling` works over HTTPS

## Backend Process
- [ ] systemd service is enabled
- [ ] service restarts automatically after reboot
- [ ] service user is non-login (`bobsgame`)
- [ ] journal shows no crash loop
- [ ] `ALLOWED_ORIGIN=https://bobsgame.com`

## Files / Ownership
- [ ] app files live under `/opt/bobsgameweb`
- [ ] service user owns only what it must write
- [ ] backups/rollback plan exists for backend files and config

## Final Checks
- [ ] `POST_DEPLOY_CHECKLIST.md` completed
- [ ] `BACKEND_RECOVERY.md` reviewed and available
