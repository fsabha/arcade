/** Tiny animated previews for the cards: one drawing per game, 64x40 logical pixels. */
export const TW = 64;
export const TH = 40;

type Draw = (ctx: CanvasRenderingContext2D, t: number) => void;

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string): void {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

const mod = (a: number, n: number) => ((a % n) + n) % n;

const THUMBS: Record<string, Draw> = {
  riverraid(ctx, t) {
    rect(ctx, 0, 0, TW, TH, '#2050c8');
    const s = mod(t * 20, 40);
    for (let i = -1; i < 3; i++) {
      const y = i * 40 + s;
      const w = 14 + 6 * Math.sin(i + t * 0.3);
      rect(ctx, 0, y, w, 40, '#48b038');
      rect(ctx, TW - w, y, w, 40, '#48b038');
    }
    rect(ctx, 30, 28, 4, 6, '#f0e040'); rect(ctx, 27, 31, 10, 2, '#f0e040');
    rect(ctx, 20, 8 + mod(t * 20, 50), 8, 3, '#e04040');
  },
  endurance(ctx, t) {
    rect(ctx, 0, 0, TW, 18, '#88b8f0'); rect(ctx, 0, 18, TW, 22, '#606060');
    rect(ctx, 0, 16, TW, 2, '#c8c8c8');
    const k = mod(t * 30, 12);
    for (let i = 0; i < 6; i++) rect(ctx, i * 12 + k - 12, 28, 6, 1, '#ffffff');
    rect(ctx, 28, 30, 8, 5, '#e04040'); rect(ctx, 26, 33, 12, 3, '#e04040');
    rect(ctx, 40 - mod(t * 10, 20), 24, 5, 3, '#4060e0');
  },
  seaquest(ctx, t) {
    rect(ctx, 0, 0, TW, 6, '#88c8f0'); rect(ctx, 0, 6, TW, 34, '#2050c8');
    rect(ctx, 28, 12, 10, 4, '#f0e040'); rect(ctx, 31, 10, 3, 2, '#f0e040');
    for (let i = 0; i < 3; i++) rect(ctx, mod(i * 24 + t * 15, TW + 8) - 8, 22 + i * 5, 6, 2, '#40d040');
    rect(ctx, mod(-t * 12, TW + 8) - 8, 32, 5, 3, '#f0c0a0');
  },
  pacman(ctx, t) {
    rect(ctx, 0, 0, TW, TH, '#000');
    rect(ctx, 2, 2, TW - 4, 1, '#2020e0'); rect(ctx, 2, TH - 3, TW - 4, 1, '#2020e0');
    for (let x = 6; x < TW; x += 8) rect(ctx, x, 20, 2, 2, '#f0c0a0');
    const px = mod(t * 14, TW + 10) - 5;
    rect(ctx, px, 16, 8, 8, '#f0e040');
    if (Math.floor(t * 6) % 2) rect(ctx, px + 5, 19, 4, 2, '#000');
    rect(ctx, px - 16, 16, 7, 8, '#e03030');
    rect(ctx, px - 28, 16, 7, 8, '#40c0f0');
  },
  freeway(ctx, t) {
    rect(ctx, 0, 0, TW, TH, '#404040');
    for (let y = 8; y < TH; y += 8) for (let x = 0; x < TW; x += 8) rect(ctx, x + mod(t * 20, 8) - 8, y, 4, 1, '#f0e040');
    for (let i = 0; i < 4; i++) rect(ctx, mod(i * 20 + (i % 2 ? t : -t) * 25, TW + 10) - 10, 4 + i * 8, 7, 4, ['#e04040', '#40c0f0', '#f0e040', '#f08030'][i]);
    rect(ctx, 30, TH - 6 - mod(t * 6, 34), 4, 4, '#f0e040');
  },
  pitfall(ctx, t) {
    rect(ctx, 0, 0, TW, 8, '#48b038'); rect(ctx, 0, 8, TW, 16, '#c8a060'); rect(ctx, 0, 24, TW, 16, '#604020');
    rect(ctx, 20, 8, 3, 16, '#305018'); rect(ctx, 44, 8, 3, 16, '#305018');
    const sw = Math.sin(t * 2) * 10;
    rect(ctx, 32 + sw, 8, 1, 10, '#80e060');
    rect(ctx, 30 + sw, 16, 4, 6, '#40c040');
    rect(ctx, 50 + mod(-t * 10, 30), 20, 6, 3, '#804020');
  },
  frostbite(ctx, t) {
    rect(ctx, 0, 0, TW, 10, '#9cc8f0'); rect(ctx, 0, 10, TW, 30, '#2050c8');
    for (let r = 0; r < 4; r++) for (let i = 0; i < 3; i++) rect(ctx, mod(i * 22 + (r % 2 ? t : -t) * 10, TW + 12) - 12, 14 + r * 7, 10, 3, r === 1 ? '#78b0f0' : '#f8f8ff');
    rect(ctx, 28, 14 - 4 * Math.abs(Math.sin(t * 3)), 4, 6, '#e04040');
    rect(ctx, 48, 4, 10, 6, '#d0d8e0');
  },
  hero(ctx, t) {
    rect(ctx, 0, 0, TW, TH, '#301808');
    rect(ctx, 12, 0, 24, TH, '#000');
    rect(ctx, 20, 10 + Math.sin(t * 3) * 4, 6, 8, '#f0c040');
    rect(ctx, 26, 13 + Math.sin(t * 3) * 4, 8 * (Math.floor(t * 8) % 2), 1, '#ff4040');
    rect(ctx, 14, 34, 4, 5, '#40c0f0');
  },
  asteroids(ctx, t) {
    rect(ctx, 0, 0, TW, TH, '#000');
    for (let i = 0; i < 4; i++) rect(ctx, mod(i * 16 + t * (6 + i * 3), TW + 10) - 10, mod(i * 11 + t * 5, TH), 7, 6, ['#d8a0ff', '#80c0ff', '#a0ffa0', '#ffd080'][i]);
    rect(ctx, 30, 18, 4, 4, '#fff'); rect(ctx, 31, 16, 2, 2, '#fff');
  },
  keystone(ctx, t) {
    for (let f = 0; f < 3; f++) { rect(ctx, 0, f * 13, TW, 11, ['#a8d8a0', '#b8d0e8', '#e8d8a0'][f]); rect(ctx, 0, f * 13 + 11, TW, 2, '#c89860'); }
    const x = mod(t * 20, TW + 10) - 5;
    rect(ctx, x, 30, 4, 7, '#3048c8'); rect(ctx, x, 28, 4, 2, '#f0f0f0');
    rect(ctx, x + 14, 30, 4, 7, '#202020'); rect(ctx, x + 14, 32, 4, 1, '#f0f0f0'); rect(ctx, x + 14, 35, 4, 1, '#f0f0f0');
    rect(ctx, mod(-t * 25, TW + 8) - 8, 33, 7, 4, '#b8c0c8');
  },
  missile(ctx, t) {
    rect(ctx, 0, 0, TW, 32, '#101828'); rect(ctx, 0, 32, TW, 8, '#d87020');
    for (let i = 0; i < 6; i++) rect(ctx, 6 + i * 10, 29, 5, 3, '#48a8e8');
    for (let i = 0; i < 3; i++) { const k = mod(t * 0.4 + i * 0.3, 1); rect(ctx, 10 + i * 18 + k * 8, k * 30, 1, 2, '#ff5050'); rect(ctx, 10 + i * 18, 0, 1, k * 30, '#ff5050'); }
    const r = 3 + 3 * Math.abs(Math.sin(t * 3));
    rect(ctx, 32 - r, 16 - r, 2 * r, 2 * r, Math.floor(t * 20) % 2 ? '#ffe040' : '#ff4040');
  },
  frogger(ctx, t) {
    rect(ctx, 0, 0, TW, 14, '#00008c'); rect(ctx, 0, 14, TW, 4, '#b000b0'); rect(ctx, 0, 18, TW, 16, '#000'); rect(ctx, 0, 34, TW, 6, '#b000b0');
    for (let i = 0; i < 3; i++) rect(ctx, mod(i * 24 + t * 12, TW + 14) - 14, 2 + (i % 2) * 6, 12, 4, '#a06030');
    for (let i = 0; i < 3; i++) rect(ctx, mod(i * 22 - t * 18, TW + 10) - 10, 20 + (i % 2) * 7, 8, 4, ['#f0e040', '#e060e0', '#f0f0f0'][i]);
    rect(ctx, 30, 35 - mod(t * 8, 36), 5, 5, '#40d040');
  },
  chopper(ctx, t) {
    rect(ctx, 0, 0, TW, 28, '#78b8f0'); rect(ctx, 0, 28, TW, 12, '#e8c878');
    rect(ctx, 18, 12 + Math.sin(t * 2) * 3, 12, 4, '#3878f0'); rect(ctx, 16, 10 + Math.sin(t * 2) * 3, 16 * (Math.floor(t * 20) % 2), 1, '#202020');
    for (let i = 0; i < 4; i++) rect(ctx, mod(i * 16 - t * 8, TW + 8) - 8, 25, 7, 3, '#e8e8f8');
    rect(ctx, mod(-t * 30, TW + 10) - 10, 8, 10, 3, '#e04040');
  },
  moonpatrol(ctx, t) {
    rect(ctx, 0, 0, TW, 30, '#000010'); rect(ctx, 0, 30, TW, 10, '#b060b0');
    for (let i = 0; i < 5; i++) rect(ctx, mod(i * 14 - t * 6, TW + 8) - 8, 14 + (i % 3) * 3, 8, 16 - (i % 3) * 3, '#484870');
    const j = Math.abs(Math.sin(t * 2.5)) * 8;
    rect(ctx, 14, 24 - j, 12, 5, '#e060e0'); rect(ctx, 14, 29 - j, 3, 2, '#a0a8b0'); rect(ctx, 23, 29 - j, 3, 2, '#a0a8b0');
    rect(ctx, mod(-t * 20, TW + 8) - 8, 30, 8, 4, '#000010');
  },
  donkeykong(ctx, t) {
    rect(ctx, 0, 0, TW, TH, '#000');
    for (let i = 0; i < 4; i++) rect(ctx, i % 2 ? 6 : 0, 8 + i * 9, TW - 6, 3, '#e85050');
    rect(ctx, 2, 0, 12, 8, '#a06030');
    for (let i = 0; i < 3; i++) { const k = mod(t * 0.5 + i * 0.33, 1); rect(ctx, k * 56, 5 + Math.floor(k * 4) * 9, 4, 3, '#c08040'); }
    rect(ctx, 30, 32 - 4 * Math.abs(Math.sin(t * 4)), 4, 3, '#e03030'); rect(ctx, 30, 35 - 4 * Math.abs(Math.sin(t * 4)), 4, 2, '#3050d0');
  },
  goldenaxe(ctx, t) {
    rect(ctx, 0, 0, TW, 22, '#3050a0'); rect(ctx, 0, 22, TW, 18, '#5a9a40');
    for (let i = 0; i < 4; i++) rect(ctx, i * 18 + 2, 14 - (i % 2) * 4, 14, 8 + (i % 2) * 4, '#405880');
    const x = 14 + Math.sin(t * 2) * 4;
    rect(ctx, x, 22, 5, 10, '#3060c0'); rect(ctx, x + 1, 18, 3, 4, '#f0c090'); rect(ctx, x + 5, 20 + Math.sin(t * 8) * 3, 8, 2, '#d0d8e0');
    const ex = 44 - mod(t * 6, 10);
    rect(ctx, ex, 22, 5, 10, '#30a040'); rect(ctx, ex + 1, 18, 3, 4, '#f0c090'); rect(ctx, ex - 6, 21, 6, 2, '#d0d8e0');
    rect(ctx, 54, 10, 6, 6, '#58a8ff');
  },
  streetsofrage(ctx, t) {
    // a night street: skyline, a neon sign, the sidewalk and the road
    rect(ctx, 0, 0, TW, 22, '#140c30'); rect(ctx, 0, 22, TW, 6, '#505058'); rect(ctx, 0, 28, TW, 12, '#303038');
    for (let i = 0; i < 5; i++) { rect(ctx, i * 13 + 1, 6 + (i % 3) * 3, 10, 16 - (i % 3) * 3, '#1c1838'); for (let w = 0; w < 3; w++) rect(ctx, i * 13 + 3 + w * 3, 9 + (i % 3) * 3, 2, 2, '#e0d080'); }
    rect(ctx, 22, 14, 20, 4, Math.floor(t * 3) % 2 ? '#ff40a0' : '#40e0ff');
    for (let i = 0; i < 4; i++) rect(ctx, i * 18 + mod(t * 10, 18) - 9, 34, 8, 1, '#d0c040');
    // Axel punching a Galsia, a police car passing by
    const x = 16 + Math.sin(t * 2) * 3;
    rect(ctx, x, 22, 5, 10, '#3060c0'); rect(ctx, x, 22, 5, 5, '#f4f4f4'); rect(ctx, x + 1, 18, 3, 4, '#f0c090'); rect(ctx, x + 1, 17, 3, 1, '#f0d060'); rect(ctx, x + 5, 24 + Math.floor(t * 6) % 2, 5, 2, '#f0c090');
    const ex = 36 - mod(t * 5, 8);
    rect(ctx, ex, 22, 5, 10, '#303040'); rect(ctx, ex, 22, 5, 5, '#4060d0'); rect(ctx, ex + 1, 18, 3, 4, '#f0c090');
    const px = mod(t * 24, TW + 20) - 20;
    rect(ctx, px, 33, 14, 5, '#f0f0f8'); rect(ctx, px + 4, 33, 6, 5, '#2040c0'); rect(ctx, px + 5, 31, 4, 2, Math.floor(t * 8) % 2 ? '#ff3030' : '#3060ff');
  },
  virtuaracing(ctx, t) {
    rect(ctx, 0, 0, TW, 18, '#2058c0'); rect(ctx, 0, 18, TW, 22, '#3c9a3c');
    for (let i = 0; i < 6; i++) rect(ctx, i * 11, 12, 8, 6, '#2c6a3c');
    // the road narrows to the horizon
    for (let y = 18; y < TH; y++) { const k = (y - 18) / (TH - 18); const w = 6 + k * 50; rect(ctx, TW / 2 - w / 2, y, w, 1, ((y + Math.floor(t * 20)) & 4) ? '#6a6a70' : '#606066'); rect(ctx, TW / 2 - w / 2 - 2, y, 2, 1, ((y + Math.floor(t * 20)) & 2) ? '#e03030' : '#f0f0f0'); rect(ctx, TW / 2 + w / 2, y, 2, 1, ((y + Math.floor(t * 20)) & 2) ? '#e03030' : '#f0f0f0'); }
    rect(ctx, TW / 2 - 7 + Math.sin(t * 1.5) * 4, 31, 14, 5, '#f0f0f0'); rect(ctx, TW / 2 - 8 + Math.sin(t * 1.5) * 4, 34, 3, 3, '#181818'); rect(ctx, TW / 2 + 5 + Math.sin(t * 1.5) * 4, 34, 3, 3, '#181818');
    rect(ctx, TW / 2 - 3 + Math.sin(t) * 6, 22, 6, 3, '#e02020');
  },
};

/**
 * The Mega Drive games show real footage instead: a strip of frames captured from the game itself
 * (320x200 each, stacked vertically in one image), looped.
 */
const FILMS: Record<string, { src: string; frames: number; fps: number }> = {
  cometa: { src: '/thumbs/cometa.webp', frames: 24, fps: 15 },
  goldenaxe: { src: '/thumbs/goldenaxe.webp', frames: 16, fps: 10 },
  streetsofrage: { src: '/thumbs/streetsofrage.webp', frames: 16, fps: 10 },
  virtuaracing: { src: '/thumbs/virtuaracing.webp', frames: 16, fps: 15 },
};
const FW = 320, FH = 200;
const films = new Map<string, HTMLImageElement>();

/** Canvas size for a game's preview. */
export function thumbSize(id: string): [number, number] {
  return FILMS[id] ? [FW, FH] : [TW, TH];
}

/** Whether the preview is footage (drawn smooth) rather than pixel drawing. */
export function isFilm(id: string): boolean {
  return id in FILMS;
}

export function drawThumb(id: string, ctx: CanvasRenderingContext2D, t: number): void {
  const film = FILMS[id];
  if (film) {
    let img = films.get(id);
    if (!img) { img = new Image(); img.decoding = 'async'; img.src = film.src; films.set(id, img); }
    if (img.complete && img.naturalWidth > 0) {
      const f = Math.floor(t * film.fps) % film.frames;
      ctx.drawImage(img, 0, f * FH, FW, FH, 0, 0, FW, FH);
      return;
    }
    // until the footage arrives, the little drawing at the canvas's size
    ctx.save();
    ctx.scale(FW / TW, FH / TH);
    THUMBS[id]?.(ctx, t);
    ctx.restore();
    return;
  }
  const fn = THUMBS[id];
  if (!fn) { rect(ctx, 0, 0, TW, TH, '#101418'); return; }
  fn(ctx, t);
}
