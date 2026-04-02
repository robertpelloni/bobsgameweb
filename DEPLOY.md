# Deployment Guide: bobsgameweb

This guide outlines the steps to deploy the web port to `bobsgame.com`.

## 1. Prerequisites
- Node.js 20+
- A server with Docker support or a static file host (e.g., Netlify, Vercel, or custom VPS).

## 2. Build the Web Client
Run the following commands in the `bobsgameweb/` directory:
```bash
npm install
npm run build
```
The output will be in `dist/renderer/`. These files should be uploaded to your static file host (e.g., the root of `bobsgame.com`).

## 3. Deploy the Socket.io Server
The multiplayer server is located in `bobsgameweb/server/`. You can deploy it using Docker:

### Using Docker
```bash
cd server
docker build -t bobsgame-server .
docker run -d -p 6065:6065 --name bobsgame-server bobsgame-server
```

### Manual Deployment
```bash
cd server
npm install
npm start
```
Ensure that port `6065` is open on your firewall.

## 4. Environment Configuration
- **Client:** The client is configured to connect to `bobsgame.com:6065` in production. If your server is on a different domain, update `src/renderer/puzzle/BobNet.ts`.
- **Assets:** The client is configured to fetch assets from the S3 bucket: `https://bobsgame.s3.amazonaws.com/z/`. Ensure your CORS settings on S3 allow requests from `bobsgame.com`.

## 5. Continuous Deployment (Recommended)
Consider setting up a GitHub Action to automate the build and deployment process.
