// Generates the PWA icons and the Open Graph image from the shared 3x5 pixel font.
// No dependencies: a tiny PNG encoder over zlib. Run: node scripts/make-images.mjs
import { deflateSync } from 'node:zlib';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// pull the glyph table out of font.ts without a TypeScript loader
const fontSrc = readFileSync(resolve(root, 'packages/shared/src/font.ts'), 'utf8');
const GLYPHS = {};
for (const m of fontSrc.matchAll(/^\s+(?:'([^']+)'|([A-Z0-9]))\s*:\s*\[((?:'[01]{3}',?\s*){5})\]/gm)) {
  const key = m[1] ?? m[2];
  GLYPHS[key] = [...m[3].matchAll(/'([01]{3})'/g)].map((r) => r[1]);
}

class Image {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Uint8Array(w * h * 4); }
  fill(x0, y0, w, h, [r, g, b, a = 255]) {
    for (let y = Math.max(0, y0); y < Math.min(this.h, y0 + h); y++) {
      for (let x = Math.max(0, x0); x < Math.min(this.w, x0 + w); x++) {
        const i = (y * this.w + x) * 4;
        this.d[i] = r; this.d[i + 1] = g; this.d[i + 2] = b; this.d[i + 3] = a;
      }
    }
  }
  text(s, x, y, scale, color) {
    let cx = x;
    for (const ch of s) {
      const g = GLYPHS[ch] ?? GLYPHS['?'];
      g.forEach((row, r) => { for (let c = 0; c < 3; c++) if (row[c] === '1') this.fill(cx + c * scale, y + r * scale, scale, scale, color); });
      cx += 4 * scale;
    }
  }
  textWidth(s, scale) { return (s.length * 4 - 1) * scale; }
  png() {
    const raw = Buffer.alloc((this.w * 4 + 1) * this.h);
    for (let y = 0; y < this.h; y++) {
      raw[y * (this.w * 4 + 1)] = 0;
      Buffer.from(this.d.buffer, y * this.w * 4, this.w * 4).copy(raw, y * (this.w * 4 + 1) + 1);
    }
    const chunks = [
      chunk('IHDR', Buffer.from([...u32(this.w), ...u32(this.h), 8, 6, 0, 0, 0])),
      chunk('IDAT', deflateSync(raw)),
      chunk('IEND', Buffer.alloc(0)),
    ];
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), ...chunks]);
  }
}

function u32(n) { return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]; }
const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
function crc32(buf) { let c = -1; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  return Buffer.concat([Buffer.from(u32(data.length)), t, data, Buffer.from(u32(crc32(Buffer.concat([t, data]))))]);
}

const BG = [5, 7, 12];
const FG = [223, 230, 238];
const ACCENTS = [[61, 220, 132], [255, 140, 58], [58, 160, 255], [255, 225, 74], [232, 80, 80], [216, 160, 255]];

function icon(size) {
  const img = new Image(size, size);
  img.fill(0, 0, size, size, BG);
  // a joystick: base, stick, red ball
  const u = size / 16;
  img.fill(3 * u, 11 * u, 10 * u, 3 * u, [48, 56, 72]);
  img.fill(4 * u, 10 * u, 8 * u, u, [70, 80, 100]);
  img.fill(7.25 * u, 5 * u, 1.5 * u, 6 * u, [160, 170, 190]);
  img.fill(6 * u, 3 * u, 4 * u, 3 * u, [232, 80, 80]);
  img.fill(6.75 * u, 3.5 * u, 1 * u, 1 * u, [255, 160, 160]);
  img.fill(11 * u, 11.75 * u, 1.5 * u, 1.5 * u, [61, 220, 132]);
  return img;
}

function og() {
  const img = new Image(1200, 630);
  img.fill(0, 0, 1200, 630, BG);
  // colour bands like the hub cards
  ACCENTS.forEach((c, i) => img.fill(0, 600 + i * 5, 1200, 5, c));
  const s1 = 18;
  img.text('ARCADE', (1200 - img.textWidth('ARCADE', s1)) / 2, 150, s1, FG);
  const sub = 'CLASSICOS DO ATARI E DO FLIPERAMA';
  img.text(sub, (1200 - img.textWidth(sub, 6)) / 2, 300, 6, [138, 151, 166]);
  const sub2 = 'NO NAVEGADOR';
  img.text(sub2, (1200 - img.textWidth(sub2, 6)) / 2, 350, 6, [138, 151, 166]);
  const url = 'ARCADE.FABIANOSABHA.COM.BR';
  img.text(url, (1200 - img.textWidth(url, 5)) / 2, 480, 5, [61, 220, 132]);
  return img;
}

const out = resolve(root, 'public');
mkdirSync(out, { recursive: true });
writeFileSync(resolve(out, 'icon-192.png'), icon(192).png());
writeFileSync(resolve(out, 'icon-512.png'), icon(512).png());
writeFileSync(resolve(out, 'apple-touch-icon.png'), icon(180).png());
writeFileSync(resolve(out, 'og.png'), og().png());
console.log('wrote public/icon-192.png, icon-512.png, apple-touch-icon.png, og.png');
