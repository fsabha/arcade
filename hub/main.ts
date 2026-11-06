import './style.css';
import { drawTextCentered, textWidth, installAnalytics, trackEvent } from '@arcade/shared';
import { GAMES, GameInfo } from './games';
import { drawThumb, TW, TH } from './thumbs';

interface GlobalEntry { initials: string; score: number; label: string }
type Board = Record<string, GlobalEntry[]>;
let board: Board | null = null;
let boardFailed = false;

const grid = document.getElementById('grid') as HTMLDivElement;
const frame = document.getElementById('frame') as HTMLIFrameElement;
const playing = document.getElementById('playing') as HTMLSpanElement;
const backBtn = document.getElementById('back') as HTMLButtonElement;
const title = document.getElementById('title') as HTMLCanvasElement;
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
  blurb.title = g.blurb;
  const top = document.createElement('ol');
  top.className = 'top';
  const entries = board?.[g.id];
  if (!board && !boardFailed) {
    top.innerHTML = '<li class="empty">carregando ranking...</li>';
  } else if (!entries || entries.length === 0) {
    top.innerHTML = `<li class="empty">${boardFailed ? 'ranking global indisponivel' : 'seja o primeiro no ranking'}</li>`;
  } else {
    entries.slice(0, 5).forEach((e, i) => {
      const li = document.createElement('li');
      li.innerHTML = `<span class="pos">${i + 1}</span><span class="ini">${esc(e.initials)}</span><span class="sc">${e.score}</span><span class="lb">${esc(e.label)}</span>`;
      top.append(li);
    });
  }
  text.append(c, meta, blurb, top);
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

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);
}

function visibleGames(): GameInfo[] {
  return GAMES;
}

/** Top 5 of every game from the global leaderboard; the cards re-render when it arrives. */
function loadBoard(): void {
  fetch('/api/scores?game=all')
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((data: { games?: Board }) => { board = data.games ?? {}; })
    .catch(() => { boardFailed = true; })
    .finally(renderGrid);
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
  loadBoard(); // and someone may have entered the ranking
}

installAnalytics();
pixelTitle(title, 'ARCADE', '#dfe6ee', 5);
renderGrid();
loadBoard();
backBtn.addEventListener('click', close);
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
