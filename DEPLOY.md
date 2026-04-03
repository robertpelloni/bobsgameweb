# Deployment Guide: bobsgame.com

The Omni-Engine web port is ready for deployment to DreamHost.

## 1. Prerequisites
- `sshpass` installed (for automated password entry) or SSH keys configured.
- `rsync` installed on your local machine.

## 2. Automated Deployment
Run the following command from the `bobsgameweb` directory:

```bash
./scripts/deploy.sh
```

## 3. Manual Deployment Steps
If you prefer manual deployment:

1.  **Build the project:**
    ```bash
    npm run build
    ```
2.  **Transfer files via SCP/RSYNC:**
    ```bash
    rsync -avz dist/renderer/ robertpelloni@pdx1-shared-a1-33.dreamhost.com:~/bobsgame.com/
    ```
3.  **Deploy the Multiplayer Server:**
    ```bash
    rsync -avz server/ robertpelloni@pdx1-shared-a1-33.dreamhost.com:~/bobsgame.com/server/
    ssh robertpelloni@pdx1-shared-a1-33.dreamhost.com "cd ~/bobsgame.com/server && npm install && pm2 restart index.js"
    ```

## 4. Server Configuration
Ensure your DreamHost panel is configured to:
- Point `bobsgame.com` to `~/bobsgame.com/`.
- Allow WebSocket connections (usually enabled by default on shared hosting, but might require a Passenger or Node setup).
