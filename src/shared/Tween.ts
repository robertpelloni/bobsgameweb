import { EventEmitter } from 'eventemitter3';
import { Easing, type EasingFn } from './Easing';

export type EasingName = keyof typeof Easing;

export interface TweenEvents {
  'start': () => void;
  'update': (value: number, progress: number) => void;
  'complete': () => void;
  'stop': () => void;
}

export interface TweenConfig {
  from: number;
  to: number;
  duration: number;
  easing?: EasingName | EasingFn;
  delay?: number;
  onUpdate?: (value: number, progress: number) => void;
  onComplete?: () => void;
}

export class Tween extends EventEmitter<TweenEvents> {
  private from: number;
  private to: number;
  private duration: number;
  private easing: EasingFn;
  private delay: number;

  private elapsed: number = 0;
  private _value: number;
  private _progress: number = 0;
  private _running: boolean = false;
  private _paused: boolean = false;
  private _completed: boolean = false;

  constructor(config: TweenConfig) {
    super();
    this.from = config.from;
    this.to = config.to;
    this.duration = config.duration;
    this.delay = config.delay ?? 0;
    this._value = config.from;

    if (typeof config.easing === 'function') {
      this.easing = config.easing;
    } else {
      this.easing = Easing[config.easing ?? 'linear'];
    }

    if (config.onUpdate) {
      this.on('update', config.onUpdate);
    }
    if (config.onComplete) {
      this.on('complete', config.onComplete);
    }
  }

  start(): this {
    if (this._running) return this;
    this._running = true;
    this._paused = false;
    this._completed = false;
    this.elapsed = -this.delay;
    this._value = this.from;
    this._progress = 0;
    this.emit('start');
    return this;
  }

  stop(): this {
    if (!this._running) return this;
    this._running = false;
    this._paused = false;
    this.emit('stop');
    return this;
  }

  pause(): this {
    if (!this._running || this._paused) return this;
    this._paused = true;
    return this;
  }

  resume(): this {
    if (!this._running || !this._paused) return this;
    this._paused = false;
    return this;
  }

  reset(): this {
    this.elapsed = -this.delay;
    this._value = this.from;
    this._progress = 0;
    this._completed = false;
    return this;
  }

  update(dt: number): boolean {
    if (!this._running || this._paused || this._completed) return false;

    this.elapsed += dt;

    if (this.elapsed < 0) return true;

    if (this.elapsed >= this.duration) {
      this._value = this.to;
      this._progress = 1;
      this._completed = true;
      this._running = false;
      this.emit('update', this._value, this._progress);
      this.emit('complete');
      return false;
    }

    const change = this.to - this.from;
    this._value = this.easing(this.elapsed, this.from, change, this.duration);
    this._progress = this.elapsed / this.duration;
    this.emit('update', this._value, this._progress);
    return true;
  }

  get value(): number {
    return this._value;
  }

  get progress(): number {
    return this._progress;
  }

  get running(): boolean {
    return this._running;
  }

  get paused(): boolean {
    return this._paused;
  }

  get completed(): boolean {
    return this._completed;
  }
}

export interface TweenTargetConfig<T> {
  target: T;
  props: { [K in keyof T]?: number };
  duration: number;
  easing?: EasingName | EasingFn;
  delay?: number;
  onUpdate?: (target: T) => void;
  onComplete?: () => void;
}

export class TweenTarget<T extends object> extends EventEmitter<TweenEvents> {
  private target: T;
  private tweens: Map<keyof T, Tween> = new Map();
  private _running: boolean = false;
  private _completed: boolean = false;
  private onUpdateCallback?: (target: T) => void;

  constructor(config: TweenTargetConfig<T>) {
    super();
    this.target = config.target;
    this.onUpdateCallback = config.onUpdate;

    for (const [key, toValue] of Object.entries(config.props)) {
      const prop = key as keyof T;
      const fromValue = this.target[prop] as number;
      const tween = new Tween({
        from: fromValue,
        to: toValue as number,
        duration: config.duration,
        easing: config.easing,
        delay: config.delay,
      });
      this.tweens.set(prop, tween);
    }

    if (config.onComplete) {
      this.on('complete', config.onComplete);
    }
  }

  start(): this {
    if (this._running) return this;
    this._running = true;
    this._completed = false;
    this.tweens.forEach((tween) => tween.start());
    this.emit('start');
    return this;
  }

  stop(): this {
    if (!this._running) return this;
    this._running = false;
    this.tweens.forEach((tween) => tween.stop());
    this.emit('stop');
    return this;
  }

  pause(): this {
    this.tweens.forEach((tween) => tween.pause());
    return this;
  }

  resume(): this {
    this.tweens.forEach((tween) => tween.resume());
    return this;
  }

  update(dt: number): boolean {
    if (!this._running || this._completed) return false;

    let allComplete = true;
    this.tweens.forEach((tween, prop) => {
      if (tween.update(dt)) {
        allComplete = false;
      }
      (this.target as Record<keyof T, number>)[prop] = tween.value;
    });

    this.onUpdateCallback?.(this.target);
    this.emit('update', 0, this.progress);

    if (allComplete) {
      this._completed = true;
      this._running = false;
      this.emit('complete');
      return false;
    }

    return true;
  }

  get progress(): number {
    let total = 0;
    this.tweens.forEach((tween) => {
      total += tween.progress;
    });
    return this.tweens.size > 0 ? total / this.tweens.size : 0;
  }

  get running(): boolean {
    return this._running;
  }

  get completed(): boolean {
    return this._completed;
  }
}

class TweenManagerClass {
  private tweens: Set<Tween | TweenTarget<object>> = new Set();

  add(tween: Tween | TweenTarget<object>): void {
    this.tweens.add(tween);
  }

  remove(tween: Tween | TweenTarget<object>): void {
    this.tweens.delete(tween);
  }

  update(dt: number): void {
    this.tweens.forEach((tween) => {
      if (!tween.update(dt)) {
        this.tweens.delete(tween);
      }
    });
  }

  clear(): void {
    this.tweens.forEach((tween) => tween.stop());
    this.tweens.clear();
  }

  get count(): number {
    return this.tweens.size;
  }

  create(config: TweenConfig): Tween {
    const tween = new Tween(config);
    this.add(tween);
    tween.start();
    return tween;
  }

  createTarget<T extends object>(config: TweenTargetConfig<T>): TweenTarget<T> {
    const tween = new TweenTarget(config);
    this.add(tween as unknown as TweenTarget<object>);
    tween.start();
    return tween;
  }

  to<T extends object>(
    target: T,
    props: { [K in keyof T]?: number },
    duration: number,
    easing?: EasingName | EasingFn
  ): TweenTarget<T> {
    return this.createTarget({ target, props, duration, easing });
  }
}

export const TweenManager = new TweenManagerClass();
