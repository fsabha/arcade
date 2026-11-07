import { Input, Action } from './input';
import { installAnalytics } from './analytics';

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
  installAnalytics();
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

  // Browsers only start audio inside a user gesture; mobile Safari is pickiest, so listen to all of them.
  const unlock = () => audio.unlock();
  window.addEventListener('keydown', unlock);
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('touchend', unlock, { passive: true });
  window.addEventListener('click', unlock);

  function resize(): void {
    const touch = document.body.classList.contains('touch');
    // a portrait game on a landscape phone: the buttons move to the sides of the canvas
    const side = touch && H > W && window.innerWidth > window.innerHeight * 1.2 && window.innerWidth >= 560;
    document.body.classList.toggle('side', side);
    let availW = window.innerWidth - 8;
    let availH = window.innerHeight - 8;
    if (touch && side) {
      touchEl.style.setProperty('--k', '1');
      let used = 0;
      for (const grp of touchEl.querySelectorAll<HTMLElement>('.group')) used += grp.offsetWidth + 12;
      availW -= used + 16;
    } else if (touch) {
      // the buttons shrink together when their row is wider than the screen (small phones)
      touchEl.style.setProperty('--k', '1');
      const need = touchEl.scrollWidth, have = touchEl.clientWidth;
      if (need > have) touchEl.style.setProperty('--k', String(Math.max(0.5, Math.floor((have / need) * 100) / 100)));
      availH -= touchEl.offsetHeight + 8;
    }
    let scale = Math.min(availW / W, availH / H);
    // desktop: half-integer steps keep pixels crisp; phones (high DPR, small screens) use every pixel
    if (scale >= 1 && !touch) scale = Math.floor(scale * 2) / 2;
    scale = Math.max(0.5, scale);
    canvas.style.width = `${Math.floor(W * scale)}px`;
    canvas.style.height = `${Math.floor(H * scale)}px`;
    stage.style.width = canvas.style.width;
    stage.style.height = canvas.style.height;
    // CRT scanlines follow the logical rows (one line per game pixel row)
    stage.style.setProperty('--scan', `${Math.max(2, scale)}px`);
    if (debugEl) {
      debugEl.textContent = `win ${window.innerWidth}x${window.innerHeight} dpr ${window.devicePixelRatio} touch ${touch} side ${side} ` +
        `avail ${Math.round(availW)}x${Math.round(availH)} scale ${scale} canvas ${canvas.style.width}x${canvas.style.height} ` +
        `touchbar ${touchEl.offsetHeight} iframe ${window !== window.parent} ua ${navigator.userAgent.slice(0, 60)}`;
    }
  }
  // ?debug=1 shows the sizing maths on screen, for phones we cannot inspect
  let debugEl: HTMLDivElement | null = null;
  if (new URLSearchParams(location.search).has('debug')) {
    debugEl = document.createElement('div');
    debugEl.style.cssText = 'position:fixed;left:0;top:0;z-index:99;background:rgba(0,0,0,.8);color:#0f0;font:11px monospace;padding:4px;max-width:100%;white-space:normal;pointer-events:none';
    document.body.appendChild(debugEl);
  }
  window.addEventListener('resize', resize);
  resize();

  let lastCrt: boolean | null = null;
  let last = performance.now();
  function frame(now: number): void {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    input.pollGamepad();
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
