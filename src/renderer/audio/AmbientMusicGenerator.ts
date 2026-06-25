/**
 * AmbientMusicGenerator — Creates simple ambient tones for room atmosphere
 *
 * Uses the Web Audio API to generate soft ambient pads
 * that match the room's mood:
 * - Interior rooms: warm, soft pad
 * - Exterior: bright, open tone
 * - Underground: deep, resonant hum
 * - School: gentle drone
 *
 * All oscillators use 'sine' type to avoid harsh buzzing.
 * Volume is kept very low (0.06) for subtle atmosphere.
 */

export type RoomMood =
	| "interior"
	| "exterior"
	| "underground"
	| "school"
	| "hospital"
	| "sinister";

export class AmbientMusicGenerator {
	private ctx: AudioContext | null = null;
	private masterGain: GainNode | null = null;
	private oscillators: OscillatorNode[] = [];
	private isPlaying = false;

	/** Initialize the audio context */
	private ensureContext(): AudioContext {
		if (!this.ctx) {
			this.ctx = new AudioContext();
			this.masterGain = this.ctx.createGain();
			this.masterGain.gain.value = 0;
			this.masterGain.connect(this.ctx.destination);
		}
		return this.ctx;
	}

	/** Determine mood from map name */
	static getMoodFromMapName(mapName: string): RoomMood {
		const n = mapName.toUpperCase();
		if (n.includes("BASEMENT") || n.includes("UNDERGROUND"))
			return "underground";
		if (n.includes("SCHOOL")) return "school";
		if (n.includes("HOSPITAL") || n.includes("LAB")) return "hospital";
		if (n.includes("POLICE") || n.includes("PRISON")) return "sinister";
		if (
			n.includes("OUTSIDE") ||
			n.includes("NEIGHBOR") ||
			n.includes("TOWN") ||
			n.includes("FOREST")
		)
			return "exterior";
		return "interior";
	}

	/** Start ambient music for a given mood */
	play(mood: RoomMood, volume: number = 0.06): void {
		this.stop();
		const ctx = this.ensureContext();
		if (ctx.state === "suspended") ctx.resume();

		// Define note frequencies for each mood — all use sine to avoid buzzing
		const configs: Record<RoomMood, { notes: number[]; detune: number }> = {
			interior: { notes: [130.81, 196.0, 261.63, 329.63], detune: 3 }, // C3, G3, C4, E4 - warm major
			exterior: { notes: [196.0, 293.66, 392.0, 493.88], detune: 5 }, // G3, D4, G4, B4 - bright open
			underground: { notes: [65.41, 98.0, 130.81], detune: 2 }, // C2, G2, C3 - deep drone
			school: { notes: [146.83, 220.0, 293.66], detune: 1 }, // D3, A3, D4 - gentle
			hospital: { notes: [164.81, 246.94, 329.63], detune: 0 }, // E3, B3, E4 - sterile
			sinister: { notes: [123.47, 185.0, 246.94, 311.13], detune: 4 }, // B2, Gb3, B3, Eb4 - diminished
		};

		const config = configs[mood] || configs.interior;

		for (const freq of config.notes) {
			const osc = ctx.createOscillator();
			osc.type = "sine"; // Always sine — avoids harsh buzzing from square/sawtooth
			osc.frequency.value = freq;
			osc.detune.value = (Math.random() - 0.5) * config.detune * 10;

			// Per-oscillator gain (very quiet)
			const gain = ctx.createGain();
			gain.gain.value = volume / config.notes.length;

			// Low-pass filter for warmth — cuts harsh harmonics
			const filter = ctx.createBiquadFilter();
			filter.type = "lowpass";
			filter.frequency.value = 600; // Lower cutoff to prevent any harshness
			filter.Q.value = 0.5;

			osc.connect(filter);
			filter.connect(gain);
			gain.connect(this.masterGain!);
			osc.start();
			this.oscillators.push(osc);
		}

		// Fade in slowly
		this.masterGain!.gain.setTargetAtTime(1.0, ctx.currentTime, 3.0);
		this.isPlaying = true;
	}

	/** Stop ambient music with fade out */
	stop(): void {
		if (!this.ctx || !this.isPlaying) return;

		// Fade out
		this.masterGain?.gain.setTargetAtTime(0, this.ctx.currentTime, 1.0);

		// Stop oscillators after fade
		const oscs = [...this.oscillators];
		this.oscillators = [];
		this.isPlaying = false;
		setTimeout(() => {
			for (const osc of oscs) {
				try {
					osc.stop();
				} catch {
					/* oscillator may already be stopped */
				}
			}
		}, 3000);
	}

	/** Set volume */
	setVolume(vol: number): void {
		if (this.masterGain) {
			this.masterGain.gain.setTargetAtTime(
				vol,
				this.ensureContext().currentTime,
				0.5,
			);
		}
	}
}
