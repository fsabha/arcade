import './style.css';
import { W, H } from './config';
import { Game } from './game';
import { Renderer } from './render';
import { Input, Action } from './input';
import { SoundFx } from './audio';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const stage = document.getElementById('stage') as HTMLDivElement;
const touchEl = document.getElementById('touch') as HTMLDivElement;

const input = new Input(window);
const audio = new SoundFx();
const game = new Game(input, audio);
const renderer = new Renderer(canvas);

// Touch controls: shown on coarse pointers, toggle with T on desktop.
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

// Audio needs a user gesture.
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

if (import.meta.env.DEV) {
  (window as unknown as { __rr: unknown }).__rr = { game, renderer, input };
}
