import './style.css';
import { drawTextCentered, textWidth, installAnalytics, trackEvent } from '@arcade/shared';
import { GAMES, GameInfo, Platform, platformOf } from './games';
import { drawThumb, TW, TH } from './thumbs';

const grid = document.getElementById('grid') as HTMLDivElement;
const frame = document.getElementById('frame') as HTMLIFrameElement;
const playing = document.getElementById('playing') as HTMLSpanElement;
const backBtn = document.getElementById('back') as HTMLButtonElement;
const title = document.getElementById('title') as HTMLCanvasElement;
const toolbar = document.getElementById('toolbar') as HTMLElement;

type Sort = 'default' | 'year' | 'plays';
let filter: Platform | 'all' = 'all';
let sort: Sort = 'default';
const PLAYS_KEY = 'arcade.plays';

function loadPlays(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(PLAYS_KEY) ?? '{}') as Record<string, number>; } catch { return {}; }
}

function countPlay(id: string): void {
  const plays = loadPlays();
  plays[id] = (plays[id] ?? 0) + 1;
  try { localStorage.setItem(PLAYS_KEY, JSON.stringify(plays)); } catch { /* private mode */ }
}

function pixelTitle(canvas: HTMLCanvasElement, text: string, color: string, scale: number): void {
  const w = textWidth(text, scale) + 8;
  const h = 5 * scale + 6;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  drawTextCentered(ctx, text, w / 2, 3, color, scale);
}

const thumbs: { id: string; ctx: CanvasRenderingContext2D }[] = [];

function card(g: GameInfo, index: number, plays: number): HTMLButtonElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'card';
  el.style.setProperty('--accent', g.accent);
  const row = document.createElement('div');
  row.className = 'row';
  const text = document.createElement('div');
  text.className = 'text';
  const c = document.createElement('canvas');
  c.className = 'card-title';
  pixelTitle(c, g.title, g.accent, 2);
  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.textContent = `${g.original}, ${g.year}`;
  if (plays > 0) {
    const p = document.createElement('span');
    p.className = 'plays';
    p.textContent = ` · ${plays} ${plays === 1 ? 'partida' : 'partidas'}`;
    meta.append(p);
  }
  const blurb = document.createElement('div');
  blurb.className = 'blurb';
  blurb.textContent = g.blurb;
  text.append(c, meta, blurb);
  const thumb = document.createElement('canvas');
  thumb.className = 'thumb';
  thumb.width = TW;
  thumb.height = TH;
  const tctx = thumb.getContext('2d')!;
  tctx.imageSmoothingEnabled = false;
  thumbs.push({ id: g.id, ctx: tctx });
  row.append(text, thumb);
  el.append(row);
  if (index >= 0 && index < 10) {
    const key = document.createElement('div');
    key.className = 'key';
    key.textContent = String((index + 1) % 10); // 1-9, then 0 for the 10th
    el.append(key);
  }
  el.addEventListener('click', () => open(g));
  return el;
}

function visibleGames(): GameInfo[] {
  const plays = loadPlays();
  let list = GAMES.filter((g) => filter === 'all' || platformOf(g) === filter);
  if (sort === 'year') list = [...list].sort((a, b) => a.year - b.year || GAMES.indexOf(a) - GAMES.indexOf(b));
  if (sort === 'plays') list = [...list].sort((a, b) => (plays[b.id] ?? 0) - (plays[a.id] ?? 0) || GAMES.indexOf(a) - GAMES.indexOf(b));
  return list;
}

function renderGrid(): void {
  const plays = loadPlays();
  thumbs.length = 0;
  grid.replaceChildren();
  visibleGames().forEach((g, i) => grid.appendChild(card(g, i, plays[g.id] ?? 0)));
}

function open(g: GameInfo): void {
  frame.src = `games/${g.id}/index.html`;
  playing.textContent = g.title;
  document.body.classList.add('in-game');
  location.hash = g.id;
  frame.addEventListener('load', () => frame.contentWindow?.focus(), { once: true });
  countPlay(g.id);
  trackEvent('play', { game: g.id });
}

function close(): void {
  frame.src = 'about:blank';
  document.body.classList.remove('in-game');
  history.replaceState(null, '', location.pathname);
  renderGrid(); // play counts may have changed
}

installAnalytics();
pixelTitle(title, 'ARCADE', '#dfe6ee', 5);
renderGrid();
backBtn.addEventListener('click', close);
toolbar.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest('button');
  if (!btn) return;
  if (btn.dataset.filter) filter = btn.dataset.filter as Platform | 'all';
  if (btn.dataset.sort) sort = btn.dataset.sort as Sort;
  for (const b of toolbar.querySelectorAll('button')) {
    b.classList.toggle('on', (b.dataset.filter !== undefined && b.dataset.filter === filter) || (b.dataset.sort !== undefined && b.dataset.sort === sort));
  }
  renderGrid();
});
const aboutDlg = document.getElementById('about') as HTMLDialogElement;
(document.getElementById('about-btn') as HTMLButtonElement).addEventListener('click', () => aboutDlg.showModal());
window.addEventListener('keydown', (e) => {
  if (document.body.classList.contains('in-game')) return; // the game owns the keys
  const n = e.key === '0' ? 10 : Number(e.key); // keys 1-9 then 0 for the 10th card
  const list = visibleGames();
  if (n >= 1 && n <= list.length) open(list[n - 1]);
});
const initial = GAMES.find((g) => g.id === location.hash.slice(1));
if (initial) open(initial);

// the card previews animate together, gently
let last = 0;
function animate(now: number): void {
  if (!document.body.classList.contains('in-game') && now - last > 66) {
    last = now;
    const t = now / 1000;
    for (const th of thumbs) drawThumb(th.id, th.ctx, t);
  }
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

// Installable and offline-capable (not on the dev server, where modules are not bundled).
if ('serviceWorker' in navigator && location.hostname !== 'localhost' && !import.meta.env.DEV) {
  navigator.serviceWorker.register('/sw.js').catch(() => undefined);
}
