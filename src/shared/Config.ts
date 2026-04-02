/**
 * Application-wide configuration constants.
 * 
 * Server URLs are determined by the build mode (dev vs production).
 * In development, connects to localhost. In production, connects to bobsgame.com.
 */

// Determine if we're in production mode (Vite sets import.meta.env.PROD)
const isProd = typeof import.meta !== 'undefined' && (import.meta as any).env?.PROD;

/**
 * The WebSocket server URL for multiplayer functionality.
 * - Dev: http://localhost:6065
 * - Production: https://bobsgame.com (using the same port behind a reverse proxy)
 */
export const SERVER_URL = isProd
    ? 'https://bobsgame.com'
    : 'http://localhost:6065';

/**
 * The current application version string.
 * Should be kept in sync with VERSION.md and CHANGELOG.md.
 */
export const APP_VERSION = '2.1.0';

/**
 * Base URL for large assets (sprites, maps, audio).
 * In production, fetched from S3. In dev, served locally from /data.
 */
export const BIG_DATA_URL = isProd
    ? 'https://bobsgame.s3.amazonaws.com/z/'
    : '/';
