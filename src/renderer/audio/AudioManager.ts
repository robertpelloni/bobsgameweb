import { EventEmitter } from 'eventemitter3';
import { Howl, Howler } from 'howler';

export interface AudioEvents {
  'sound:play': (name: string) => void;
  'sound:stop': (name: string) => void;
  'sound:end': (name: string) => void;
  'music:play': (name: string) => void;
  'music:stop': (name: string) => void;
  'volume:change': (type: 'master' | 'music' | 'sfx', volume: number) => void;
}

interface SoundInstance {
  howl: Howl;
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

class AudioManagerClass extends EventEmitter<AudioEvents> {
  private cache: Map<string, Howl> = new Map();
  private playing: Map<string, SoundInstance[]> = new Map();
  private config: AudioConfig = {
    masterVolume: 1.0,
    musicVolume: 1.0,
    sfxVolume: 1.0,
    muted: false,
  };

  private initialized: boolean = false;

  // ============================================================
  // Initialization
  // ============================================================

  init(): void {
    if (this.initialized) return;
    this.initialized = true;
    Howler.autoUnlock = true;
    console.log('AudioManager initialized');
  }

  destroy(): void {
    if (!this.initialized) return;
    this.stopAll();
    this.cache.forEach((howl) => howl.unload());
    this.cache.clear();
    this.playing.clear();
    this.initialized = false;
  }

  // ============================================================
  // Loading
  // ============================================================

  load(name: string, src: string | string[], options?: { preload?: boolean }): Howl {
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
  }

  isLoaded(name: string): boolean {
    const howl = this.cache.get(name);
    return howl?.state() === 'loaded';
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
    const instances = this.playing.get(name);
    if (!instances) return;

    for (const instance of instances) {
      instance.howl.stop(instance.id);
    }
    this.playing.delete(name);
    this.emit('sound:stop', name);
  }

  stopAll(): void {
    this.playing.forEach((_, name) => this.stop(name));
  }

  stopAllMusic(): void {
    this.playing.forEach((instances, name) => {
      const musicInstances = instances.filter((i) => i.isMusic);
      if (musicInstances.length > 0) {
        for (const instance of musicInstances) {
          instance.howl.stop(instance.id);
          this.removeInstance(name, instance.id);
        }
        this.emit('music:stop', name);
      }
    });
  }

  stopAllSounds(): void {
    this.playing.forEach((instances, name) => {
      const sfxInstances = instances.filter((i) => !i.isMusic);
      if (sfxInstances.length > 0) {
        for (const instance of sfxInstances) {
          instance.howl.stop(instance.id);
          this.removeInstance(name, instance.id);
        }
        this.emit('sound:stop', name);
      }
    });
  }

  fadeOut(name: string, duration: number): void {
    const instances = this.playing.get(name);
    if (!instances) return;

    for (const instance of instances) {
      if (instance.fadingOut) continue;
      instance.fadingOut = true;
      const currentVolume = instance.howl.volume(instance.id) as number;
      instance.howl.fade(currentVolume, 0, duration, instance.id);
      instance.howl.once('fade', () => {
        instance.howl.stop(instance.id);
        this.removeInstance(name, instance.id);
      });
    }
  }

  fadeOutAllMusic(duration: number): void {
    this.playing.forEach((instances, name) => {
      const musicInstances = instances.filter((i) => i.isMusic && !i.fadingOut);
      for (const instance of musicInstances) {
        instance.fadingOut = true;
        const currentVolume = instance.howl.volume(instance.id) as number;
        instance.howl.fade(currentVolume, 0, duration, instance.id);
        instance.howl.once('fade', () => {
          instance.howl.stop(instance.id);
          this.removeInstance(name, instance.id);
        });
      }
    });
  }

  fadeOutAllSounds(duration: number): void {
    this.playing.forEach((instances, name) => {
      const sfxInstances = instances.filter((i) => !i.isMusic && !i.fadingOut);
      for (const instance of sfxInstances) {
        instance.fadingOut = true;
        const currentVolume = instance.howl.volume(instance.id) as number;
        instance.howl.fade(currentVolume, 0, duration, instance.id);
        instance.howl.once('fade', () => {
          instance.howl.stop(instance.id);
          this.removeInstance(name, instance.id);
        });
      }
    });
  }

  // ============================================================
  // Pause / Resume
  // ============================================================

  pause(name: string): void {
    const instances = this.playing.get(name);
    if (!instances) return;
    for (const instance of instances) {
      instance.howl.pause(instance.id);
    }
  }

  resume(name: string): void {
    const instances = this.playing.get(name);
    if (!instances) return;
    for (const instance of instances) {
      instance.howl.play(instance.id);
    }
  }

  pauseAll(): void {
    this.playing.forEach((instances) => {
      for (const instance of instances) {
        instance.howl.pause(instance.id);
      }
    });
  }

  resumeAll(): void {
    this.playing.forEach((instances) => {
      for (const instance of instances) {
        instance.howl.play(instance.id);
      }
    });
  }

  pauseAllMusic(): void {
    this.playing.forEach((instances) => {
      for (const instance of instances) {
        if (instance.isMusic) {
          instance.howl.pause(instance.id);
        }
      }
    });
  }

  resumeAllMusic(): void {
    this.playing.forEach((instances) => {
      for (const instance of instances) {
        if (instance.isMusic) {
          instance.howl.play(instance.id);
        }
      }
    });
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
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  // ============================================================
  // Query State
  // ============================================================

  isPlaying(name: string): boolean {
    const instances = this.playing.get(name);
    if (!instances || instances.length === 0) return false;
    return instances.some((i) => i.howl.playing(i.id));
  }

  isAnyMusicPlaying(): boolean {
    for (const instances of this.playing.values()) {
      for (const instance of instances) {
        if (instance.isMusic && instance.howl.playing(instance.id)) {
          return true;
        }
      }
    }
    return false;
  }

  isAnySoundPlaying(): boolean {
    for (const instances of this.playing.values()) {
      for (const instance of instances) {
        if (!instance.isMusic && instance.howl.playing(instance.id)) {
          return true;
        }
      }
    }
    return false;
  }

  getPlayingCount(name: string): number {
    return this.playing.get(name)?.length ?? 0;
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
          instance.howl.volume(effectiveVolume, instance.id);
        }
      }
    });
  }

  private updateSfxVolumes(): void {
    const effectiveVolume = this.config.masterVolume * this.config.sfxVolume;
    this.playing.forEach((instances) => {
      for (const instance of instances) {
        if (!instance.isMusic && !instance.fadingOut) {
          instance.howl.volume(effectiveVolume, instance.id);
        }
      }
    });
  }
}

export const AudioManager = new AudioManagerClass();
