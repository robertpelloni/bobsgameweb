/**
 * Application-wide configuration constants.
 * 
 * Supports production overrides via Vite env vars so the static web shell can
 * point at a dedicated websocket/backend host without code changes.
 */

const env = (typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined) ?? {};
const isProd = !!env.PROD;
const envServerUrl = typeof env.VITE_SERVER_URL === 'string' ? env.VITE_SERVER_URL.trim() : '';
const envBigDataUrl = typeof env.VITE_BIG_DATA_URL === 'string' ? env.VITE_BIG_DATA_URL.trim() : '';

/**
 * The WebSocket / backend URL for multiplayer functionality.
 * - Dev default: http://localhost:6065
 * - Prod default: https://ws.bobsgame.com
 * - Override: VITE_SERVER_URL=https://ws.bobsgame.com (or another backend origin)
 */
export const SERVER_URL = envServerUrl || (isProd
    ? 'https://ws.bobsgame.com'
    : 'http://localhost:6065');

/**
 * The current application version string.
 * Should be kept in sync with VERSION.md and CHANGELOG.md.
 */
export const APP_VERSION = '2.1.48';

/**
 * Base URL for large assets (sprites, maps, audio).
 * In production, fetched from S3 unless overridden.
 */
export const BIG_DATA_URL = envBigDataUrl || (isProd
    ? 'https://bobsgame.s3.amazonaws.com/z/'
    : '/');
