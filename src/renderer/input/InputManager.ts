import { EventEmitter } from 'eventemitter3';

export enum Key {
  Up = 'ArrowUp',
  Down = 'ArrowDown',
  Left = 'ArrowLeft',
  Right = 'ArrowRight',
  Space = ' ',
  Enter = 'Enter',
  Escape = 'Escape',
  Tab = 'Tab',
  Backspace = 'Backspace',
  Shift = 'Shift',
  Control = 'Control',
  Alt = 'Alt',
  A = 'a', B = 'b', C = 'c', D = 'd', E = 'e', F = 'f', G = 'g', H = 'h',
  I = 'i', J = 'j', K = 'k', L = 'l', M = 'm', N = 'n', O = 'o', P = 'p',
  Q = 'q', R = 'r', S = 's', T = 't', U = 'u', V = 'v', W = 'w', X = 'x',
  Y = 'y', Z = 'z',
  Num0 = '0', Num1 = '1', Num2 = '2', Num3 = '3', Num4 = '4',
  Num5 = '5', Num6 = '6', Num7 = '7', Num8 = '8', Num9 = '9',
  F1 = 'F1', F2 = 'F2', F3 = 'F3', F4 = 'F4', F5 = 'F5', F6 = 'F6',
  F7 = 'F7', F8 = 'F8', F9 = 'F9', F10 = 'F10', F11 = 'F11', F12 = 'F12',
  Minus = '-',
  Plus = '=',
  BracketLeft = '[',
  BracketRight = ']',
  Comma = ',',
  Period = '.',
  Slash = '/',
  Backslash = '\\',
  Semicolon = ';',
  Quote = "'",
  Tilde = '`',
}

export enum MouseButton {
  Left = 0,
  Middle = 1,
  Right = 2,
}

export enum GamepadButton {
  A = 0,
  B = 1,
  X = 2,
  Y = 3,
  LeftBumper = 4,
  RightBumper = 5,
  LeftTrigger = 6,
  RightTrigger = 7,
  Select = 8,
  Start = 9,
  LeftStick = 10,
  RightStick = 11,
  DPadUp = 12,
  DPadDown = 13,
  DPadLeft = 14,
  DPadRight = 15,
}

export enum GamepadAxis {
  LeftStickX = 0,
  LeftStickY = 1,
  RightStickX = 2,
  RightStickY = 3,
}

export interface InputEvents {
  'key:down': (key: string) => void;
  'key:up': (key: string) => void;
  'key:press': (key: string) => void;
  'mouse:down': (button: MouseButton, x: number, y: number) => void;
  'mouse:up': (button: MouseButton, x: number, y: number) => void;
  'mouse:move': (x: number, y: number, dx: number, dy: number) => void;
  'mouse:wheel': (deltaX: number, deltaY: number) => void;
  'gamepad:connected': (index: number) => void;
  'gamepad:disconnected': (index: number) => void;
}

export interface GamepadState {
  connected: boolean;
  buttons: Map<GamepadButton, boolean>;
  lastButtons: Map<GamepadButton, boolean>;
  axes: number[];
}

class InputManagerClass extends EventEmitter<InputEvents> {
  private keysHeld: Set<string> = new Set();
  private keysPressed: Set<string> = new Set();
  private lastKeysHeld: Set<string> = new Set();

  private mouseButtons: Set<MouseButton> = new Set();
  private mouseButtonsPressed: Set<MouseButton> = new Set();
  private lastMouseButtons: Set<MouseButton> = new Set();
  private _mouseX: number = 0;
  private _mouseY: number = 0;
  private _mouseDeltaX: number = 0;
  private _mouseDeltaY: number = 0;

  private gamepads: Map<number, GamepadState> = new Map();
  private _deadzone: number = 0.15;

  private initialized: boolean = false;

  init(): void {
    if (this.initialized) return;
    this.initialized = true;

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('contextmenu', this.onContextMenu);
    window.addEventListener('gamepadconnected', this.onGamepadConnected);
    window.addEventListener('gamepaddisconnected', this.onGamepadDisconnected);

    console.log('InputManager initialized');
  }

  destroy(): void {
    if (!this.initialized) return;
    this.initialized = false;

    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('contextmenu', this.onContextMenu);
    window.removeEventListener('gamepadconnected', this.onGamepadConnected);
    window.removeEventListener('gamepaddisconnected', this.onGamepadDisconnected);
  }

  update(): void {
    this.keysPressed.clear();
    for (const key of this.keysHeld) {
      if (!this.lastKeysHeld.has(key)) {
        this.keysPressed.add(key);
      }
    }
    this.lastKeysHeld = new Set(this.keysHeld);

    this.mouseButtonsPressed.clear();
    for (const btn of this.mouseButtons) {
      if (!this.lastMouseButtons.has(btn)) {
        this.mouseButtonsPressed.add(btn);
      }
    }
    this.lastMouseButtons = new Set(this.mouseButtons);

    this._mouseDeltaX = 0;
    this._mouseDeltaY = 0;

    this.pollGamepads();
  }

  // Keyboard
  isKeyHeld(key: string | Key): boolean {
    return this.keysHeld.has(key.toLowerCase()) || this.keysHeld.has(key);
  }

  isKeyPressed(key: string | Key): boolean {
    const pressed = this.keysPressed.has(key.toLowerCase()) || this.keysPressed.has(key);
    if (pressed) {
      this.keysPressed.delete(key.toLowerCase());
      this.keysPressed.delete(key);
    }
    return pressed;
  }

  isAnyKeyHeld(): boolean {
    return this.keysHeld.size > 0;
  }

  isAnyKeyPressed(): boolean {
    return this.keysPressed.size > 0;
  }

  // Mouse
  isMouseButtonHeld(button: MouseButton): boolean {
    return this.mouseButtons.has(button);
  }

  isMouseButtonPressed(button: MouseButton): boolean {
    const pressed = this.mouseButtonsPressed.has(button);
    if (pressed) {
      this.mouseButtonsPressed.delete(button);
    }
    return pressed;
  }

  get mouseX(): number {
    return this._mouseX;
  }

  get mouseY(): number {
    return this._mouseY;
  }

  get mouseDeltaX(): number {
    return this._mouseDeltaX;
  }

  get mouseDeltaY(): number {
    return this._mouseDeltaY;
  }

  // Gamepad
  get deadzone(): number {
    return this._deadzone;
  }

  set deadzone(value: number) {
    this._deadzone = Math.max(0, Math.min(1, value));
  }

  isGamepadConnected(index: number = 0): boolean {
    return this.gamepads.get(index)?.connected ?? false;
  }

  isGamepadButtonHeld(button: GamepadButton, index: number = 0): boolean {
    return this.gamepads.get(index)?.buttons.get(button) ?? false;
  }

  isGamepadButtonPressed(button: GamepadButton, index: number = 0): boolean {
    const state = this.gamepads.get(index);
    if (!state) return false;
    const current = state.buttons.get(button) ?? false;
    const last = state.lastButtons.get(button) ?? false;
    return current && !last;
  }

  getGamepadAxis(axis: GamepadAxis, index: number = 0): number {
    const state = this.gamepads.get(index);
    if (!state) return 0;
    const value = state.axes[axis] ?? 0;
    return Math.abs(value) < this._deadzone ? 0 : value;
  }

  getConnectedGamepadCount(): number {
    let count = 0;
    this.gamepads.forEach((state) => {
      if (state.connected) count++;
    });
    return count;
  }

  // Combined input helpers (keyboard OR gamepad)
  isUpHeld(gamepadIndex: number = 0): boolean {
    return (
      this.isKeyHeld(Key.Up) ||
      this.isKeyHeld(Key.W) ||
      this.isGamepadButtonHeld(GamepadButton.DPadUp, gamepadIndex) ||
      this.getGamepadAxis(GamepadAxis.LeftStickY, gamepadIndex) < -0.5
    );
  }

  isDownHeld(gamepadIndex: number = 0): boolean {
    return (
      this.isKeyHeld(Key.Down) ||
      this.isKeyHeld(Key.S) ||
      this.isGamepadButtonHeld(GamepadButton.DPadDown, gamepadIndex) ||
      this.getGamepadAxis(GamepadAxis.LeftStickY, gamepadIndex) > 0.5
    );
  }

  isLeftHeld(gamepadIndex: number = 0): boolean {
    return (
      this.isKeyHeld(Key.Left) ||
      this.isKeyHeld(Key.A) ||
      this.isGamepadButtonHeld(GamepadButton.DPadLeft, gamepadIndex) ||
      this.getGamepadAxis(GamepadAxis.LeftStickX, gamepadIndex) < -0.5
    );
  }

  isRightHeld(gamepadIndex: number = 0): boolean {
    return (
      this.isKeyHeld(Key.Right) ||
      this.isKeyHeld(Key.D) ||
      this.isGamepadButtonHeld(GamepadButton.DPadRight, gamepadIndex) ||
      this.getGamepadAxis(GamepadAxis.LeftStickX, gamepadIndex) > 0.5
    );
  }

  isActionPressed(gamepadIndex: number = 0): boolean {
    return (
      this.isKeyPressed(Key.Space) ||
      this.isKeyPressed(Key.Z) ||
      this.isGamepadButtonPressed(GamepadButton.A, gamepadIndex)
    );
  }

  isCancelPressed(gamepadIndex: number = 0): boolean {
    return (
      this.isKeyPressed(Key.Escape) ||
      this.isKeyPressed(Key.X) ||
      this.isGamepadButtonPressed(GamepadButton.B, gamepadIndex)
    );
  }

  isStartPressed(gamepadIndex: number = 0): boolean {
    return (
      this.isKeyPressed(Key.Enter) ||
      this.isGamepadButtonPressed(GamepadButton.Start, gamepadIndex)
    );
  }

  isSelectPressed(gamepadIndex: number = 0): boolean {
    return (
      this.isKeyPressed(Key.Tab) ||
      this.isGamepadButtonPressed(GamepadButton.Select, gamepadIndex)
    );
  }

  // Haptics
  vibrate(
    index: number = 0,
    duration: number = 200,
    weakMagnitude: number = 0.5,
    strongMagnitude: number = 0.5
  ): void {
    const gamepads = navigator.getGamepads();
    const gp = gamepads[index];
    if (gp?.vibrationActuator) {
      gp.vibrationActuator.playEffect('dual-rumble', {
        duration,
        weakMagnitude,
        strongMagnitude,
      });
    }
  }

  // Private handlers
  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.repeat) return;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    this.keysHeld.add(key);
    this.emit('key:down', key);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    this.keysHeld.delete(key);
    this.emit('key:up', key);
  };

  private onMouseDown = (e: MouseEvent): void => {
    this.mouseButtons.add(e.button as MouseButton);
    this.emit('mouse:down', e.button as MouseButton, e.clientX, e.clientY);
  };

  private onMouseUp = (e: MouseEvent): void => {
    this.mouseButtons.delete(e.button as MouseButton);
    this.emit('mouse:up', e.button as MouseButton, e.clientX, e.clientY);
  };

  private onMouseMove = (e: MouseEvent): void => {
    const dx = e.clientX - this._mouseX;
    const dy = e.clientY - this._mouseY;
    this._mouseX = e.clientX;
    this._mouseY = e.clientY;
    this._mouseDeltaX += dx;
    this._mouseDeltaY += dy;
    this.emit('mouse:move', e.clientX, e.clientY, dx, dy);
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    this.emit('mouse:wheel', e.deltaX, e.deltaY);
  };

  private onContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
  };

  private onGamepadConnected = (e: GamepadEvent): void => {
    console.log(`Gamepad connected: ${e.gamepad.id}`);
    this.gamepads.set(e.gamepad.index, {
      connected: true,
      buttons: new Map(),
      lastButtons: new Map(),
      axes: [],
    });
    this.emit('gamepad:connected', e.gamepad.index);
  };

  private onGamepadDisconnected = (e: GamepadEvent): void => {
    console.log(`Gamepad disconnected: ${e.gamepad.id}`);
    const state = this.gamepads.get(e.gamepad.index);
    if (state) {
      state.connected = false;
    }
    this.emit('gamepad:disconnected', e.gamepad.index);
  };

  private pollGamepads(): void {
    const gamepads = navigator.getGamepads();
    for (let i = 0; i < gamepads.length; i++) {
      const gp = gamepads[i];
      if (!gp) continue;

      let state = this.gamepads.get(i);
      if (!state) {
        state = {
          connected: true,
          buttons: new Map(),
          lastButtons: new Map(),
          axes: [],
        };
        this.gamepads.set(i, state);
      }

      state.lastButtons = new Map(state.buttons);
      state.buttons.clear();

      for (let b = 0; b < gp.buttons.length; b++) {
        if (gp.buttons[b].pressed) {
          state.buttons.set(b as GamepadButton, true);
        }
      }

      state.axes = [...gp.axes];
    }
  }
}

export const InputManager = new InputManagerClass();
