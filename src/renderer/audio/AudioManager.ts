import { EventEmitter } from 'eventemitter3';
import { Howl, Howler } from 'howler';
// @ts-ignore - chiptune3 lacks official types
import { ChiptuneJsPlayer } from './tracker/chiptune3';

export interface AudioEvents {
  'sound:play': (name: string) => void;
  'sound:stop': (name: string) => void;
  'sound:end': (name: string) => void;
  'music:play': (name: string) => void;
  'music:stop': (name: string) => void;
  'volume:change': (type: 'master' | 'music' | 'sfx', volume: number) => void;
  'sound:spatial': (name: string, x: number, y: number, z: number) => void;
}

interface SoundInstance {
  howl?: Howl;
  trackerPlayer?: ChiptuneJsPlayer;
  id: number;
  name: string;
  isMusic: boolean;
  loop: boolean;
  fadingOut: boolean;
}

interface AudioConfig {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
}

const TRACKER_EXTENSIONS = ['mod', 'xm', 's3m', 'it', 'stm', 'med', 'mtm', '669', 'ult', 'amf'];

class AudioManagerClass extends EventEmitter<AudioEvents> {
  private cache: Map<string, Howl> = new Map();
  private trackerCache: Map<string, string> = new Map();
  private playing: Map<string, SoundInstance[]> = new Map();
  private config: AudioConfig = {
    masterVolume: 1.0,
    musicVolume: 1.0,
    sfxVolume: 1.0,
    muted: false,
  };

  private initialized: boolean = false;
  private trackerPlayer: ChiptuneJsPlayer | null = null;
  private currentTrackerMusic: string | null = null;
  
  public analyzer: AnalyserNode | null = null;

  // ============================================================
  // Initialization
  // ============================================================

  init(): void {
    if (this.initialized) return;
    this.initialized = true;
    Howler.autoUnlock = true;
    
    // Setup Global Analyzer
    this.analyzer = Howler.ctx.createAnalyser();
    this.analyzer.fftSize = 256;
    Howler.masterGain.connect(this.analyzer);
    
    // Initialize chiptune3 player using Howler's audio context
    try {
      this.trackerPlayer = new ChiptuneJsPlayer({
        context: Howler.ctx,
        repeatCount: -1, // loop by default
      });
      
      this.trackerPlayer.onInitialized(() => {
        console.log('Tracker player initialized');
      });
      
      this.trackerPlayer.onEnded(() => {
        if (this.currentTrackerMusic) {
          this.emit('sound:end', this.currentTrackerMusic);
          this.currentTrackerMusic = null;
        }
      });
    } catch (e) {
      console.error('Failed to initialize tracker player:', e);
    }
    
    console.log('AudioManager initialized');
  }

  destroy(): void {
    if (!this.initialized) return;
    this.stopAll();
    this.cache.forEach((howl) => howl.unload());
    this.cache.clear();
    this.trackerCache.clear();
    this.playing.clear();
    if (this.trackerPlayer) {
      this.trackerPlayer.stop();
      this.trackerPlayer = null;
    }
    this.initialized = false;
  }

  // ============================================================
  // Loading
  // ============================================================

  load(name: string, src: string | string[], options?: { preload?: boolean }): any {
    let mainSrc = Array.isArray(src) ? src[0] : src;
    
    // Audio files are served as static assets from the same domain.
    // Only rewrite paths for tracker files or external references.
    // No CORS rewriting needed since files are local.

    if (this.isTrackerFile(mainSrc)) {
      this.trackerCache.set(name, mainSrc);
      return null;
    }

    if (this.cache.has(name)) {
      return this.cache.get(name)!;
    }

    const howl = new Howl({
      src: Array.isArray(src) ? src : [src],
      preload: options?.preload ?? true,
      onloaderror: (_id, error) => {
        console.error(`Failed to load audio "${name}":`, error);
      },
    });

    this.cache.set(name, howl);
    return howl;
  }

  unload(name: string): void {
    const howl = this.cache.get(name);
    if (howl) {
      this.stop(name);
      howl.unload();
      this.cache.delete(name);
    }
    this.trackerCache.delete(name);
  }

  isLoaded(name: string): boolean {
    if (this.trackerCache.has(name)) return true; // assuming always loadable if we have URL
    const howl = this.cache.get(name);
    return howl?.state() === 'loaded';
  }

  private isTrackerFile(url: string): boolean {
    const ext = url.split('.').pop()?.toLowerCase();
    return ext ? TRACKER_EXTENSIONS.includes(ext) : false;
  }

  // ============================================================
  // Sound Playback
  // ============================================================

  playSound(
    name: string,
    options?: {
      volume?: number;
      pitch?: number;
      times?: number;
      loop?: boolean;
    }
  ): number | null {
    if (this.trackerCache.has(name)) {
      console.warn(`Tracker file "${name}" used as sound effect. This is not fully supported yet.`);
      return this.playMusic(name, options);
    }

    const howl = this.cache.get(name);
    if (!howl) {
      console.warn(`Sound "${name}" not loaded`);
      return null;
    }

    const volume = (options?.volume ?? 1.0) * this.config.sfxVolume * this.config.masterVolume;
    const rate = options?.pitch ?? 1.0;
    const loop = options?.loop ?? false;
    const times = options?.times ?? 1;

    howl.volume(this.config.muted ? 0 : volume);
    howl.rate(rate);
    howl.loop(loop || times > 1);

    const id = howl.play();

    if (times > 1 && !loop) {
      let playCount = 1;
      const onEnd = () => {
        playCount++;
        if (playCount >= times) {
          howl.off('end', onEnd);
          howl.loop(false);
        }
      };
      howl.on('end', onEnd);
    }

    this.trackInstance(name, howl, id, false, loop);
    this.emit('sound:play', name);

    howl.once('end', () => {
      this.removeInstance(name, id);
      this.emit('sound:end', name);
    });

    return id;
  }

  // ============================================================
  // Music Playback
  // ============================================================

  playMusic(
    name: string,
    options?: {
      volume?: number;
      pitch?: number;
      loop?: boolean;
      fadeIn?: number;
    }
  ): number | null {
    if (this.trackerCache.has(name)) {
      if (!this.trackerPlayer) {
        console.error('Tracker player not initialized');
        return null;
      }
      
      const url = this.trackerCache.get(name)!;
      this.stopAllMusic(); // Only one tracker music at a time
      
      const effectiveVolume = (options?.volume ?? 1.0) * this.config.musicVolume * this.config.masterVolume;
      this.trackerPlayer.setVol(this.config.muted ? 0 : effectiveVolume);
      this.trackerPlayer.setRepeatCount(options?.loop === false ? 0 : -1);
      if (options?.pitch !== undefined) this.trackerPlayer.setPitch(options.pitch);
      
      this.trackerPlayer.load(url);
      this.currentTrackerMusic = name;
      this.emit('music:play', name);
      return 9999; // Dummy ID for tracker music
    }

    const howl = this.cache.get(name);
    if (!howl) {
      console.warn(`Music "${name}" not loaded`);
      return null;
    }

    const targetVolume = (options?.volume ?? 1.0) * this.config.musicVolume * this.config.masterVolume;
    const rate = options?.pitch ?? 1.0;
    const loop = options?.loop ?? true;
    const fadeIn = options?.fadeIn ?? 0;

    howl.volume(fadeIn > 0 ? 0 : (this.config.muted ? 0 : targetVolume));
    howl.rate(rate);
    howl.loop(loop);

    const id = howl.play();

    if (fadeIn > 0 && !this.config.muted) {
      howl.fade(0, targetVolume, fadeIn, id);
    }

    this.trackInstance(name, howl, id, true, loop);
    this.emit('music:play', name);

    if (!loop) {
      howl.once('end', () => {
        this.removeInstance(name, id);
        this.emit('sound:end', name);
      });
    }

    return id;
  }

  // ============================================================
  // Stop / Fade
  // ============================================================

  stop(name: string): void {
    if (name === this.currentTrackerMusic && this.trackerPlayer) {
      this.trackerPlayer.stop();
      this.currentTrackerMusic = null;
      this.emit('music:stop', name);
      return;
    }

    const instances = this.playing.get(name);
    if (!instances) return;

    for (const instance of instances) {
      instance.howl?.stop(instance.id);
    }
    this.playing.delete(name);
    this.emit('sound:stop', name);
  }

  stopAll(): void {
    this.playing.forEach((_, name) => this.stop(name));
    if (this.currentTrackerMusic) this.stop(this.currentTrackerMusic);
  }

  stopAllMusic(): void {
    this.playing.forEach((instances, name) => {
      const musicInstances = instances.filter((i) => i.isMusic);
      if (musicInstances.length > 0) {
        for (const instance of musicInstances) {
          instance.howl?.stop(instance.id);
          this.removeInstance(name, instance.id);
        }
        this.emit('music:stop', name);
      }
    });
    if (this.currentTrackerMusic) {
      this.stop(this.currentTrackerMusic);
    }
  }

  stopAllSounds(): void {
    this.playing.forEach((instances, name) => {
      const sfxInstances = instances.filter((i) => !i.isMusic);
      if (sfxInstances.length > 0) {
        for (const instance of sfxInstances) {
          instance.howl?.stop(instance.id);
          this.removeInstance(name, instance.id);
        }
        this.emit('sound:stop', name);
      }
    });
  }

  fadeOut(name: string, duration: number): void {
    if (name === this.currentTrackerMusic) {
       // chiptune2/3 doesn't have native fade, we could implement manually but stop for now
       this.stop(name);
       return;
    }
    const instances = this.playing.get(name);
    if (!instances) return;

    for (const instance of instances) {
      if (instance.fadingOut) continue;
      instance.fadingOut = true;
      const currentVolume = instance.howl?.volume(instance.id) as number;
      instance.howl?.fade(currentVolume, 0, duration, instance.id);
      instance.howl?.once('fade', () => {
        instance.howl?.stop(instance.id);
        this.removeInstance(name, instance.id);
      });
    }
  }

  fadeOutAllMusic(duration: number): void {
    this.playing.forEach((instances, name) => {
      const musicInstances = instances.filter((i) => i.isMusic && !i.fadingOut);
      for (const instance of musicInstances) {
        instance.fadingOut = true;
        const currentVolume = instance.howl?.volume(instance.id) as number;
        instance.howl?.fade(currentVolume, 0, duration, instance.id);
        instance.howl?.once('fade', () => {
          instance.howl?.stop(instance.id);
          this.removeInstance(name, instance.id);
        });
      }
    });
    if (this.currentTrackerMusic) {
      this.stop(this.currentTrackerMusic);
    }
  }

  /**
   * Crossfade from current music to a new track.
   * Fades out old music over fadeOutDuration while fading in new music over fadeInDuration.
   */
  crossfadeMusic(newTrack: string, options?: { fadeOutDuration?: number; fadeInDuration?: number; volume?: number; loop?: boolean }): void {
    const fadeOutDuration = options?.fadeOutDuration ?? 1000;
    const fadeInDuration = options?.fadeInDuration ?? 1500;
    const volume = options?.volume ?? 1.0;
    const loop = options?.loop ?? true;

    // Fade out current music
    this.fadeOutAllMusic(fadeOutDuration);

    // Fade in new music
    this.playMusic(newTrack, {
      volume,
      loop,
      fadeIn: fadeInDuration,
    });
  }

  fadeOutAllSounds(duration: number): void {
    this.playing.forEach((instances, name) => {
      const sfxInstances = instances.filter((i) => !i.isMusic && !i.fadingOut);
      for (const instance of sfxInstances) {
        instance.fadingOut = true;
        const currentVolume = instance.howl?.volume(instance.id) as number;
        instance.howl?.fade(currentVolume, 0, duration, instance.id);
        instance.howl?.once('fade', () => {
          instance.howl?.stop(instance.id);
          this.removeInstance(name, instance.id);
        });
      }
    });
  }

  // ============================================================
  // Pause / Resume
  // ============================================================

  pause(name: string): void {
    if (name === this.currentTrackerMusic && this.trackerPlayer) {
      this.trackerPlayer.pause();
      return;
    }
    const instances = this.playing.get(name);
    if (!instances) return;
    for (const instance of instances) {
      instance.howl?.pause(instance.id);
    }
  }

  resume(name: string): void {
    if (name === this.currentTrackerMusic && this.trackerPlayer) {
      this.trackerPlayer.unpause();
      return;
    }
    const instances = this.playing.get(name);
    if (!instances) return;
    for (const instance of instances) {
      instance.howl?.play(instance.id);
    }
  }

  pauseAll(): void {
    this.playing.forEach((instances) => {
      for (const instance of instances) {
        instance.howl?.pause(instance.id);
      }
    });
    if (this.trackerPlayer) this.trackerPlayer.pause();
  }

  resumeAll(): void {
    this.playing.forEach((instances) => {
      for (const instance of instances) {
        instance.howl?.play(instance.id);
      }
    });
    if (this.trackerPlayer) this.trackerPlayer.unpause();
  }

  pauseAllMusic(): void {
    this.playing.forEach((instances) => {
      for (const instance of instances) {
        if (instance.isMusic) {
          instance.howl?.pause(instance.id);
        }
      }
    });
    if (this.trackerPlayer) this.trackerPlayer.pause();
  }

  resumeAllMusic(): void {
    this.playing.forEach((instances) => {
      for (const instance of instances) {
        if (instance.isMusic) {
          instance.howl?.play(instance.id);
        }
      }
    });
    if (this.trackerPlayer) this.trackerPlayer.unpause();
  }

  // ============================================================
  // Volume Control
  // ============================================================

  get masterVolume(): number {
    return this.config.masterVolume;
  }

  set masterVolume(value: number) {
    this.config.masterVolume = Math.max(0, Math.min(1, value));
    this.updateAllVolumes();
    this.emit('volume:change', 'master', this.config.masterVolume);
  }

  get musicVolume(): number {
    return this.config.musicVolume;
  }

  set musicVolume(value: number) {
    this.config.musicVolume = Math.max(0, Math.min(1, value));
    this.updateMusicVolumes();
    this.emit('volume:change', 'music', this.config.musicVolume);
  }

  get sfxVolume(): number {
    return this.config.sfxVolume;
  }

  set sfxVolume(value: number) {
    this.config.sfxVolume = Math.max(0, Math.min(1, value));
    this.updateSfxVolumes();
    this.emit('volume:change', 'sfx', this.config.sfxVolume);
  }

  get muted(): boolean {
    return this.config.muted;
  }

  set muted(value: boolean) {
    this.config.muted = value;
    Howler.mute(value);
    if (this.trackerPlayer) {
      const effectiveVolume = this.config.masterVolume * this.config.musicVolume;
      this.trackerPlayer.setVol(value ? 0 : effectiveVolume);
    }
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  // ============================================================
  // Query State
  // ============================================================

  isPlaying(name: string): boolean {
    if (name === this.currentTrackerMusic) return true; // simplified
    const instances = this.playing.get(name);
    if (!instances || instances.length === 0) return false;
    return instances.some((i) => i.howl?.playing(i.id));
  }

  isAnyMusicPlaying(): boolean {
    if (this.currentTrackerMusic) return true;
    for (const instances of this.playing.values()) {
      for (const instance of instances) {
        if (instance.isMusic && instance.howl?.playing(instance.id)) {
          return true;
        }
      }
    }
    return false;
  }

  isAnySoundPlaying(): boolean {
    for (const instances of this.playing.values()) {
      for (const instance of instances) {
        if (!instance.isMusic && instance.howl?.playing(instance.id)) {
          return true;
        }
      }
    }
    return false;
  }

  getPlayingCount(name: string): number {
    return (this.playing.get(name)?.length ?? 0) + (name === this.currentTrackerMusic ? 1 : 0);
  }

  // ============================================================
  // Spatial Audio (Simple Panning for MMORPG)
  // ============================================================

  updateListener(x: number, y: number, z: number = 0): void {
      if ((Howler as any).pos) {
          (Howler as any).pos(x, y, z);
      }
  }

  playSpatialSound(
    name: string,
    x: number, y: number, z: number = 0,
    options?: { volume?: number, loop?: boolean }
  ): number | null {
      const id = this.playSound(name, options);
      if (id !== null) {
          const howl = this.cache.get(name);
          if (howl && (howl as any).pos) {
              (howl as any).pos(x, y, z, id);
          }
          this.emit('sound:spatial', name, x, y, z);
      }
      return id;
  }

  // ============================================================
  // Private Helpers
  // ============================================================

  private trackInstance(name: string, howl: Howl, id: number, isMusic: boolean, loop: boolean): void {
    if (!this.playing.has(name)) {
      this.playing.set(name, []);
    }
    this.playing.get(name)!.push({
      howl,
      id,
      name,
      isMusic,
      loop,
      fadingOut: false,
    });
  }

  private removeInstance(name: string, id: number): void {
    const instances = this.playing.get(name);
    if (!instances) return;
    const index = instances.findIndex((i) => i.id === id);
    if (index !== -1) {
      instances.splice(index, 1);
    }
    if (instances.length === 0) {
      this.playing.delete(name);
    }
  }

  private updateAllVolumes(): void {
    this.updateMusicVolumes();
    this.updateSfxVolumes();
  }

  private updateMusicVolumes(): void {
    const effectiveVolume = this.config.masterVolume * this.config.musicVolume;
    this.playing.forEach((instances) => {
      for (const instance of instances) {
        if (instance.isMusic && !instance.fadingOut) {
          instance.howl?.volume(effectiveVolume, instance.id);
        }
      }
    });
    if (this.trackerPlayer) {
      this.trackerPlayer.setVol(this.config.muted ? 0 : effectiveVolume);
    }
  }

  private updateSfxVolumes(): void {
    const effectiveVolume = this.config.masterVolume * this.config.sfxVolume;
    this.playing.forEach((instances) => {
      for (const instance of instances) {
        if (!instance.isMusic && !instance.fadingOut) {
          instance.howl?.volume(effectiveVolume, instance.id);
        }
      }
    });
  }
}

export const AudioManager = new AudioManagerClass();
