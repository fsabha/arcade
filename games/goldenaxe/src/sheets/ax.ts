import type { SpriteSheet } from '@arcade/brawl';

/**
 * Ax Battler, hand-drawn 32x48 frames in 3/4 view, facing right (the Mega Drive sprite is about
 * 30x48). Heroic proportions: head 10 rows, torso 14, legs 20. Letters:
 * S/T/U skin light/mid/dark, H/h hair, B/b/c blue trunks, L/l leather belt and boots,
 * M/m/n steel, G/g gold trim, K dark lines, W whites of the eyes.
 */
const palette = {
  S: '#f4c89a', T: '#d49a68', U: '#9e6a44',
  H: '#5a3014', h: '#3a1c0a',
  B: '#3464d8', b: '#1e3e94', c: '#6a92f2',
  L: '#8c5c2c', l: '#5a3818',
  M: '#eef2f6', m: '#9aa6b4', n: '#5c6876',
  G: '#eac440', g: '#a68420',
  K: '#1a1418', W: '#ffffff',
};

// ---------- body parts, composed per frame ----------
// Everything is 32 wide; parts are stacked top to bottom to make 48 rows.

const HEAD = [
  '..............HHHHH.............',
  '............HHHHHHHHH...........',
  '...........HHHhHHHHHHH..........',
  '...........HhSSSSSSHHH..........',
  '...........hGGGGGGGGSh..........',
  '...........hSSSSSSSSSS..........',
  '...........hSSSWKSSSWK..........',
  '............TSSSSSSSSS..........',
  '............TSSSSUSSSS..........',
  '............TTSSSKKSS...........',
  '.............TUUUTTS............',
];
const NECK = ['..............TUUT..............'];

/** Torso: 14 rows. The arms are added per frame on top of this. */
const TORSO = [
  '............SSSSSSSSSSS.........',
  '..........SSSSSSSSSSSSSSS.......',
  '..........SSSSSTSSSSTSSSS.......',
  '..........SSSSSTSSSSTSSSS.......',
  '..........SSSSSSTTTTSSSSS.......',
  '..........SSSSSSSSSSSSSSS.......',
  '..........SSSSTTSSSTTSSSS.......',
  '..........SSSSSSTTTSSSSSS.......',
  '...........SSSSTTTTTSSSS........',
  '...........SSSSSSTSSSSSS........',
  '...........SSSSTTTTTSSSS........',
  '...........LLLLLLLLLLLLL........',
  '...........LlGGlLLLlGGlL........',
  '...........LLLLLLLLLLLLL........',
];

/** Trunks + legs standing: 22 rows (rows 26..47). */
const LEGS_STAND = [
  '...........BBBBBBBBBBBBB........',
  '..........cBBBBBBBBBBBBBb.......',
  '..........cBBBBBBBBBBBBBb.......',
  '..........cBBBBbbbBBBBBBb.......',
  '..........cBBBB...bBBBBBb.......',
  '...........SSSS....SSSSS........',
  '...........SSST....SSSST........',
  '...........SSST....SSSST........',
  '...........SSST....SSSST........',
  '...........SSST....SSSST........',
  '...........SSST....SSSST........',
  '...........SSST....SSSST........',
  '...........SSST....SSSST........',
  '...........SSST....SSSST........',
  '...........SSST....SSSST........',
  '...........LLLL....LLLLL........',
  '..........LLLLLl...LLLLLl.......',
  '..........LLLLLl...LLLLLl.......',
  '..........LLLLLl...LLLLLl.......',
  '..........LLLLLl..LLLLLLl.......',
  '.........lllllll..llllllll......',
  '................................',
];
const LEGS_STRIDE_A = [ // front leg forward, back leg back
  '...........BBBBBBBBBBBBB........',
  '..........cBBBBBBBBBBBBBb.......',
  '.........cBBBBBBBBBBBBBBBb......',
  '........cBBBBBbbbBBBBBBBBBb.....',
  '........cBBBB....bBBBBBBBBb.....',
  '........SSSS.......SSSSSSS......',
  '.......SSST.........SSSSST......',
  '.......SSST..........SSSST......',
  '......SSST...........SSSST......',
  '......SSST............SSSST.....',
  '.....SSST.............SSSST.....',
  '.....SSST.............SSSST.....',
  '.....SSST..............SSSST....',
  '.....SSST..............SSSST....',
  '.....SSST..............SSSST....',
  '.....LLLL..............LLLLL....',
  '....LLLLLl.............LLLLLl...',
  '....LLLLLl.............LLLLLl...',
  '....LLLLLl.............LLLLLl...',
  '....LLLLLl............LLLLLLl...',
  '...lllllll...........llllllll...',
  '................................',
];
const LEGS_PASS = [ // legs crossing, one knee lifted
  '...........BBBBBBBBBBBBB........',
  '..........cBBBBBBBBBBBBBb.......',
  '..........cBBBBBBBBBBBBBb.......',
  '..........cBBBBBbbBBBBBBb.......',
  '..........cBBBBB..bBBBBBb.......',
  '...........SSSSS...SSSSS........',
  '...........SSSST...SSSST........',
  '...........SSSST...SSSST........',
  '............SSST...SSSST........',
  '............SSST...SSSST........',
  '............SSST...SSSST........',
  '............SSST...SSSST........',
  '............SSST...SSSST........',
  '............LLLL...SSSST........',
  '...........LLLLLl..SSSST........',
  '...........LLLLLl..LLLLL........',
  '...........LLLLLl.LLLLLLl.......',
  '...........lllll..LLLLLLl.......',
  '..................LLLLLLl.......',
  '..................LLLLLLl.......',
  '.................llllllll.......',
  '................................',
];
const LEGS_STRIDE_B = [ // back leg forward
  '...........BBBBBBBBBBBBB........',
  '..........cBBBBBBBBBBBBBb.......',
  '.........cBBBBBBBBBBBBBBBb......',
  '........cBBBBBBBBbbbBBBBBBb.....',
  '........cBBBBBBBB...bBBBBBb.....',
  '........SSSSSSS.......SSSS......',
  '.........SSSSST.........SSST....',
  '.........SSSSST..........SSST...',
  '..........SSSST..........SSST...',
  '..........SSSST...........SSST..',
  '...........SSST...........SSST..',
  '...........SSST...........SSST..',
  '...........SSST............SSST.',
  '...........SSST............SSST.',
  '...........SSST............SSST.',
  '...........LLLL............LLLL.',
  '..........LLLLLl...........LLLLl',
  '..........LLLLLl...........LLLLl',
  '..........LLLLLl...........LLLLl',
  '..........LLLLLl..........LLLLLl',
  '.........lllllll.........llllllt',
  '................................',
].map((r) => r.replace('t', 'l'));
const LEGS_CROUCH = [ // knees bent: 22 rows but the body sits 4 rows lower (callers drop 4 rows of torso)
  '...........BBBBBBBBBBBBB........',
  '.........cBBBBBBBBBBBBBBBb......',
  '........cBBBBBBBBBBBBBBBBBb.....',
  '.......cBBBBBBbbbbbbBBBBBBBb....',
  '.......SSSSSS.......bBSSSSSSb...',
  '......SSSSST.........SSSSSST....',
  '.....SSSST............SSSSSST...',
  '.....SSST..............SSSSST...',
  '.....SSST...............SSSST...',
  '.....SSST...............SSSST...',
  '.....LLLL...............LLLLL...',
  '....LLLLLl..............LLLLLl..',
  '....LLLLLl..............LLLLLl..',
  '....LLLLLl.............LLLLLLl..',
  '...lllllll............llllllll..',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
];

type Mark = [number, number, string];

/** Paints marks (x, y, letter) over a frame. */
function stamp(rows: string[], marks: Mark[]): string[] {
  const out = rows.map((r) => r.split(''));
  for (const [x, y, ch] of marks) if (y >= 0 && y < out.length && x >= 0 && x < out[y].length) out[y][x] = ch;
  return out.map((r) => r.join(''));
}

/** A line of marks from (x0,y0) to (x1,y1), two pixels wide (light + mid), with a dark cross guard at the start. */
function blade(x0: number, y0: number, x1: number, y1: number, len = 18, guard = true): Mark[] {
  const out: Mark[] = [];
  const dx = x1 - x0, dy = y1 - y0;
  const n = Math.max(Math.abs(dx), Math.abs(dy)) || 1;
  const ux = dx / n, uy = dy / n;
  const px = Math.abs(ux) > Math.abs(uy) ? 0 : 1, py = px ? 0 : 1; // perpendicular step
  for (let i = 0; i <= len; i++) {
    const x = Math.round(x0 + ux * i), y = Math.round(y0 + uy * i);
    out.push([x, y, i < 3 ? 'L' : 'M'], [x + px, y + py, i < 3 ? 'l' : 'm']);
  }
  if (guard) for (let k = -2; k <= 3; k++) out.push([x0 + 3 * Math.round(ux) + k * px, y0 + 3 * Math.round(uy) + k * py, 'n']);
  return out;
}

/** Arms: shoulder at (13,12)/(23,12). Each arm is upper (4 px wide) + forearm + fist. */
function arm(sx: number, sy: number, ex: number, ey: number, hx: number, hy: number, back: boolean): Mark[] {
  const out: Mark[] = [];
  const line = (x0: number, y0: number, x1: number, y1: number, w: number, a: string, b: string) => {
    const dx = x1 - x0, dy = y1 - y0, n = Math.max(Math.abs(dx), Math.abs(dy)) || 1;
    for (let i = 0; i <= n; i++) {
      const x = Math.round(x0 + (dx * i) / n), y = Math.round(y0 + (dy * i) / n);
      for (let k = 0; k < w; k++) out.push([x + k, y, k === w - 1 ? b : a]);
    }
  };
  line(sx, sy, ex, ey, 4, back ? 'T' : 'S', back ? 'U' : 'T');
  line(ex, ey, hx, hy, 3, back ? 'T' : 'S', back ? 'U' : 'T');
  for (let k = -1; k <= 2; k++) for (let j = -1; j <= 2; j++) out.push([hx + k, hy + j, back ? 'T' : 'S']);
  out.push([hx + 2, hy + 2, 'U'], [hx + 2, hy + 1, 'U']);
  return out;
}

function frame(legs: string[], marks: Mark[], crouch = false): string[] {
  const body = crouch ? [...HEAD, ...NECK, ...TORSO.slice(0, 10), ...LEGS_CROUCH] : [...HEAD, ...NECK, ...TORSO, ...legs];
  const rows = body.slice(0, 48);
  while (rows.length < 48) rows.push('................................');
  return stamp(rows, marks);
}

// ---------- frames ----------
// idle: back arm hangs, front arm holds the sword low, tip towards the ground ahead
const idle0 = frame(LEGS_STAND, [...arm(10, 13, 9, 19, 9, 24, true), ...arm(24, 13, 26, 19, 26, 24, false), ...blade(27, 26, 30, 43, 17)]);
const idle1 = frame(LEGS_STAND, [...arm(10, 13, 9, 19, 9, 24, true), ...arm(24, 13, 26, 20, 26, 25, false), ...blade(27, 27, 30, 44, 17)]);
const walkA = frame(LEGS_STRIDE_A, [...arm(10, 13, 7, 18, 6, 23, true), ...arm(24, 13, 27, 18, 29, 23, false), ...blade(30, 25, 31, 42, 17)]);
const walkB = frame(LEGS_PASS, [...arm(10, 13, 9, 19, 9, 24, true), ...arm(24, 13, 26, 19, 26, 24, false), ...blade(27, 26, 30, 43, 17)]);
const walkC = frame(LEGS_STRIDE_B, [...arm(10, 13, 12, 18, 14, 23, true), ...arm(24, 13, 23, 19, 22, 24, false), ...blade(23, 26, 26, 43, 17)]);
const walkD = walkB;
// combo1: wind up over the shoulder, then slash forward level
const c1a = frame(LEGS_STAND, [...arm(10, 13, 9, 19, 9, 24, true), ...arm(24, 13, 26, 8, 24, 3, false), ...blade(23, 2, 6, 5, 18)]);
const c1b = frame(LEGS_STRIDE_A, [...arm(10, 13, 8, 18, 8, 23, true), ...arm(24, 13, 29, 15, 31, 17, false), ...blade(31, 17, 31, 17, 0, false)]);
const c1c = frame(LEGS_STRIDE_A, [...arm(10, 13, 8, 18, 8, 23, true), ...arm(24, 13, 29, 16, 31, 18, false)]);
// combo2: backhand, blade sweeps low across the front
const c2a = frame(LEGS_STRIDE_A, [...arm(10, 13, 8, 18, 8, 23, true), ...arm(24, 13, 20, 18, 16, 22, false), ...blade(14, 22, 2, 30, 14)]);
const c2b = frame(LEGS_STRIDE_A, [...arm(10, 13, 8, 18, 8, 23, true), ...arm(24, 13, 28, 18, 30, 22, false), ...blade(31, 22, 31, 22, 0, false)]);
// combo3: overhead smash, ends crouched with the blade in the ground
const c3a = frame(LEGS_STAND, [...arm(10, 13, 8, 7, 10, 2, true), ...arm(24, 13, 26, 7, 25, 2, false), ...blade(25, 1, 25, 1, 0, false), ...blade(24, 2, 24, 2, 0, false)]);
const c3b = frame(LEGS_CROUCH, [...arm(10, 13, 8, 18, 9, 22, true), ...arm(24, 13, 28, 18, 29, 23, false), ...blade(30, 24, 31, 42, 18)], true);
// jump: knees tucked
const jump = frame(LEGS_CROUCH, [...arm(10, 13, 8, 9, 8, 4, true), ...arm(24, 13, 27, 9, 28, 4, false), ...blade(29, 4, 31, 12, 8)], true);
// hit: head back, arms up
const hit = frame(LEGS_STAND, [...arm(10, 13, 6, 10, 4, 6, true), ...arm(24, 13, 27, 9, 29, 5, false), ...blade(30, 5, 31, 14, 9)]).map((r, y) => (y < 11 ? r.slice(3) + '...' : r));
const down = [
  ...Array.from({ length: 31 }, () => '................................'),
  '.......HHHHHH...................',
  '......HHHHHHHHSSSSSSSSSSSSSSS...',
  '.....HHHHhSSSSTSSSSSSSSSSSSSSS..',
  '.....HHHHSSSSSTSSSSSTTSSSSSSSSS.',
  '......hhhSSSSSTTSSSSSSSSSSSLBB..',
  '........SSSSSSTSSSSSSSSSSLLBBBB.',
  '..........SSSSSSSSSSSSSLLLBBBBb.',
  '.............SSSSSSSSSLLLLBBBBb.',
  '...............SSSSSSSSSSBBBBBb.',
  '.................SSSSSSSSSSSSSb.',
  '...................SSSSSSSSSLLL.',
  '......................SSSSSLLLLl',
  '........................SSSLLLLl',
  '..........................llllll',
  '................................',
  '................................',
  '................................',
];

export const AX_SHEET: SpriteSheet = {
  palette,
  fps: 8,
  anchorX: 17,
  frames: {
    idle: [idle0, idle1],
    walk: [walkA, walkB, walkC, walkD],
    combo1: [c1a, c1b, c1c],
    combo2: [c2a, c2b, c2b],
    combo3: [c3a, c3a, c3b, c3b],
    jump: [jump],
    hit: [hit],
    fly: [hit],
    down: [down],
  },
};
