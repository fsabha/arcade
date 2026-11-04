import { Input, Action } from './input';

export interface GameLike {
  state: string;
  settings: { crt: boolean };
  update(dt: number): void;
}

export interface RendererLike<G> {
  draw(game: G): void;
}

export interface BootOptions<G extends GameLike> {
  /** Logical canvas size. */
  W: number;
  H: number;
  game: G;
  renderer: RendererLike<G>;
  input: Input;
  audio: { unlock(): void };
  /** Property name exposed on window in dev builds (e.g. "__pm"). */
  debugKey?: string;
}

/**
 * Wires a game to the standard page: canvas scaling in half-integer steps, touch buttons
 * (shown on coarse pointers, toggled with T), audio unlock on first gesture, the rAF loop,
 * the CRT body class and auto-pause when the tab is hidden.
 */
export function bootstrap<G extends GameLike>(opts: BootOptions<G>): void {
  const { W, H, game, renderer, input, audio } = opts;
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  const stage = document.getElementById('stage') as HTMLDivElement;
  const touchEl = document.getElementById('touch') as HTMLDivElement;

  const isTouch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  if (isTouch) document.body.classList.add('touch');
  for (const btn of touchEl.querySelectorAll<HTMLButtonElement>('button[data-action]')) {
    input.bindTouch(btn, btn.dataset.action as Action);
  }
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyT') {
      document.body.classList.toggle('touch');
      resize();
    }
  });

  const unlock = () => audio.unlock();
  window.addEventListener('keydown', unlock);
  window.addEventListener('pointerdown', unlock);

  function resize(): void {
    const touchH = document.body.classList.contains('touch') ? touchEl.offsetHeight + 8 : 0;
    const availW = window.innerWidth - 8;
    const availH = window.innerHeight - touchH - 8;
    let scale = Math.min(availW / W, availH / H);
    if (scale >= 1) scale = Math.floor(scale * 2) / 2; // half-integer steps keep pixels crisp
    scale = Math.max(0.5, scale);
    canvas.style.width = `${Math.floor(W * scale)}px`;
    canvas.style.height = `${Math.floor(H * scale)}px`;
    stage.style.width = canvas.style.width;
    stage.style.height = canvas.style.height;
  }
  window.addEventListener('resize', resize);
  resize();

  let lastCrt: boolean | null = null;
  let last = performance.now();
  function frame(now: number): void {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    game.update(dt);
    renderer.draw(game);
    input.endFrame();
    if (game.settings.crt !== lastCrt) {
      lastCrt = game.settings.crt;
      document.body.classList.toggle('crt', lastCrt);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game.state === 'playing') {
      input.press('pause');
      input.release('pause');
    }
  });

  if (opts.debugKey && import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>)[opts.debugKey] = { game, renderer, input };
  }
}
