import { EventEmitter } from 'eventemitter3';

export interface StateEvents {
  'state:push': (state: State) => void;
  'state:pop': (state: State) => void;
  'state:change': (current: State | null, previous: State | null) => void;
}

export interface State {
  name: string;
  onEnter?(): void | Promise<void>;
  onExit?(): void | Promise<void>;
  onPause?(): void;
  onResume?(): void;
  update(dt: number): void;
  render?(): void;
}

class StateManagerClass extends EventEmitter<StateEvents> {
  private stack: State[] = [];
  private initialized: boolean = false;

  init(): void {
    if (this.initialized) return;
    this.initialized = true;
  }

  destroy(): void {
    if (!this.initialized) return;
    while (this.stack.length > 0) {
      this.popSync();
    }
    this.initialized = false;
  }

  async push(state: State): Promise<void> {
    const previous = this.current;
    previous?.onPause?.();
    this.stack.push(state);
    await state.onEnter?.();
    this.emit('state:push', state);
    this.emit('state:change', state, previous);
  }

  pushSync(state: State): void {
    const previous = this.current;
    previous?.onPause?.();
    this.stack.push(state);
    state.onEnter?.();
    this.emit('state:push', state);
    this.emit('state:change', state, previous);
  }

  async pop(): Promise<State | null> {
    if (this.stack.length === 0) return null;
    const popped = this.stack.pop()!;
    await popped.onExit?.();
    this.emit('state:pop', popped);
    const current = this.current;
    current?.onResume?.();
    this.emit('state:change', current, popped);
    return popped;
  }

  popSync(): State | null {
    if (this.stack.length === 0) return null;
    const popped = this.stack.pop()!;
    popped.onExit?.();
    this.emit('state:pop', popped);
    const current = this.current;
    current?.onResume?.();
    this.emit('state:change', current, popped);
    return popped;
  }

  async replace(state: State): Promise<void> {
    await this.pop();
    await this.push(state);
  }

  replaceSync(state: State): void {
    this.popSync();
    this.pushSync(state);
  }

  async clear(): Promise<void> {
    while (this.stack.length > 0) {
      await this.pop();
    }
  }

  clearSync(): void {
    while (this.stack.length > 0) {
      this.popSync();
    }
  }

  get current(): State | null {
    return this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;
  }

  get size(): number {
    return this.stack.length;
  }

  get isEmpty(): boolean {
    return this.stack.length === 0;
  }

  has(name: string): boolean {
    return this.stack.some((s) => s.name === name);
  }

  getByName(name: string): State | null {
    return this.stack.find((s) => s.name === name) ?? null;
  }

  update(dt: number): void {
    this.current?.update(dt);
  }

  render(): void {
    this.current?.render?.();
  }

  updateAll(dt: number): void {
    for (const state of this.stack) {
      state.update(dt);
    }
  }

  renderAll(): void {
    for (const state of this.stack) {
      state.render?.();
    }
  }
}

export const StateManager = new StateManagerClass();
