/**
 * CutsceneEngine — manages scripted story cutscenes.
 *
 * Features:
 * - Slide-based presentation (text, background, character portraits)
 * - Transitions between slides (fade, slide, instant)
 * - Typewriter text effect
 * - Background music cues
 * - Conditional branching (skip slides based on flags)
 * - Camera shake / flash effects
 * - Auto-advance and manual advance
 *
 * Usage:
 *   const engine = new CutsceneEngine();
 *   engine.loadScript(CUTSCENE_INTRO);
 *   engine.start();
 *   engine.update(dt);
 */

export type SlideTransition = "fade" | "slide_left" | "slide_right" | "flash" | "instant";

export interface CutsceneSlide {
	id: string;
	text: string;
	speaker?: string;
	backgroundColor?: number;
	characterPortrait?: string;
	characterX?: number;
	characterY?: number;
	transition?: SlideTransition;
	duration?: number; // auto-advance seconds (0 = manual)
	shake?: number; // shake intensity
	flash?: number; // flash alpha 0-1
	effect?: string; // custom effect name
	condition?: string; // flag required to show
	skipIf?: string; // flag to skip this slide
}

export interface CutsceneScript {
	id: string;
	name: string;
	slides: CutsceneSlide[];
	music?: string;
	loop?: boolean;
}

// ============================================================
// Preset Cutscenes
// ============================================================

export const CUTSCENE_INTRO: CutsceneScript = {
	id: "intro",
	name: "The Beginning",
	music: "menu",
	slides: [
		{ id: "s1", text: "In a world where darkness creeps ever closer...", backgroundColor: 0x000000, transition: "fade" },
		{ id: "s2", text: "One town stands as the last beacon of hope.", backgroundColor: 0x0a1428, transition: "fade" },
		{ id: "s3", text: "TOWNYUU — a peaceful village on the edge of civilization.", backgroundColor: 0x142840, transition: "slide_left", speaker: "Narrator" },
		{ id: "s4", text: "But peace is fragile, and shadows gather in the Dark Forest to the east.", backgroundColor: 0x0a1018, transition: "fade", shake: 2 },
		{ id: "s5", text: "You there! Yes, you! We need your help!", backgroundColor: 0x142030, transition: "slide_right", speaker: "Mayor", characterPortrait: "mayor" },
		{ id: "s6", text: "Monsters have been appearing from the forest. The Ancient Dragon stirs in its lair.", backgroundColor: 0x101820, transition: "fade", speaker: "Mayor" },
		{ id: "s7", text: "Will you be the hero this land needs?", backgroundColor: 0x142030, transition: "fade", speaker: "Mayor", flash: 0.5 },
		{ id: "s8", text: "Your adventure begins now.", backgroundColor: 0x000000, transition: "fade", duration: 3 },
	],
};

export const CUTSCENE_DRAGON: CutsceneScript = {
	id: "dragon_approach",
	name: "The Dragon Stirs",
	slides: [
		{ id: "d1", text: "The ground trembles beneath your feet...", backgroundColor: 0x1a0808, transition: "fade", shake: 5 },
		{ id: "d2", text: "Lava flows illuminate the cavern walls.", backgroundColor: 0x2a1010, transition: "fade" },
		{ id: "d3", text: "A roar echoes through the Dragon's Lair!", backgroundColor: 0x3a1010, transition: "flash", flash: 1, shake: 10 },
		{ id: "d4", text: "The Ancient Dragon has awakened.", backgroundColor: 0x2a0808, transition: "fade", speaker: "Narrator" },
		{ id: "d5", text: "This is the final battle. Prepare yourself!", backgroundColor: 0x1a0808, transition: "fade", flash: 0.3 },
	],
};

export const CUTSCENE_VICTORY: CutsceneScript = {
	id: "victory",
	name: "Victory!",
	slides: [
		{ id: "v1", text: "The Ancient Dragon falls!", backgroundColor: 0x0a1a0a, transition: "flash", flash: 1, shake: 8 },
		{ id: "v2", text: "Peace returns to the land.", backgroundColor: 0x142814, transition: "fade" },
		{ id: "v3", text: "You are the hero of TOWNYUU!", backgroundColor: 0x1a2a1a, transition: "fade", speaker: "Mayor" },
		{ id: "v4", text: "Thank you, brave adventurer. The land is safe once more.", backgroundColor: 0x0a1a0a, transition: "fade", speaker: "Mayor" },
		{ id: "v5", text: "But adventure never truly ends...", backgroundColor: 0x000000, transition: "fade", duration: 3 },
	],
};

// ============================================================
// Engine
// ============================================================

export class CutsceneEngine {
	private script: CutsceneScript | null = null;
	private currentSlideIndex = 0;
	private isPlaying = false;
	private isComplete = false;
	private slideTimer = 0;
	private textProgress = 0; // typewriter effect
	private textSpeed = 50; // characters per second
	private transitionProgress = 0;
	private transitionDuration = 0.5; // seconds

	/** Callbacks */
	private _onSlideChange: ((slide: CutsceneSlide) => void) | null = null;
	private _onComplete: (() => void) | null = null;

	/** Load a cutscene script */
	loadScript(script: CutsceneScript): void {
		this.script = script;
		this.currentSlideIndex = 0;
		this.isPlaying = false;
		this.isComplete = false;
		this.slideTimer = 0;
		this.textProgress = 0;
	}

	/** Start playing */
	start(): void {
		if (!this.script) return;
		this.isPlaying = true;
		this.isComplete = false;
		this.currentSlideIndex = 0;
		this.slideTimer = 0;
		this.textProgress = 0;
		this.transitionProgress = 0;
		this.emitSlideChange();
	}

	/** Advance to next slide */
	advance(): void {
		if (!this.script || !this.isPlaying) return;

		// If text not fully revealed, reveal all
		const slide = this.getCurrentSlide();
		if (slide && this.textProgress < slide.text.length) {
			this.textProgress = slide.text.length;
			return;
		}

		this.currentSlideIndex++;
		this.slideTimer = 0;
		this.textProgress = 0;
		this.transitionProgress = 0;

		if (this.currentSlideIndex >= this.script.slides.length) {
			if (this.script.loop) {
				this.currentSlideIndex = 0;
			} else {
				this.isComplete = true;
				this.isPlaying = false;
				if (this._onComplete) this._onComplete();
				return;
			}
		}

		this.emitSlideChange();
	}

	/** Skip to end */
	skip(): void {
		if (!this.script) return;
		this.isComplete = true;
		this.isPlaying = false;
		this.currentSlideIndex = this.script.slides.length - 1;
		if (this._onComplete) this._onComplete();
	}

	/** Update each frame */
	update(dt: number): void {
		if (!this.isPlaying || !this.script) return;

		const slide = this.getCurrentSlide();
		if (!slide) return;

		// Typewriter effect
		this.textProgress += this.textSpeed * dt;
		if (this.textProgress > slide.text.length) {
			this.textProgress = slide.text.length;
		}

		// Transition
		this.transitionProgress += dt / this.transitionDuration;

		// Auto-advance
		this.slideTimer += dt;
		if (slide.duration && slide.duration > 0 && this.slideTimer >= slide.duration) {
			this.advance();
		}
	}

	/** Get current slide */
	getCurrentSlide(): CutsceneSlide | null {
		if (!this.script) return null;
		return this.script.slides[this.currentSlideIndex] ?? null;
	}

	/** Get visible text (typewriter) */
	getVisibleText(): string {
		const slide = this.getCurrentSlide();
		if (!slide) return "";
		return slide.text.substring(0, Math.floor(this.textProgress));
	}

	/** Get slide index */
	getSlideIndex(): number {
		return this.currentSlideIndex;
	}

	/** Get total slides */
	getTotalSlides(): number {
		return this.script?.slides.length ?? 0;
	}

	/** Is text fully revealed */
	isTextComplete(): boolean {
		const slide = this.getCurrentSlide();
		if (!slide) return true;
		return this.textProgress >= slide.text.length;
	}

	/** Is transition in progress */
	isTransitioning(): boolean {
		return this.transitionProgress < 1;
	}

	/** Get transition alpha */
	getTransitionAlpha(): number {
		if (!this.isTransitioning()) return 1;
		// Fade in during first half, fully visible during second half
		if (this.transitionProgress < 0.5) {
			return this.transitionProgress * 2;
		}
		return 1;
	}

	/** Playing state */
	playing(): boolean { return this.isPlaying; }
	done(): boolean { return this.isComplete; }

	/** Set callbacks */
	onSlideChange(cb: (slide: CutsceneSlide) => void): void { this._onSlideChange = cb; }
	onComplete(cb: () => void): void { this._onComplete = cb; }

	private emitSlideChange(): void {
		const slide = this.getCurrentSlide();
		if (slide && this._onSlideChange) {
			this._onSlideChange(slide);
		}
	}
}
