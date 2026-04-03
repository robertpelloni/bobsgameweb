#!/bin/bash

# Omni-Engine Deployment Script for bobsgame.com

USER="robertpelloni"
HOST="pdx1-shared-a1-33.dreamhost.com"
REMOTE_PATH="~/bobsgame.com/"

echo "=== Starting Deployment to bobsgame.com ==="

# 1. Build
echo "[1/3] Building production assets..."
npm run build

# 2. Upload static files
echo "[2/3] Uploading static files to $HOST..."
# Using rsync to efficiently transfer only changed files
rsync -avz dist/renderer/ $USER@$HOST:$REMOTE_PATH

# 3. Upload server files
echo "[3/3] Uploading multiplayer server logic..."
rsync -avz server/ $USER@$HOST:${REMOTE_PATH}server/

echo "=== Deployment Complete! ==="
echo "Note: If this is the first deploy, you may need to SSH in and run 'npm install' in the server directory."
