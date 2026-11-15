/**
 * OptionsScene — Backwards-compatible alias for the unified `SettingsScene`.
 *
 * All Graphics (WebGPU, HQ2X HD Sprites, Pixel-Perfect), Audio Mixer, Puzzle
 * Ghost Piece, Touch HUD, Haptics, and Profile controls have been consolidated
 * onto `SettingsScene` so users never have to navigate multi-level settings
 * subpages. Existing callers importing `OptionsScene` receive the unified page.
 */
import { SettingsScene, type SettingsSceneConfig } from "./SettingsScene";

export type OptionsSceneConfig = SettingsSceneConfig;

export class OptionsScene extends SettingsScene {}
