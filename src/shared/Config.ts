/**
 * Application-wide configuration constants.
 *
 * Supports production overrides via Vite env vars so the static web shell can
 * point at a dedicated websocket/backend host without code changes.
 */

const env =
	(typeof import.meta !== "undefined" ? (import.meta as any).env : undefined) ??
	{};
const isProd = !!env.PROD;
const envServerUrl =
	typeof env.VITE_SERVER_URL === "string" ? env.VITE_SERVER_URL.trim() : "";
const envBigDataUrl =
	typeof env.VITE_BIG_DATA_URL === "string" ? env.VITE_BIG_DATA_URL.trim() : "";

/**
 * The WebSocket / backend URL for multiplayer functionality.
 * - Dev default: http://localhost:6065
 * - Prod default: https://ws.bobsgame.com
 * - Override: VITE_SERVER_URL=https://ws.bobsgame.com (or another backend origin)
 */
export const SERVER_URL =
	envServerUrl ||
	(isProd ? "https://ws.bobsgame.com" : "http://localhost:6065");

declare const __APP_VERSION__: string | undefined;

/**
 * The current application version string.
 *
 * Dynamically injected at build/dev time by `vite.config.ts` directly from
 * `VERSION.md` (single source of truth), with a safe static fallback when
 * imported outside Vite (e.g., direct `tsx` unit tests or Electron `tsc -p`).
 */
export const APP_VERSION: string =
	typeof __APP_VERSION__ !== "undefined" && __APP_VERSION__
		? __APP_VERSION__
		: "3.0.34";

/**
 * Base URL for large assets (sprites, maps, audio).
 * In production, fetched from S3 unless overridden.
 */
export const BIG_DATA_URL = envBigDataUrl || (isProd ? "/z/" : "/");
