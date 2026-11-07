/**
 * Hand-drawn sprite sheets: every animation state has a list of frames, each frame a list of
 * rows of palette letters (one char = one pixel). This is the 16-bit way: artists draw the
 * figure in every pose. Characters without a sheet fall back to the posed rig.
 */
export interface SpriteSheet {
  /** letter -> colour; '.' is transparent */
  palette: Record<string, string>;
  /** state -> frames (rows of letters). Frames are drawn facing right and mirrored for left. */
  frames: Record<string, string[][]>;
  /** frames per second for looping states */
  fps: number;
  /** pixel column of the feet centre inside a frame (defaults to the middle) */
  anchorX?: number;
}

const cache = new Map<string, HTMLCanvasElement>();

/** Rasterises one frame (with a 1 px dark outline) into a cached canvas. */
export function frameCanvas(sheet: SpriteSheet, key: string, index: number, flip: boolean): HTMLCanvasElement | null {
  const frames = sheet.frames[key];
  if (!frames || frames.length === 0) return null;
  const rows = frames[((index % frames.length) + frames.length) % frames.length];
  const id = `${sheetId(sheet)}|${key}|${index % frames.length}|${flip ? 1 : 0}`;
  const hit = cache.get(id);
  if (hit) return hit;
  const w = rows[0].length;
  const h = rows.length;
  const c = document.createElement('canvas');
  c.width = w + 2;
  c.height = h + 2;
  const ctx = c.getContext('2d')!;
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && rows[y][x] !== '.' && sheet.palette[rows[y][x]] !== undefined;
  // outline pass: any transparent pixel touching a solid one becomes dark
  ctx.fillStyle = '#141018';
  for (let y = -1; y <= h; y++) {
    for (let x = -1; x <= w; x++) {
      if (solid(x, y)) continue;
      if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) {
        const sx = flip ? w - 1 - x : x;
        ctx.fillRect(sx + 1, y + 1, 1, 1);
      }
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const col = sheet.palette[rows[y][x]];
      if (!col) continue;
      ctx.fillStyle = col;
      const sx = flip ? w - 1 - x : x;
      ctx.fillRect(sx + 1, y + 1, 1, 1);
    }
  }
  cache.set(id, c);
  return c;
}

const ids = new WeakMap<SpriteSheet, number>();
let nextSheet = 1;
function sheetId(s: SpriteSheet): number {
  let id = ids.get(s);
  if (!id) { id = nextSheet++; ids.set(s, id); }
  return id;
}

/** Which frame of a state to show: loops cycle with time, moves spread their frames over the move. */
export function frameIndex(sheet: SpriteSheet, key: string, t: number, duration?: number): number {
  const frames = sheet.frames[key];
  if (!frames || frames.length === 0) return 0;
  if (duration && duration > 0) return Math.min(frames.length - 1, Math.floor((t / duration) * frames.length));
  return Math.floor(t * sheet.fps) % frames.length;
}

/** Checks every frame is rectangular and uses known letters; returns problems. */
export function validateSheet(sheet: SpriteSheet): string[] {
  const out: string[] = [];
  for (const [key, frames] of Object.entries(sheet.frames)) {
    frames.forEach((rows, i) => {
      const w = rows[0]?.length ?? 0;
      rows.forEach((r, y) => {
        if (r.length !== w) out.push(`${key}[${i}] row ${y} width ${r.length} != ${w}`);
        for (const ch of r) if (ch !== '.' && !(ch in sheet.palette)) out.push(`${key}[${i}] unknown letter '${ch}'`);
      });
    });
  }
  return out;
}

/** The same drawings with some colours swapped (enemy colour variants). */
export function withPalette(sheet: SpriteSheet, overrides: Record<string, string>, anchorX?: number): SpriteSheet {
  return { ...sheet, palette: { ...sheet.palette, ...overrides }, anchorX: anchorX ?? sheet.anchorX };
}
