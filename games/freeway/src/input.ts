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
