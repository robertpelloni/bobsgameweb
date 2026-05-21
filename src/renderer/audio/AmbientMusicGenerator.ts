/**
 * AmbientMusicGenerator — Creates simple ambient tones for room atmosphere
 *
 * Uses the Web Audio API to generate soft ambient pads
 * that match the room's mood:
 * - Interior rooms: warm, soft pad
 * - Exterior: bright, open tone
 * - Underground: deep, resonant hum
 * - School: institutional drone
 */

export type RoomMood = 'interior' | 'exterior' | 'underground' | 'school' | 'hospital' | 'sinister';

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
    if (n.includes('BASEMENT') || n.includes('UNDERGROUND')) return 'underground';
    if (n.includes('SCHOOL')) return 'school';
    if (n.includes('HOSPITAL') || n.includes('LAB')) return 'hospital';
    if (n.includes('POLICE') || n.includes('PRISON')) return 'sinister';
    if (n.includes('OUTSIDE') || n.includes('NEIGHBOR') || n.includes('TOWN') || n.includes('FOREST')) return 'exterior';
    return 'interior';
  }

  /** Start ambient music for a given mood */
  play(mood: RoomMood, volume: number = 0.15): void {
    this.stop();
    const ctx = this.ensureContext();
    if (ctx.state === 'suspended') ctx.resume();

    // Define note frequencies for each mood
    const configs: Record<RoomMood, { notes: number[]; type: OscillatorType; detune: number }> = {
      interior: {
        notes: [130.81, 196.00, 261.63, 329.63], // C3, G3, C4, E4 - warm major chord
        type: 'sine',
        detune: 3,
      },
      exterior: {
        notes: [196.00, 293.66, 392.00, 493.88], // G3, D4, G4, B4 - bright open
        type: 'sine',
        detune: 5,
      },
      underground: {
        notes: [65.41, 98.00, 130.81], // C2, G2, C3 - deep drone
        type: 'triangle',
        detune: 2,
      },
      school: {
        notes: [146.83, 220.00, 293.66], // D3, A3, D4 - institutional
        type: 'square',
        detune: 1,
      },
      hospital: {
        notes: [164.81, 246.94, 329.63], // E3, B3, E4 - sterile
        type: 'sine',
        detune: 0,
      },
      sinister: {
        notes: [123.47, 185.00, 246.94, 311.13], // B2, Gb3, B3, Eb4 - diminished
        type: 'sawtooth',
        detune: 4,
      },
    };

    const config = configs[mood] || configs.interior;

    // Create oscillators for each note
    for (const freq of config.notes) {
      const osc = ctx.createOscillator();
      osc.type = config.type;
      osc.frequency.value = freq;
      osc.detune.value = (Math.random() - 0.5) * config.detune * 10;

      // Per-oscillator gain (very quiet)
      const gain = ctx.createGain();
      gain.gain.value = volume / config.notes.length;

      // Low-pass filter for warmth
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 800;
      filter.Q.value = 0.5;

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);

      osc.start();
      this.oscillators.push(osc);
    }

    // Fade in
    this.masterGain!.gain.setTargetAtTime(1.0, ctx.currentTime, 2.0);
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
        try { osc.stop(); } catch {}
      }
    }, 3000);
  }

  /** Set volume */
  setVolume(vol: number): void {
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(vol, this.ensureContext().currentTime, 0.5);
    }
  }

  destroy(): void {
    this.stop();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}
