/**
 * Application-wide configuration constants.
<<<<<<< HEAD
<<<<<<< HEAD
 *
=======
 *
>>>>>>> origin/jules-3-0-10-sanitization-and-editor-updates-534417342975684788
=======
 *
>>>>>>> origin/jules-3-0-9-engine-sync-12991498515375513677
 * Supports production overrides via Vite env vars so the static web shell can
 * point at a dedicated websocket/backend host without code changes.
 */

<<<<<<< HEAD
<<<<<<< HEAD
const env =
	(typeof import.meta !== "undefined" ? (import.meta as any).env : undefined) ??
	{};
const isProd = !!env.PROD;
const envServerUrl =
	typeof env.VITE_SERVER_URL === "string" ? env.VITE_SERVER_URL.trim() : "";
const envBigDataUrl =
	typeof env.VITE_BIG_DATA_URL === "string" ? env.VITE_BIG_DATA_URL.trim() : "";
=======
=======
>>>>>>> origin/jules-3-0-9-engine-sync-12991498515375513677
const env = (typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined) ?? {};
const isProd = !!env.PROD;
const envServerUrl = typeof env.VITE_SERVER_URL === 'string' ? env.VITE_SERVER_URL.trim() : '';
const envBigDataUrl = typeof env.VITE_BIG_DATA_URL === 'string' ? env.VITE_BIG_DATA_URL.trim() : '';
<<<<<<< HEAD
>>>>>>> origin/jules-3-0-10-sanitization-and-editor-updates-534417342975684788
=======
>>>>>>> origin/jules-3-0-9-engine-sync-12991498515375513677

/**
 * The WebSocket / backend URL for multiplayer functionality.
 * - Dev default: http://localhost:6065
 * - Prod default: https://ws.bobsgame.com
 * - Override: VITE_SERVER_URL=https://ws.bobsgame.com (or another backend origin)
 */
<<<<<<< HEAD
<<<<<<< HEAD
export const SERVER_URL =
	envServerUrl ||
	(isProd ? "https://ws.bobsgame.com" : "http://localhost:6065");
=======
export const SERVER_URL = envServerUrl || (isProd
    ? 'https://ws.bobsgame.com'
    : 'http://localhost:6065');
>>>>>>> origin/jules-3-0-10-sanitization-and-editor-updates-534417342975684788
=======
export const SERVER_URL = envServerUrl || (isProd
    ? 'https://ws.bobsgame.com'
    : 'http://localhost:6065');
>>>>>>> origin/jules-3-0-9-engine-sync-12991498515375513677

/**
 * The current application version string.
 * Should be kept in sync with VERSION.md and CHANGELOG.md.
 */
<<<<<<< HEAD
<<<<<<< HEAD
export const APP_VERSION = "3.0.10";
=======
export const APP_VERSION = "3.0.9";
>>>>>>> origin/jules-3-0-10-sanitization-and-editor-updates-534417342975684788
=======
export const APP_VERSION = "3.0.9";
>>>>>>> origin/jules-3-0-9-engine-sync-12991498515375513677

/**
 * Base URL for large assets (sprites, maps, audio).
 * In production, fetched from S3 unless overridden.
 */
<<<<<<< HEAD
<<<<<<< HEAD
export const BIG_DATA_URL = envBigDataUrl || (isProd ? "/z/" : "/");
=======
export const BIG_DATA_URL = envBigDataUrl || (isProd
    ? '/z/'
    : '/');
>>>>>>> origin/jules-3-0-10-sanitization-and-editor-updates-534417342975684788
=======
export const BIG_DATA_URL = envBigDataUrl || (isProd
    ? '/z/'
    : '/');
>>>>>>> origin/jules-3-0-9-engine-sync-12991498515375513677
