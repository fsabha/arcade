export type Action =
  | 'left' | 'right' | 'up' | 'down' | 'fire'
  | 'pause' | 'confirm' | 'back' | 'mute' | 'crt';

const KEYMAP: Record<string, Action> = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  Space: 'fire', KeyX: 'fire',
  KeyP: 'pause', Escape: 'pause',
  Enter: 'confirm',
  Backspace: 'back',
  KeyM: 'mute',
  KeyC: 'crt',
};

/** A short buzz on devices that support it (touch buttons, hits). Silently ignored elsewhere. */
export function vibrate(pattern: number | number[] = 10): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(pattern);
  } catch { /* not allowed */ }
}

// Standard gamepad mapping: A/X fire, B back, Start pause, Select confirm, d-pad and left stick directions.
const PAD_BUTTONS: Record<number, Action> = { 0: 'fire', 2: 'fire', 1: 'back', 9: 'pause', 8: 'confirm', 12: 'up', 13: 'down', 14: 'left', 15: 'right' };
const STICK_DEAD = 0.5;

export class Input {
  private held = new Set<Action>();
  private pressed = new Set<Action>();
  /** what the gamepad was holding last poll, so held keys still work when the pad lets go */
  private padHeld = new Set<Action>();

  constructor(target: Window) {
    target.addEventListener('keydown', (e) => {
      const a = KEYMAP[e.code];
      if (!a) return;
      e.preventDefault();
      if (e.repeat) return;
      this.press(a);
    });
    target.addEventListener('keyup', (e) => {
      const a = KEYMAP[e.code];
      if (!a) return;
      e.preventDefault();
      this.release(a);
    });
    target.addEventListener('blur', () => this.held.clear());
  }

  press(a: Action): void {
    if (!this.held.has(a)) this.pressed.add(a);
    this.held.add(a);
  }

  release(a: Action): void {
    this.held.delete(a);
  }

  isDown(a: Action): boolean {
    return this.held.has(a);
  }

  justPressed(a: Action): boolean {
    return this.pressed.has(a);
  }

  /** Call once per frame after update(). */
  endFrame(): void {
    this.pressed.clear();
  }

  /**
   * Reads the first connected gamepad and turns its state into presses and releases.
   * Call once per frame before the game update.
   */
  pollGamepad(): void {
    if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') return;
    let pads: (Gamepad | null)[];
    try { pads = navigator.getGamepads(); } catch { return; }
    const now = new Set<Action>();
    for (const pad of pads) {
      if (!pad) continue;
      pad.buttons.forEach((b, i) => { const a = PAD_BUTTONS[i]; if (a && b.pressed) now.add(a); });
      const [ax, ay] = pad.axes;
      if (ax < -STICK_DEAD) now.add('left');
      if (ax > STICK_DEAD) now.add('right');
      if (ay < -STICK_DEAD) now.add('up');
      if (ay > STICK_DEAD) now.add('down');
    }
    for (const a of now) if (!this.padHeld.has(a)) this.press(a);
    for (const a of this.padHeld) if (!now.has(a)) this.release(a);
    this.padHeld = now;
  }

  bindTouch(el: HTMLElement, action: Action): void {
    const down = (e: PointerEvent) => {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      this.press(action);
      vibrate(8);
    };
    const up = (e: PointerEvent) => {
      e.preventDefault();
      this.release(action);
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('lostpointercapture', up);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }
}

export interface SwipeOptions {
  /** px the finger must travel before it counts as a swipe */
  threshold?: number;
  /** action fired by a tap that did not move (default 'fire') */
  tap?: Action | null;
}

/**
 * Touch gestures on the canvas: a swipe becomes one press of left/right/up/down (seen by
 * `justPressed` on the next frame), a tap becomes `fire`. Meant for games that move in hops
 * or turn at junctions (Frogger, Pac-Man), not for ones that need a held direction.
 */
export function bindSwipe(el: HTMLElement, input: Input, opts: SwipeOptions = {}): void {
  const threshold = opts.threshold ?? 24;
  const tap = opts.tap === undefined ? 'fire' : opts.tap;
  let startX = 0;
  let startY = 0;
  let active = false;
  let swiped = false;
  const tapAction = (a: Action) => { input.press(a); input.release(a); };
  el.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    startX = e.clientX;
    startY = e.clientY;
    active = true;
    swiped = false;
    try { el.setPointerCapture(e.pointerId); } catch { /* synthetic events have no pointer */ }
  });
  el.addEventListener('pointermove', (e) => {
    if (!active || swiped) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;
    swiped = true;
    if (Math.abs(dx) > Math.abs(dy)) tapAction(dx > 0 ? 'right' : 'left');
    else tapAction(dy > 0 ? 'down' : 'up');
  });
  const end = () => {
    if (active && !swiped && tap) tapAction(tap);
    active = false;
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', () => { active = false; });
  el.style.touchAction = 'none';
}
