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

export class Input {
  private held = new Set<Action>();
  private pressed = new Set<Action>();

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

  bindTouch(el: HTMLElement, action: Action): void {
    const down = (e: PointerEvent) => {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      this.press(action);
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
