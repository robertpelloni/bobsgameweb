import { Easing, type EasingFn } from './Easing';
import { EventEmitter } from 'eventemitter3';

export type EasingName = 'linear' | 'easeInOutCircular';

export interface TweenConfig {
  from: number;
  to: number;
  duration: number;
  easing?: EasingName;
  onUpdate?: (value: number) => void;
  onComplete?: () => void;
}

export interface TweenEvents {
  update: (value: number) => void;
  complete: (value: number) => void;
}

export class Tween extends EventEmitter<TweenEvents> {
  public from: number;
  public to: number;
  public duration: number;
  public easing: EasingFn;
  public elapsed: number = 0;
  public value: number;
  public active: boolean = true;

  constructor(config: TweenConfig) {
    super();
    this.from = config.from;
    this.to = config.to;
    this.duration = config.duration;
    this.value = config.from;

    const easingName = config.easing ?? 'linear';
    this.easing = (Easing as any)[easingName] || Easing.linear;

    if (config.onUpdate) this.on('update', config.onUpdate);
    if (config.onComplete) this.on('complete', config.onComplete);
  }

  public update(dt: number): void {
    if (!this.active) return;

    this.elapsed += dt;
    const progress = Math.min(1, this.elapsed / this.duration);
    
    this.value = this.easing(this.elapsed, this.from, this.to - this.from, this.duration);

    this.emit('update', this.value);

    if (progress >= 1) {
      this.value = this.to;
      this.active = false;
      this.emit('complete', this.value);
    }
  }

  public stop(): void {
    this.active = false;
  }
}

export interface TweenTargetConfig<T> {
  target: T;
  props: Partial<Record<keyof T, number>>;
  duration: number;
  easing?: EasingName;
  onUpdate?: (target: T) => void;
  onComplete?: (target: T) => void;
}

export class TweenTarget<T> extends EventEmitter<{ complete: (target: T) => void }> {
  private tweens: Array<{ prop: keyof T; from: number; to: number }>;
  private duration: number;
  private easing: EasingFn;
  private elapsed: number = 0;
  private target: T;
  public active: boolean = true;

  constructor(config: TweenTargetConfig<T>) {
    super();
    this.target = config.target;
    this.duration = config.duration;
    const easingName = config.easing ?? 'linear';
    this.easing = (Easing as any)[easingName] || Easing.linear;

    this.tweens = Object.entries(config.props).map(([prop, to]) => ({
      prop: prop as keyof T,
      from: (this.target as any)[prop],
      to: to as number,
    }));
  }

  public update(dt: number): void {
    if (!this.active) return;

    this.elapsed += dt;
    const progress = Math.min(1, this.elapsed / this.duration);

    for (const t of this.tweens) {
      (this.target as any)[t.prop] = this.easing(this.elapsed, t.from, t.to - t.from, this.duration);
    }

    if (progress >= 1) {
      for (const t of this.tweens) {
        (this.target as any)[t.prop] = t.to;
      }
      this.active = false;
      this.emit('complete', this.target);
    }
  }
}

export class TweenManager {
  private static tweens: (Tween | TweenTarget<any>)[] = [];

  public static update(dt: number): void {
    this.tweens = this.tweens.filter((t) => {
      t.update(dt);
      return t.active;
    });
  }

  public static add(tween: Tween | TweenTarget<any>): void {
    this.tweens.push(tween);
  }

  public static clear(): void {
    this.tweens = [];
  }
}
