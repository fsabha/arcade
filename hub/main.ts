import './style.css';
import { drawTextCentered, textWidth, installAnalytics } from '@arcade/shared';
import { GAMES, GameInfo } from './games';

const grid = document.getElementById('grid') as HTMLDivElement;
const frame = document.getElementById('frame') as HTMLIFrameElement;
const playing = document.getElementById('playing') as HTMLSpanElement;
const backBtn = document.getElementById('back') as HTMLButtonElement;
const title = document.getElementById('title') as HTMLCanvasElement;

function pixelTitle(canvas: HTMLCanvasElement, text: string, color: string, scale: number): void {
  const w = textWidth(text, scale) + 8;
  const h = 5 * scale + 6;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  drawTextCentered(ctx, text, w / 2, 3, color, scale);
}

function card(g: GameInfo, index: number): HTMLButtonElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'card';
  el.style.setProperty('--accent', g.accent);
  const c = document.createElement('canvas');
  c.className = 'card-title';
  pixelTitle(c, g.title, g.accent, 2);
  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.textContent = `${g.original}, ${g.year}`;
  const blurb = document.createElement('div');
  blurb.className = 'blurb';
  blurb.textContent = g.blurb;
  el.append(c, meta, blurb);
  if (index < 10) {
    const key = document.createElement('div');
    key.className = 'key';
    key.textContent = String((index + 1) % 10); // 1-9, then 0 for the 10th
    el.append(key);
  }
  el.addEventListener('click', () => open(g));
  return el;
}

function open(g: GameInfo): void {
  frame.src = `games/${g.id}/index.html`;
  playing.textContent = g.title;
  document.body.classList.add('in-game');
  location.hash = g.id;
  frame.addEventListener('load', () => frame.contentWindow?.focus(), { once: true });
}

function close(): void {
  frame.src = 'about:blank';
  document.body.classList.remove('in-game');
  history.replaceState(null, '', location.pathname);
}

installAnalytics();
pixelTitle(title, 'ARCADE', '#dfe6ee', 5);
GAMES.forEach((g, i) => grid.appendChild(card(g, i)));
backBtn.addEventListener('click', close);
const aboutDlg = document.getElementById('about') as HTMLDialogElement;
(document.getElementById('about-btn') as HTMLButtonElement).addEventListener('click', () => aboutDlg.showModal());
window.addEventListener('keydown', (e) => {
  if (document.body.classList.contains('in-game')) return; // the game owns the keys
  const n = e.key === '0' ? 10 : Number(e.key); // keys 1-9 then 0 for the 10th card
  if (n >= 1 && n <= GAMES.length) open(GAMES[n - 1]);
});
const initial = GAMES.find((g) => g.id === location.hash.slice(1));
if (initial) open(initial);

// Installable and offline-capable (not on the dev server, where modules are not bundled).
if ('serviceWorker' in navigator && location.hostname !== 'localhost' && !import.meta.env.DEV) {
  navigator.serviceWorker.register('/sw.js').catch(() => undefined);
}
