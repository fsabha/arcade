import { PX, ROT_STEPS, Size } from './config';

// Asteroid bitmaps in Atari pixels (2x2 px each): two shapes per size.
const ROCKS: Record<Size, string[][]> = {
  large: [
    ['....XXXX....', '..XXXXXXXX..', '.XXXXXXXXXX.', 'XXXXXXXXXXXX', 'XXXXXXXXXX..', 'XXXXXXXXXXX.', '.XXXXXXXXXXX', '..XXXXXXXXXX', '..XXXXXXXXX.', '...XXXXXXX..', '....XXXXX...', '.....XXX....'],
    ['...XXXXX....', '.XXXXXXXXX..', 'XXXXXXXXXXX.', 'XXXXXXXXXXXX', '.XXXXXXXXXXX', '..XXXXXXXXXX', '.XXXXXXXXXX.', 'XXXXXXXXXXX.', 'XXXXXXXXXXXX', '.XXXXXXXXXX.', '...XXXXXXX..', '.....XXX....'],
  ],
  medium: [
    ['..XXX..', '.XXXXX.', 'XXXXXXX', 'XXXXXX.', 'XXXXXXX', '.XXXXX.', '..XXX..'],
    ['...XXX.', '.XXXXXX', 'XXXXXXX', '.XXXXXX', 'XXXXXX.', 'XXXXXX.', '..XXX..'],
  ],
  small: [
    ['.XX.', 'XXXX', 'XXXX', '.XX.'],
    ['.XXX', 'XXXX', 'XXX.', '.XX.'],
  ],
};

const SAUCERS: Record<string, string[]> = {
  satellite: ['....XXXX....', '...XXXXXX...', 'XXXXXXXXXXXX', 'XXXXXXXXXXXX', '...XXXXXX...', '....XXXX....'],
  ufo: ['...XX...', '.XXXXXX.', 'XXXXXXXX', '.XXXXXX.', '...XX...'],
};

export function spriteMaps(): Record<string, string[]> {
  const out: Record<string, string[]> = { ...SAUCERS };
  for (const size of Object.keys(ROCKS) as Size[]) ROCKS[size].forEach((m, i) => { out[`${size}${i}`] = m; });
  return out;
}

const cache = new Map<string, HTMLCanvasElement>();

function fromMap(rows: string[], color: string): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = rows[0].length * PX;
  c.height = rows.length * PX;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = color;
  rows.forEach((row, y) => { for (let x = 0; x < row.length; x++) if (row[x] === 'X') ctx.fillRect(x * PX, y * PX, PX, PX); });
  return c;
}

export function rock(size: Size, shape: number, color: string): HTMLCanvasElement {
  const key = `rock|${size}|${shape}|${color}`;
  let c = cache.get(key);
  if (!c) { c = fromMap(ROCKS[size][shape], color); cache.set(key, c); }
  return c;
}

export function saucer(kind: 'satellite' | 'ufo', color: string): HTMLCanvasElement {
  const key = `saucer|${kind}|${color}`;
  let c = cache.get(key);
  if (!c) { c = fromMap(SAUCERS[kind], color); cache.set(key, c); }
  return c;
}

/**
 * The ship: an arrow rasterised on an 8x8 Atari-pixel grid for each of the 16 headings
 * (the cartridge keeps 16 pre-drawn frames; this reproduces the chunky look).
 */
export function ship(dir: number, color: string, flame = false): HTMLCanvasElement {
  const key = `ship|${dir}|${color}|${flame ? 1 : 0}`;
  let c = cache.get(key);
  if (c) return c;
  const grid = 8;
  const rows: string[] = [];
  const a = (dir / ROT_STEPS) * Math.PI * 2 - Math.PI / 2;
  // triangle: nose at 3.6 units, tail corners at -2.4 units +/- 2.2 sideways
  const nose = [Math.cos(a) * 3.6, Math.sin(a) * 3.6];
  const left = [Math.cos(a) * -2.4 + Math.cos(a + Math.PI / 2) * 2.2, Math.sin(a) * -2.4 + Math.sin(a + Math.PI / 2) * 2.2];
  const right = [Math.cos(a) * -2.4 - Math.cos(a + Math.PI / 2) * 2.2, Math.sin(a) * -2.4 - Math.sin(a + Math.PI / 2) * 2.2];
  const inside = (px: number, py: number) => {
    const s = (p: number[], q: number[]) => (q[0] - p[0]) * (py - p[1]) - (q[1] - p[1]) * (px - p[0]);
    const d1 = s(nose, left);
    const d2 = s(left, right);
    const d3 = s(right, nose);
    const neg = d1 < 0 || d2 < 0 || d3 < 0;
    const pos = d1 > 0 || d2 > 0 || d3 > 0;
    return !(neg && pos);
  };
  for (let y = 0; y < grid; y++) {
    let row = '';
    for (let x = 0; x < grid; x++) {
      const cx = x - grid / 2 + 0.5;
      const cy = y - grid / 2 + 0.5;
      let on = inside(cx, cy);
      if (!on) {
        // keep the outline (edges thinner than a pixel still show)
        for (const [ox, oy] of [[0.45, 0], [-0.45, 0], [0, 0.45], [0, -0.45]]) if (inside(cx + ox, cy + oy)) { on = true; break; }
      }
      if (flame && !on) {
        const fx = Math.cos(a) * -3.8;
        const fy = Math.sin(a) * -3.8;
        if ((cx - fx) ** 2 + (cy - fy) ** 2 < 1.1) on = true;
      }
      row += on ? 'X' : '.';
    }
    rows.push(row);
  }
  c = fromMap(rows, color);
  cache.set(key, c);
  return c;
}
