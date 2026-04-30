/**
 * ControlsManager — abstracted input system for keyboard, mouse, touch, and gamepad.
 *
 * Ported from okgame C++ Utility/ControlsManager, adapted for web browsers.
 * Supports: keyboard, mouse buttons, mouse wheel, touch, gamepad API.
 */

export enum InputAction {
    UP = 'up',
    DOWN = 'down',
    LEFT = 'left',
    RIGHT = 'right',
    ACTION = 'action',
    CANCEL = 'cancel',
    MENU = 'menu',
    PAUSE = 'pause',
    ZOOM_IN = 'zoom_in',
    ZOOM_OUT = 'zoom_out',
    DEBUG = 'debug',
    FULLSCREEN = 'fullscreen',
}

export interface InputBinding {
    action: InputAction;
    keys: string[];
    mouseButton?: number;
    gamepadButton?: number;
}

export const DEFAULT_BINDINGS: InputBinding[] = [
    { action: InputAction.UP, keys: ['ArrowUp', 'w', 'W'] },
    { action: InputAction.DOWN, keys: ['ArrowDown', 's', 'S'] },
    { action: InputAction.LEFT, keys: ['ArrowLeft', 'a', 'A'] },
    { action: InputAction.RIGHT, keys: ['ArrowRight', 'd', 'D'] },
    { action: InputAction.ACTION, keys: ['Enter', ' ', 'z', 'Z'], gamepadButton: 0 },
    { action: InputAction.CANCEL, keys: ['Escape', 'Backspace', 'x', 'X'], gamepadButton: 1 },
    { action: InputAction.MENU, keys: ['Tab', 'e', 'E'], gamepadButton: 2 },
    { action: InputAction.PAUSE, keys: ['p', 'P', 'Escape'], gamepadButton: 9 },
    { action: InputAction.ZOOM_IN, keys: ['=', '+'] },
    { action: InputAction.ZOOM_OUT, keys: ['-', '_'] },
    { action: InputAction.DEBUG, keys: ['`'] },
    { action: InputAction.FULLSCREEN, keys: ['F11'] },
];

export class ControlsManager {
    private bindings: Map<InputAction, InputBinding> = new Map();
    private pressedKeys: Set<string> = new Set();
    private justPressedKeys: Set<string> = new Set();
    private justReleasedKeys: Set<string> = new Set();
    private mouseButtons: Set<number> = new Set();
    private mouseJustPressed: Set<number> = new Set();
    private mouseJustReleased: Set<number> = new Set();
    private mouseX = 0;
    private mouseY = 0;
    private mouseDeltaX = 0;
    private mouseDeltaY = 0;
    private mouseWheelDelta = 0;

    private enabled = true;
    private target: EventTarget | null = null;

    constructor(bindings: InputBinding[] = DEFAULT_BINDINGS) {
        for (const binding of bindings) {
            this.bindings.set(binding.action, binding);
        }
    }

    // ============================================================
    // Attach/Detach
    // ============================================================

    attach(target: EventTarget): void {
        this.target = target;
        target.addEventListener('keydown', this.onKeyDown);
        target.addEventListener('keyup', this.onKeyUp);
        target.addEventListener('mousedown', this.onMouseDown);
        target.addEventListener('mouseup', this.onMouseUp);
        target.addEventListener('mousemove', this.onMouseMove);
        target.addEventListener('wheel', this.onWheel);
        target.addEventListener('touchstart', this.onTouchStart);
        target.addEventListener('touchend', this.onTouchEnd);
        target.addEventListener('touchmove', this.onTouchMove);
        target.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    detach(): void {
        if (!this.target) return;
        this.target.removeEventListener('keydown', this.onKeyDown);
        this.target.removeEventListener('keyup', this.onKeyUp);
        this.target.removeEventListener('mousedown', this.onMouseDown);
        this.target.removeEventListener('mouseup', this.onMouseUp);
        this.target.removeEventListener('mousemove', this.onMouseMove);
        this.target.removeEventListener('wheel', this.onWheel);
        this.target.removeEventListener('touchstart', this.onTouchStart);
        this.target.removeEventListener('touchend', this.onTouchEnd);
        this.target.removeEventListener('touchmove', this.onTouchMove);
        this.target = null;
    }

    // ============================================================
    // Keyboard
    // ============================================================

    private onKeyDown = (e: Event): void => {
        const ke = e as KeyboardEvent;
        if (!this.pressedKeys.has(ke.key)) {
            this.justPressedKeys.add(ke.key);
        }
        this.pressedKeys.add(ke.key);
        // Prevent default for game keys
        if (this.getActionForKey(ke.key)) {
            e.preventDefault();
        }
    };

    private onKeyUp = (e: Event): void => {
        const ke = e as KeyboardEvent;
        this.pressedKeys.delete(ke.key);
        this.justReleasedKeys.add(ke.key);
    };

    isKeyDown(key: string): boolean {
        return this.pressedKeys.has(key);
    }

    isKeyJustPressed(key: string): boolean {
        return this.justPressedKeys.has(key);
    }

    isKeyJustReleased(key: string): boolean {
        return this.justReleasedKeys.has(key);
    }

    // ============================================================
    // Mouse
    // ============================================================

    private onMouseDown = (e: Event): void => {
        const me = e as MouseEvent;
        this.mouseButtons.add(me.button);
        this.mouseJustPressed.add(me.button);
    };

    private onMouseUp = (e: Event): void => {
        const me = e as MouseEvent;
        this.mouseButtons.delete(me.button);
        this.mouseJustReleased.add(me.button);
    };

    private onMouseMove = (e: Event): void => {
        const me = e as MouseEvent;
        this.mouseDeltaX = me.clientX - this.mouseX;
        this.mouseDeltaY = me.clientY - this.mouseY;
        this.mouseX = me.clientX;
        this.mouseY = me.clientY;
    };

    private onWheel = (e: Event): void => {
        const we = e as WheelEvent;
        this.mouseWheelDelta = we.deltaY;
        e.preventDefault();
    };

    isMouseDown(button = 0): boolean {
        return this.mouseButtons.has(button);
    }

    isMouseJustPressed(button = 0): boolean {
        return this.mouseJustPressed.has(button);
    }

    getMouseX(): number { return this.mouseX; }
    getMouseY(): number { return this.mouseY; }
    getMouseDeltaX(): number { return this.mouseDeltaX; }
    getMouseDeltaY(): number { return this.mouseDeltaY; }
    getMouseWheelDelta(): number { return this.mouseWheelDelta; }

    // ============================================================
    // Touch
    // ============================================================

    private touchStartX = 0;
    private touchStartY = 0;
    private touchCurrentX = 0;
    private touchCurrentY = 0;
    private touching = false;

    private onTouchStart = (e: Event): void => {
        const te = e as TouchEvent;
        const touch = te.touches[0];
        if (touch) {
            this.touchStartX = touch.clientX;
            this.touchStartY = touch.clientY;
            this.touchCurrentX = touch.clientX;
            this.touchCurrentY = touch.clientY;
            this.touching = true;
        }
    };

    private onTouchEnd = (): void => {
        this.touching = false;
    };

    private onTouchMove = (e: Event): void => {
        const te = e as TouchEvent;
        const touch = te.touches[0];
        if (touch) {
            this.touchCurrentX = touch.clientX;
            this.touchCurrentY = touch.clientY;
        }
        e.preventDefault();
    };

    isTouching(): boolean { return this.touching; }
    getTouchStartX(): number { return this.touchStartX; }
    getTouchStartY(): number { return this.touchStartY; }
    getTouchCurrentX(): number { return this.touchCurrentX; }
    getTouchCurrentY(): number { return this.touchCurrentY; }
    getTouchDeltaX(): number { return this.touchCurrentX - this.touchStartX; }
    getTouchDeltaY(): number { return this.touchCurrentY - this.touchStartY; }

    // ============================================================
    // Gamepad
    // ============================================================

    getGamepad(index = 0): Gamepad | null {
        const gamepads = navigator.getGamepads();
        return gamepads[index];
    }

    isGamepadButtonPressed(button: number, index = 0): boolean {
        const gamepad = this.getGamepad(index);
        if (!gamepad) return false;
        return gamepad.buttons[button]?.pressed ?? false;
    }

    getGamepadAxis(axis: number, index = 0): number {
        const gamepad = this.getGamepad(index);
        if (!gamepad) return 0;
        return gamepad.axes[axis] ?? 0;
    }

    // ============================================================
    // Action-based queries
    // ============================================================

    private getActionForKey(key: string): InputAction | undefined {
        for (const [, binding] of this.bindings) {
            if (binding.keys.includes(key)) return binding.action;
        }
        return undefined;
    }

    isActionDown(action: InputAction): boolean {
        if (!this.enabled) return false;
        const binding = this.bindings.get(action);
        if (!binding) return false;

        // Check keyboard
        for (const key of binding.keys) {
            if (this.pressedKeys.has(key)) return true;
        }

        // Check mouse
        if (binding.mouseButton !== undefined && this.mouseButtons.has(binding.mouseButton)) {
            return true;
        }

        // Check gamepad
        if (binding.gamepadButton !== undefined) {
            return this.isGamepadButtonPressed(binding.gamepadButton);
        }

        return false;
    }

    isActionJustPressed(action: InputAction): boolean {
        if (!this.enabled) return false;
        const binding = this.bindings.get(action);
        if (!binding) return false;

        for (const key of binding.keys) {
            if (this.justPressedKeys.has(key)) return true;
        }
        return false;
    }

    // ============================================================
    // Frame Lifecycle
    // ============================================================

    endFrame(): void {
        this.justPressedKeys.clear();
        this.justReleasedKeys.clear();
        this.mouseJustPressed.clear();
        this.mouseJustReleased.clear();
        this.mouseDeltaX = 0;
        this.mouseDeltaY = 0;
        this.mouseWheelDelta = 0;
    }

    setEnabled(b: boolean): void { this.enabled = b; }
    isEnabled(): boolean { return this.enabled; }

    rebind(action: InputAction, keys: string[]): void {
        const existing = this.bindings.get(action);
        if (existing) {
            existing.keys = keys;
        } else {
            this.bindings.set(action, { action, keys });
        }
    }
}
