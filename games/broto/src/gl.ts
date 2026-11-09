/**
 * BROTO's renderer: WebGL at native resolution with adaptive quality (like COMETA and LUME). The
 * night garden is a shader drawn at a third of the resolution; every seed, flake of ash, gate,
 * stone, the Sower and the Dry Heart is one quad of a single sprite batch, shaped in the fragment
 * shader by its kind. Thousands of units cost one draw call.
 */
import type { World, Gate, Hazard } from './world';
import type { Boss } from './boss';
import { SEED_R, SPROUT_R } from './world';

const HEAD = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
`;

const VS_SPRITE = `
attribute vec2 aPos; attribute vec2 aUv; attribute vec4 aCol; attribute vec2 aK;
uniform vec2 uRes;
varying vec2 vUv; varying vec4 vCol; varying vec2 vK;
void main() {
  vUv = aUv; vCol = aCol; vK = aK;
  vec2 c = aPos / uRes * 2.0 - 1.0;
  gl_Position = vec4(c.x, -c.y, 0.0, 1.0);
}`;

const FS_SPRITE = `${HEAD}
uniform float uT;
varying vec2 vUv; varying vec4 vCol; varying vec2 vK;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec2 hash2(vec2 p) { return vec2(hash(p), hash(p + 17.1)); }
float hexd(vec2 p) { p = abs(p); return max(dot(p, vec2(0.866, 0.5)), p.y); }
void main() {
  float k = vK.x, s = vK.y;
  float r = length(vUv);
  vec4 o = vec4(0.0);
  if (k < 0.5) { // soft glow, additive
    float a = exp(-r * r * 4.5) * (1.0 - smoothstep(0.8, 1.0, r));
    o = vec4(vCol.rgb * a * vCol.a, 0.0);
  } else if (k < 1.5) { // hot core, additive
    float a = exp(-r * r * 9.0) + 0.35 * exp(-r * r * 2.2);
    a *= 1.0 - smoothstep(0.85, 1.0, r);
    o = vec4(mix(vCol.rgb, vec3(1.0, 0.98, 0.9), exp(-r * r * 16.0)) * a * vCol.a, 0.0);
  } else if (k < 2.5) { // ring, additive
    float band = exp(-pow((r - 0.85) / 0.06, 2.0));
    o = vec4(vCol.rgb * band * vCol.a, 0.0);
  } else if (k < 3.5) { // seed: golden core in a green halo, stretched along its motion
    float core = exp(-r * r * 14.0);
    float halo = exp(-r * r * 3.0) * (1.0 - smoothstep(0.75, 1.0, r));
    vec3 c = vec3(0.61, 0.91, 0.54) * halo * 0.55 + mix(vec3(1.0, 0.84, 0.42), vec3(1.0, 0.98, 0.85), core) * core * 1.2;
    o = vec4(c * vCol.a, 0.0);
  } else if (k < 4.5) { // ash: a turning grey-violet hexagonal flake, over
    float d = hexd(vUv);
    if (d > 0.8) discard;
    float edge = smoothstep(0.8, 0.7, d);
    float facet = 0.75 + 0.25 * sign(vUv.x * vUv.y + 0.0001) * 0.6 + 0.15 * (vUv.y * -0.6);
    vec3 c = vCol.rgb * facet * (0.75 + 0.25 * smoothstep(0.75, 0.55, d));
    o = vec4(c, 1.0) * edge * vCol.a;
  } else if (k < 5.5) { // ember: ash with a pulsing orange heart
    float d = hexd(vUv);
    if (d > 0.82) discard;
    float edge = smoothstep(0.82, 0.72, d);
    float pulse = 0.6 + 0.4 * sin(uT * 7.0 + s * 20.0);
    vec3 c = mix(vec3(0.3, 0.27, 0.34), vec3(0.88, 0.34, 0.23), smoothstep(0.65, 0.1, d) * pulse);
    c += vec3(1.0, 0.6, 0.3) * exp(-r * r * 12.0) * pulse * 0.8;
    o = vec4(c, 1.0) * edge * vCol.a;
  } else if (k < 6.5) { // sprout: a bud with two leaves, additive glow
    vec2 q = vUv;
    float bud = exp(-dot(q - vec2(0.0, -0.1), q - vec2(0.0, -0.1)) * 9.0);
    vec2 l1 = q - vec2(-0.35, 0.25); l1 = mat2(0.8, -0.6, 0.6, 0.8) * l1;
    vec2 l2 = q - vec2(0.35, 0.25); l2 = mat2(0.8, 0.6, -0.6, 0.8) * l2;
    float leaf = smoothstep(1.0, 0.8, length(l1 * vec2(2.2, 5.0))) + smoothstep(1.0, 0.8, length(l2 * vec2(2.2, 5.0)));
    vec3 c = vec3(0.91, 1.0, 0.94) * bud * 1.3 + vec3(0.5, 0.95, 0.45) * leaf + vec3(0.61, 0.91, 0.54) * exp(-r * r * 2.5) * 0.4;
    o = vec4(c * vCol.a, 0.0);
  } else if (k < 7.5) { // gate panel: rounded bar, over; s = kind of light (0 good, 1 bad, 2 well, 3 wilted)
    vec2 q = vUv;
    float ar = vCol.a; // aspect (width / height) is passed in alpha
    vec2 p = vec2(q.x * ar, q.y);
    vec2 b = vec2(ar - 0.35, 0.65);
    vec2 d2 = abs(p) - b;
    float d = length(max(d2, 0.0)) + min(max(d2.x, d2.y), 0.0) - 0.35;
    if (d > 0.02) discard;
    float aa = smoothstep(0.02, -0.03, d);
    float rim = smoothstep(-0.18, -0.02, d);
    float shine = 0.75 + 0.25 * smoothstep(0.6, -0.8, q.y);
    vec3 c = vCol.rgb * shine;
    if (s > 1.5 && s < 2.5) c += vec3(0.6, 0.9, 1.0) * smoothstep(0.3, 0.0, abs(q.x)) * 0.5; // the well's sweet spot
    c = mix(c, c * 1.5 + 0.12, rim);
    o = vec4(c * aa * 0.92, aa * 0.92);
  } else if (k < 8.5) { // stone: grey rounded block with a mossy top, over
    vec2 q = vUv;
    float ar = vCol.a;
    vec2 p = vec2(q.x * ar, q.y);
    vec2 b = vec2(ar - 0.3, 0.7);
    vec2 d2 = abs(p) - b;
    float d = length(max(d2, 0.0)) + min(max(d2.x, d2.y), 0.0) - 0.3 + 0.04 * sin(q.y * 20.0 + s);
    if (d > 0.0) discard;
    float l = 0.6 + 0.4 * clamp(-q.x * 0.5 - q.y * 0.4 + 0.5, 0.0, 1.0);
    vec3 c = vec3(0.36, 0.38, 0.42) * l;
    c = mix(c, vec3(0.2, 0.38, 0.26), smoothstep(-0.6, -0.9, q.y) * 0.8);
    o = vec4(c, 1.0) * smoothstep(0.0, -0.04, d);
  } else if (k < 9.5) { // the Dry Heart: petrified seed, cracks that glow green as it is wounded (s = 0..1)
    if (r > 1.0) discard;
    vec2 q = vUv * 3.2 + 4.0;
    vec2 ip = floor(q), fp = fract(q);
    float m1 = 9.0, m2 = 9.0;
    for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 pt = g + hash2(ip + g);
      float dd = length(pt - fp);
      if (dd < m1) { m2 = m1; m1 = dd; } else if (dd < m2) m2 = dd;
    }
    float crack = smoothstep(0.07, 0.0, m2 - m1);
    float nz = sqrt(max(0.0, 1.0 - r * r));
    float l = 0.35 + 0.65 * clamp(dot(vec3(vUv, nz), normalize(vec3(-0.4, -0.6, 0.7))), 0.0, 1.0);
    vec3 stone = vec3(0.23, 0.2, 0.27) * l;
    float open = clamp(s * 1.4 - hash(ip) * 0.6, 0.0, 1.0);
    vec3 light = vec3(0.55, 1.0, 0.5) * (0.8 + 0.2 * sin(uT * 5.0 + hash(ip) * 6.0));
    vec3 c = stone + crack * mix(vec3(0.08, 0.06, 0.1), light * 1.5, open) + vCol.rgb * 0.0;
    float aa = smoothstep(1.0, 0.96, r);
    o = vec4(c, 1.0) * aa * vCol.a;
  } else if (k < 10.5) { // the Sower: five petals (two inner always, three outer = lives: s), over
    float ang = atan(vUv.y, vUv.x) + 1.5708;
    float best = 0.0;
    for (int i = 0; i < 5; i++) {
      float fi = float(i);
      if (fi >= 2.0 + s) continue;
      float a = fi * 1.2566 + uT * 0.0;
      float da = abs(mod(ang - a + 3.1416, 6.2832) - 3.1416);
      float len = 0.95 - 0.05 * fi;
      float petal = smoothstep(0.42, 0.36, da / max(0.2, r) * 0.32) * smoothstep(len, len - 0.06, r) * step(0.18, r);
      best = max(best, petal * (0.75 + 0.25 * (1.0 - r)));
    }
    float centre = smoothstep(0.26, 0.2, r);
    vec3 c = mix(vec3(0.91, 1.0, 0.94), vec3(0.61, 0.91, 0.54), r) * best + vec3(1.0, 0.84, 0.42) * centre * (1.0 + vCol.a * 0.5);
    float a = max(best, centre);
    if (a < 0.02) discard;
    o = vec4(c, a);
  } else if (k < 11.5) { // a guardian (s = which), tinted by vCol.rgb, fury in vCol.a
    vec2 q = vUv;
    float ang = atan(q.y, q.x);
    float a = 0.0;
    vec3 c = vec3(0.0);
    float fury = vCol.a;
    if (s < 0.5) { // cocoon: banded oval
      float e = length(q / vec2(0.72, 0.98));
      a = smoothstep(1.0, 0.95, e);
      float band = 0.6 + 0.4 * smoothstep(0.2, 0.0, abs(fract(q.y * 3.5 + 0.2 * sin(q.x * 4.0)) - 0.5) - 0.25);
      float nz = sqrt(max(0.0, 1.0 - e * e));
      c = vec3(0.42, 0.4, 0.48) * band * (0.5 + 0.5 * nz) + vec3(0.12, 0.1, 0.14) * smoothstep(0.85, 1.0, e);
    } else if (s < 1.5) { // serpent segment: scaled ring
      a = smoothstep(1.0, 0.94, r);
      float sc = 0.75 + 0.25 * step(0.5, fract(ang * 1.9 + r * 3.0));
      c = vec3(0.34, 0.27, 0.22) * sc * (0.45 + 0.55 * sqrt(max(0.0, 1.0 - r * r)));
    } else if (s < 2.5) { // thistle: twelve spikes round a purple core
      float sp = 0.62 + 0.36 * pow(max(0.0, cos(ang * 6.0 + uT * 0.4)), 10.0);
      a = smoothstep(sp, sp - 0.04, r);
      c = mix(vec3(0.38, 0.4, 0.3), vec3(0.62, 0.3, 0.7), smoothstep(0.5, 0.15, r)) * (0.55 + 0.45 * (1.0 - r));
    } else if (s < 3.5) { // whirlpool: three arms turning
      float sw = ang + r * 6.0 - uT * (2.0 + fury * 2.0);
      float arms = smoothstep(0.35, 0.95, cos(sw * 3.0) * 0.5 + 0.5);
      a = arms * smoothstep(1.0, 0.7, r) + smoothstep(0.28, 0.2, r);
      c = mix(vec3(0.35, 0.36, 0.45), vec3(0.75, 0.8, 0.95), smoothstep(0.3, 0.0, r)) * (0.6 + 0.4 * arms);
    } else if (s < 4.5) { // frost queen: a six-armed flake
      vec2 h = abs(q);
      float hex = max(dot(h, vec2(0.866, 0.5)), h.y);
      float arm = smoothstep(0.08, 0.0, abs(sin(ang * 3.0)) * r) * step(r, 0.95);
      a = max(smoothstep(0.45, 0.4, hex), arm);
      c = mix(vec3(0.75, 0.9, 1.0), vec3(0.35, 0.55, 0.85), r) * (0.8 + 0.2 * sin(r * 30.0 - uT * 3.0));
    } else if (s < 5.5) { // the bog: a wobbling blob
      float rr = 0.8 + 0.08 * sin(ang * 5.0 + uT * 3.0) + 0.05 * sin(ang * 9.0 - uT * 4.0);
      a = smoothstep(rr, rr - 0.05, r);
      c = vec3(0.28, 0.3, 0.2) * (0.5 + 0.5 * (1.0 - r)) + vec3(0.2, 0.3, 0.1) * pow(max(0.0, sin(q.x * 9.0 + uT) * sin(q.y * 7.0 - uT)), 4.0);
    } else if (s < 6.5) { // monolith: stacked blocks
      vec2 h = abs(q);
      float tier = step(h.x, 0.85 - floor((q.y + 1.0) * 1.5) * 0.0) * step(h.y, 0.95);
      float step3 = step(h.x, 0.45 + 0.2 * floor((q.y + 1.0) * 1.5));
      a = tier * step3;
      float seam = smoothstep(0.03, 0.0, abs(fract((q.y + 1.0) * 1.5) - 0.02));
      c = vec3(0.4, 0.4, 0.44) * (0.65 + 0.35 * (-q.x * 0.4 + 0.6)) * (1.0 - seam * 0.6);
    } else if (s < 7.5) { // night moth: two wings and a body
      vec2 w1 = (vec2(abs(q.x), q.y) - vec2(0.45, -0.05)) / vec2(0.5, 0.62);
      float wing = smoothstep(1.0, 0.92, length(w1));
      float body = smoothstep(1.0, 0.85, length(q / vec2(0.12, 0.6)));
      a = max(wing, body);
      float eye = smoothstep(0.16, 0.1, length(vec2(abs(q.x), q.y) - vec2(0.48, -0.1)));
      c = mix(vec3(0.22, 0.18, 0.3), vec3(0.4, 0.3, 0.5), wing * 0.5) + vec3(0.6, 0.55, 0.8) * eye * 0.3;
      c *= 0.7 + 0.3 * sin(length(w1) * 14.0);
    } else if (s < 8.5) { // firebird: triangles of ember
      vec2 h = vec2(abs(q.x), q.y);
      float u = clamp((h.x - 0.1) / 0.88, 0.0, 1.0);
      float flap = 0.12 * sin(uT * 6.0);
      float wingT = step(0.1, h.x) * step(h.x, 0.98) * step(-0.05 - (0.55 + flap) * u, h.y) * step(h.y, 0.22 - 0.3 * u - flap * u);
      float bodyT = smoothstep(1.0, 0.9, length(q / vec2(0.2, 0.55)));
      float tail = step(abs(q.x), (q.y - 0.35) * 0.9) * step(q.y, 0.95);
      float head = smoothstep(1.0, 0.85, length((q - vec2(0.0, -0.55)) / 0.17));
      a = max(max(wingT, bodyT), max(tail, head));
      float heat = 0.6 + 0.4 * sin(uT * 8.0 + q.x * 6.0 + q.y * 4.0);
      c = mix(vec3(0.88, 0.34, 0.23), vec3(1.0, 0.8, 0.35), (1.0 - h.x) * heat);
    }
    if (a < 0.03) discard;
    c *= vCol.rgb;
    c = mix(c, c * vec3(1.6, 0.6, 0.5) + vec3(0.12, 0.0, 0.0), fury * 0.6);
    o = vec4(c * a, a);
  } else if (k < 12.5) { // flat rectangle, premultiplied (telegraphs, bands, dust)
    vec2 q = abs(vUv);
    float aa = smoothstep(1.0, 0.92, max(q.x, q.y));
    o = vec4(vCol.rgb * vCol.a * aa, vCol.a * aa);
  } else { // sap ring: an arc filled to s (0..1), additive
    float ang = fract((atan(vUv.x, -vUv.y) / 6.2832) + 0.5);
    float band = exp(-pow((r - 0.86) / 0.07, 2.0));
    float on = step(ang, s);
    o = vec4(vCol.rgb * band * mix(0.15, 1.0, on) * vCol.a, 0.0);
  }
  gl_FragColor = o;
}`;

const VS_QUAD = `
attribute vec2 aPos;
varying vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

/** The night garden: dark soil, moss, the trail the crowds walk, dew glints. */
const FS_BG = `${HEAD}
uniform vec2 uRes; uniform float uT; uniform float uOx; uniform float uOy; uniform float uPw; uniform float uDark; uniform float uBloom;
varying vec2 vUv;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.1 + 3.7; a *= 0.5; } return v; }
void main() {
  vec2 px = vec2(vUv.x, 1.0 - vUv.y) * uRes;
  vec2 f = vec2((px.x - uOx) / uPw, (px.y - uOy) / uPw); // field coordinates
  vec3 soil = vec3(0.063, 0.078, 0.122);
  vec3 moss = vec3(0.141, 0.2, 0.184);
  vec3 trail = vec3(0.231, 0.31, 0.29);
  float n = fbm(f * 6.0);
  vec3 c = mix(soil, moss, smoothstep(0.35, 0.75, n) * 0.85);
  // the lane, worn smooth
  float lane = smoothstep(0.0, 0.025, f.x - 0.03) * smoothstep(0.0, 0.025, 0.97 - f.x);
  float worn = fbm(f * vec2(3.0, 9.0) + 2.0);
  c = mix(c, trail * (0.8 + 0.3 * worn), lane * 0.55);
  // edge grass
  float edge = (1.0 - lane) * step(0.0, f.x) * step(f.x, 1.0);
  c += vec3(0.08, 0.16, 0.1) * edge * smoothstep(0.4, 0.9, noise(vec2(f.x * 80.0, f.y * 12.0)));
  // dew glints
  vec2 g = floor(f * 40.0);
  float glint = step(0.985, hash(g)) * (0.5 + 0.5 * sin(uT * 2.0 + hash(g + 3.0) * 40.0));
  c += vec3(0.5, 0.83, 0.91) * glint * smoothstep(0.35, 0.0, length(fract(f * 40.0) - 0.5)) * 0.6;
  // the garden blooms back when a heart falls
  c = mix(c, c + vec3(0.06, 0.14, 0.06) * (0.5 + 0.5 * n), uBloom);
  c *= 1.0 - uDark * 0.72;
  vec2 v = vUv - 0.5;
  c *= 1.0 - dot(v, v) * 1.1;
  gl_FragColor = vec4(c, 1.0);
}`;

const FS_BLIT = `
precision mediump float;
uniform sampler2D uTex; uniform float uFlash; uniform vec3 uFlashCol; uniform float uHurt; uniform float uWilt;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(uTex, vUv).rgb;
  vec2 v = vUv - 0.5;
  c += vec3(0.88, 0.34, 0.23) * smoothstep(0.3, 0.75, length(v)) * uHurt * 0.8;
  c = mix(c, vec3(dot(c, vec3(0.3, 0.59, 0.11))), uWilt * 0.8);
  gl_FragColor = vec4(c + uFlashCol * uFlash, 1.0);
}`;

interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; r: number; g: number; b: number; kind: number; grav: number }

const FLOATS = 10;
const MAXQ = 12000;

function compile(gl: WebGLRenderingContext, vs: string, fs: string): WebGLProgram {
  const mk = (type: number, src: string) => {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) ?? 'shader');
    return sh;
  };
  const p = gl.createProgram()!;
  gl.attachShader(p, mk(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'link');
  return p;
}

/** Colour of a gate by what it does. */
export function gateColor(g: Gate, winter = false): [number, number, number, number] {
  if (g.uses !== undefined && g.used >= g.uses) return [0.32, 0.33, 0.36, 3];
  if (g.golden) return [0.95, 0.75, 0.25, 2];
  if (winter && g.op === 'mul') return [0.55, 0.7, 0.95, 1];
  switch (g.op) {
    case 'add': return [0.3, 0.62, 0.72, 0]; // dew
    case 'mul': return g.amp ? [0.36, 0.66, 0.55, 0] : g.n >= 3 ? [0.75, 0.62, 0.22, 0] : [0.36, 0.62, 0.3, 0];
    case 'well': return [0.22, 0.45, 0.75, 2];
    case 'sub': return [0.62, 0.24, 0.2, 1];
    case 'div': return [0.55, 0.6, 0.75, 1];
  }
}

export class Renderer {
  readonly gl: WebGLRenderingContext;
  private sprite: WebGLProgram;
  private bg: WebGLProgram;
  private blit: WebGLProgram;
  private quad: WebGLBuffer;
  private vbo: WebGLBuffer;
  private data = new Float32Array(FLOATS * 6 * MAXQ);
  private n = 0;
  private fbo: WebGLFramebuffer | null = null;
  private tex: WebGLTexture | null = null;
  private fw = 0;
  private fh = 0;
  private particles: Particle[] = [];
  private flash = 0;
  private flashCol: [number, number, number] = [1, 1, 1];
  private shake = 0;
  hurt = 0;
  bloom = 0;
  /** desaturation while the Sower is wilted */
  wilt = 0;
  /** an attack is aimed at the Sower right now */
  danger = false;
  pixelRatio = 1;
  ox = 0;
  /** top offset in device pixels (the safe area) */
  oy = 0;
  pw = 1;
  W = 1;
  H = 1;

  constructor(readonly canvas: HTMLCanvasElement) {
    const opts: WebGLContextAttributes = { antialias: false, alpha: false, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'high-performance' };
    const gl = (canvas.getContext('webgl2', opts) ?? canvas.getContext('webgl', opts)) as WebGLRenderingContext | null;
    if (!gl) throw new Error('WebGL indisponivel');
    this.gl = gl;
    this.sprite = compile(gl, VS_SPRITE, FS_SPRITE);
    this.bg = compile(gl, VS_QUAD, FS_BG);
    this.blit = compile(gl, VS_QUAD, FS_BLIT);
    this.quad = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    this.vbo = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, this.data.byteLength, gl.DYNAMIC_DRAW);
  }

  resize(cssW: number, cssH: number, ratio: number, safeTop = 0): void {
    this.pixelRatio = ratio;
    const w = Math.max(1, Math.round(cssW * ratio)), h = Math.max(1, Math.round(cssH * ratio));
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    this.W = w; this.H = h;
    this.oy = Math.round(safeTop * ratio);
    this.pw = Math.min(w, (h - this.oy) * 0.58);
    this.ox = (w - this.pw) / 2;
    const fw = Math.max(64, Math.round(w / 3)), fh = Math.max(64, Math.round(h / 3));
    if (fw !== this.fw || fh !== this.fh) this.makeTarget(fw, fh);
  }

  get fieldH(): number { return (this.H - this.oy) / this.pw; }

  private makeTarget(w: number, h: number): void {
    const gl = this.gl;
    if (this.tex) gl.deleteTexture(this.tex);
    if (this.fbo) gl.deleteFramebuffer(this.fbo);
    this.tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.fw = w; this.fh = h;
  }

  burst(x: number, y: number, n: number, col: [number, number, number], speed: number, size: number, life = 0.7, grav = 0): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = speed * (0.3 + Math.random() * 0.7);
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, max: life, size: size * (0.5 + Math.random()), r: col[0], g: col[1], b: col[2], kind: 0, grav });
    }
    if (this.particles.length > 900) this.particles.splice(0, this.particles.length - 900);
  }

  ring(x: number, y: number, col: [number, number, number], size: number, life = 0.5): void {
    this.particles.push({ x, y, vx: 0, vy: 0, life, max: life, size, r: col[0], g: col[1], b: col[2], kind: 2, grav: 0 });
  }

  hitFlash(col: [number, number, number], amount: number, shake: number): void {
    this.flash = Math.max(this.flash, amount);
    this.flashCol = col;
    this.shake = Math.max(this.shake, shake);
  }

  reset(): void {
    this.particles = [];
    this.flash = 0;
    this.shake = 0;
    this.hurt = 0;
    this.bloom = 0;
  }

  private push(x: number, y: number, half: number, r: number, g: number, b: number, a: number, kind: number, seed = 0, angle = 0, stretch = 1): void {
    if (this.n >= MAXQ) return;
    const ext = half * Math.max(1, stretch);
    if (x + ext < 0 || x - ext > this.W || y + ext < 0 || y - ext > this.H) return;
    const c = Math.cos(angle), sn = Math.sin(angle);
    const d = this.data;
    let o = this.n * 6 * FLOATS;
    const corner = (u: number, v: number) => {
      const lx = u * half * stretch, ly = v * half;
      d[o] = x + lx * c - ly * sn; d[o + 1] = y + lx * sn + ly * c; d[o + 2] = u; d[o + 3] = v;
      d[o + 4] = r; d[o + 5] = g; d[o + 6] = b; d[o + 7] = a; d[o + 8] = kind; d[o + 9] = seed;
      o += FLOATS;
    };
    corner(-1, -1); corner(1, -1); corner(-1, 1); corner(-1, 1); corner(1, -1); corner(1, 1);
    this.n++;
  }

  /** Field coordinates to CSS pixels (for the DOM labels). */
  toCss(x: number, y: number): [number, number] {
    return [(this.ox + x * this.pw) / this.pixelRatio, (this.oy + y * this.pw) / this.pixelRatio];
  }

  draw(w: World, time: number, dt: number): void {
    const gl = this.gl;
    const s = this.pw;
    const shx = this.shake > 0 ? (Math.random() - 0.5) * this.shake * s * 0.02 : 0;
    const shy = this.shake > 0 ? (Math.random() - 0.5) * this.shake * s * 0.02 : 0;
    this.shake = Math.max(0, this.shake - dt * 3);
    this.hurt = Math.max(0, this.hurt - dt * 1.5);
    const X = (x: number) => this.ox + x * s + shx;
    const Y = (y: number) => this.oy + y * s + shy;
    const dark = Math.max(w.level.dark ? 1 : 0, Math.min(1, w.eclipse * 2) * 1.25);

    // the garden, at a third of the resolution
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.viewport(0, 0, this.fw, this.fh);
    gl.useProgram(this.bg);
    gl.disable(gl.BLEND);
    this.bindQuad(this.bg);
    gl.uniform2f(gl.getUniformLocation(this.bg, 'uRes'), this.W, this.H);
    gl.uniform1f(gl.getUniformLocation(this.bg, 'uT'), time % 1000);
    gl.uniform1f(gl.getUniformLocation(this.bg, 'uOx'), this.ox);
    gl.uniform1f(gl.getUniformLocation(this.bg, 'uPw'), this.pw);
    gl.uniform1f(gl.getUniformLocation(this.bg, 'uOy'), this.oy);
    gl.uniform1f(gl.getUniformLocation(this.bg, 'uDark'), dark);
    gl.uniform1f(gl.getUniformLocation(this.bg, 'uBloom'), this.bloom);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.W, this.H);
    gl.useProgram(this.blit);
    this.bindQuad(this.blit);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.uniform1i(gl.getUniformLocation(this.blit, 'uTex'), 0);
    gl.uniform1f(gl.getUniformLocation(this.blit, 'uFlash'), this.flash);
    gl.uniform3f(gl.getUniformLocation(this.blit, 'uFlashCol'), this.flashCol[0], this.flashCol[1], this.flashCol[2]);
    gl.uniform1f(gl.getUniformLocation(this.blit, 'uHurt'), this.hurt);
    this.wilt = w.wilt > 0 ? Math.min(1, this.wilt + dt * 4) : Math.max(0, this.wilt - dt * 2);
    gl.uniform1f(gl.getUniformLocation(this.blit, 'uWilt'), this.wilt);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    this.flash = Math.max(0, this.flash - dt * 2.5);

    this.n = 0;

    // stones
    for (const st of w.stones) {
      const h = st.h * w.laneLen, cy = w.laneY(st.y) + h / 2;
      this.push(X(st.x), Y(cy), (h / 2) * s, 0, 0, 0, st.w / h, 8, st.x * 10, 0, st.w / h);
    }

    // gates: a glowing bar each (the number is a DOM label)
    for (const g of w.gates) {
      if (g.hidden > 0 || g.gone) continue;
      const [r, gg, b, kind] = gateColor(g, w.winter > 0);
      const hh = 0.022;
      const ar = g.w / (hh * 2);
      const fl = g.flash;
      this.push(X(g.cx), Y(w.laneY(g.y)), s * g.w * 0.62, r, gg, b, 0.18 + fl * 0.35, 0, 0, 0, 1);
      this.push(X(g.cx), Y(w.laneY(g.y)), s * hh, Math.min(1, r + fl * 0.3), Math.min(1, gg + fl * 0.3), Math.min(1, b + fl * 0.3), ar, 7, kind, 0, ar);
    }

    // the guardian (or, during the horde, the dormant heart above the lane)
    this.drawBoss(w, time, X, Y);
    // trial targets: the sprout to protect, the cocoons of the race
    if (w.trial) for (const c of w.trial.targets) {
      if (c.hp <= 0) continue;
      const k = c.hp / c.max;
      if (w.trial.kind === 'protect') {
        this.push(X(c.x), Y(c.y), s * 0.08, 0.6, 1, 0.5, 0.35, 0);
        this.push(X(c.x), Y(c.y), s * 0.03, 1, 1, 1, 1, 6, 0, Math.sin(time * 3) * 0.1);
        this.push(X(c.x), Y(c.y), s * 0.05, 0.6, 1, 0.5, 1, 13, k);
      } else {
        this.push(X(c.x), Y(c.y), s * c.r, 0.8 + 0.2 * (1 - k), 0.8, 0.8, 0, 11, 0);
        this.push(X(c.x), Y(c.y), s * c.r * 1.25, 1, 0.8, 0.4, 1, 13, k);
      }
    }
    // telegraphs and hazards
    let danger = false;
    for (const h of w.hazards) {
      this.drawHazard(w, h, time, X, Y);
      if (h.kind === 'drop' && h.y < w.sowerY && Math.abs(h.x - w.sower.x) < h.w / 2 + 0.03) danger = true;
      if ((h.kind === 'band' || h.kind === 'wall') && !h.gaps.some((g) => Math.abs(w.sower.x - g) < h.gapW / 2)) danger = true;
    }
    this.danger = danger;
    if (danger) {
      const k = 0.5 + 0.5 * Math.sin(time * 24);
      this.push(X(w.sower.x), Y(w.sowerY), s * 0.15, 1, 0.15, 0.1, 0.3 + 0.3 * k, 0);
      this.push(X(w.sower.x), Y(w.sowerY), s * 0.13, 1, 0.25, 0.2, 0.9, 2);
    }

    // ash
    const A = w.ash;
    for (let i = 0; i < A.n; i++) {
      const big = A.big[i] === 1;
      const rr = (big ? SEED_R * 1.7 : SEED_R * 1.15) * s;
      const ang = A.seed[i] * 6.28 + time * (0.8 + A.seed[i]);
      const sh = 0.85 + 0.3 * A.seed[i];
      if (big) this.push(X(A.x[i]), Y(A.y[i]), rr * 2.2, 0.9, 0.35, 0.2, 0.25, 0);
      this.push(X(A.x[i]), Y(A.y[i]), rr, 0.43 * sh, 0.42 * sh, 0.5 * sh, 1, big ? 5 : 4, A.seed[i], ang);
    }

    // seeds: one quad each, stretched along their motion
    const S = w.seeds;
    for (let i = 0; i < S.n; i++) {
      if (S.big[i] === 1) {
        this.push(X(S.x[i]), Y(S.y[i]), SPROUT_R * s * 2.6, 0.61, 0.91, 0.54, 0.35, 0);
        this.push(X(S.x[i]), Y(S.y[i]), SPROUT_R * s * 1.5, 1, 1, 1, 1, 6, 0, Math.sin(time * 4 + S.seed[i] * 9) * 0.15);
        continue;
      }
      const vx = S.vx[i], vy = S.vy[i];
      const ang = Math.atan2(vy, vx);
      this.push(X(S.x[i]), Y(S.y[i]), SEED_R * s * 2.1, 1, 1, 1, 0.85 + 0.15 * Math.sin(time * 9 + S.seed[i] * 40), 3, 0, ang, 1.5);
    }

    // particles
    for (const p of this.particles) {
      p.life -= dt;
      p.vy += p.grav * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 1 - dt * 1.8; p.vy *= 1 - dt * 1.2;
      const k = Math.max(0, p.life / p.max);
      if (p.kind === 2) this.push(X(p.x), Y(p.y), s * p.size * (1.6 - k), p.r, p.g, p.b, k, 2);
      else this.push(X(p.x), Y(p.y), s * p.size * (0.4 + k), p.r, p.g, p.b, k, 0);
    }
    this.particles = this.particles.filter((p) => p.life > 0);

    // the Sower
    const L = w.sower;
    const sx = X(L.x), sy = Y(w.sowerY);
    // sap: a ring round the flower, amber when low, red and blinking when wilted
    const sapK = Math.max(0, Math.min(1, w.sap / w.maxSap));
    const low = sapK < 0.25;
    const ringCol: [number, number, number] = w.wilt > 0 ? [1, 0.3, 0.25] : low ? [1, 0.7, 0.25] : [0.7, 1, 0.55];
    const blink = w.wilt > 0 || (low && Math.floor(time * 8) % 2 === 0) ? 0.5 : 1;
    this.push(sx, sy, s * 0.105, ringCol[0], ringCol[1], ringCol[2], blink, 13, w.wilt > 0 ? 1 - w.wilt / 3 : sapK);
    if (w.inv > 0 && Math.floor(time * 14) % 2 === 0) this.push(sx, sy, s * 0.12, 1, 0.4, 0.3, 0.35, 0);
    if (w.burst > 0) this.push(sx, sy, s * 0.13, 1, 0.95, 0.6, 0.4, 0);
    const pulse = L.firing ? 0.6 + 0.4 * Math.sin(time * 20) : 0.4;
    this.push(sx, sy, s * 0.16, 0.61, 0.91, 0.54, 0.22 + 0.1 * pulse + (w.sproutReady ? 0.15 * (0.5 + 0.5 * Math.sin(time * 6)) : 0), 0);
    if (w.sproutReady) this.push(sx, sy, s * (0.09 + 0.01 * Math.sin(time * 6)), 0.6, 1, 0.5, 0.7, 2);
    // a wilted Sower closes up
    const close = w.wilt > 0 ? 0.6 : 1;
    this.push(sx, sy, s * 0.07 * close * (1 + L.recoil * 0.06), 0, 0, 0, pulse, 10, w.petals, 0);

    gl.useProgram(this.sprite);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.data.subarray(0, this.n * 6 * FLOATS));
    const stride = FLOATS * 4;
    const attr = (name: string, size: number, off: number) => {
      const loc = gl.getAttribLocation(this.sprite, name);
      if (loc < 0) return;
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride, off * 4);
    };
    attr('aPos', 2, 0); attr('aUv', 2, 2); attr('aCol', 4, 4); attr('aK', 2, 8);
    gl.uniform2f(gl.getUniformLocation(this.sprite, 'uRes'), this.W, this.H);
    gl.uniform1f(gl.getUniformLocation(this.sprite, 'uT'), time % 1000);
    gl.drawArrays(gl.TRIANGLES, 0, this.n * 6);
  }

  private drawBoss(w: World, time: number, X: (x: number) => number, Y: (y: number) => number): void {
    const s = this.pw;
    const b: Boss | null = w.boss;
    if (b && w.done === 'win') return; // it burst into petals
    if (!b) {
      // the stage's guardian sleeps above the lane: a dark shape that breathes
      const hx = X(0.5), hy = Y(w.top - 0.08);
      this.push(hx, hy, s * 0.2, 0.4, 0.35, 0.5, 0.08 + 0.04 * Math.sin(time * 1.5), 0);
      if (w.level.boss === 9) this.push(hx, hy, s * 0.12, 0, 0, 0, 1, 9, 0);
      else this.push(hx, hy, s * 0.1, 0.35, 0.33, 0.4, 0, 11, w.level.boss);
      return;
    }
    const intro = b.intro > 0 ? Math.min(1, (2.6 - b.intro) / 1.2) : 1;
    const bx = X(b.x), by = Y(b.y + 0.02 - (1 - intro) * 0.25);
    const R = s * b.def.r * 1.55 * (0.6 + 0.4 * intro);
    const fl = b.flash;
    const fury = b.fury ? 0.6 + 0.4 * Math.sin(time * 9) : 0;
    const tellK = b.tell > 0 ? 0.5 + 0.5 * Math.sin(time * 30) : 0;
    // aura
    const vulnerable = b.open > 0 || b.mouth > 0 || b.inhale > 0;
    this.push(bx, by, R * 2.6, vulnerable ? 0.6 : 0.9, vulnerable ? 1 : 0.3, vulnerable ? 0.5 : 0.3, 0.12 + fl * 0.25 + tellK * 0.2 + (vulnerable ? 0.15 : 0), 0);
    const tint = (k: number): [number, number, number] => [1 + fl * 0.5 + k, 1 + fl * 0.5 + k, 1 + fl * 0.5 + k];
    if (b.id === 9) {
      this.push(bx, by, R, 0, 0, 0, 1, 9, Math.min(1, (1 - b.hp / b.max) * 1.3 + (w.done === 'win' ? 1 : 0)));
      if (b.contract > 0) this.push(bx, by, R * (1.15 + 0.1 * Math.sin(time * 20)), 1, 0.3, 0.3, 0.8, 2);
    } else if (b.id === 1) {
      // the serpent: a chain of rings trailing behind the head
      for (let i = 7; i >= 1; i--) {
        const sx2 = 0.5 + Math.sin((b.t - i * 0.18) * 0.45) * 0.25;
        this.push(X(sx2), Y(b.y - 0.01 - i * 0.012), R * (1 - i * 0.07), ...tint(0), fury, 11, 1);
      }
      this.push(bx, by, R * 1.1, ...tint(0.2), fury, 11, 1);
      for (const e of [-1, 1]) this.push(bx + e * R * 0.4, by + R * 0.3, R * 0.25, 1, 0.6, 0.2, 1, 1);
    } else {
      this.push(bx, by, R, ...tint(0), fury, 11, b.id);
    }
    // states
    if (b.shell > 0) this.push(bx, by, R * 1.15, 0.6, 0.6, 0.65, 0.8, 2);
    if (b.mirror > 0) { this.push(bx, by, R * 1.3, 0.85, 0.7, 1, 0.9, 2); this.push(bx, by, R * 1.6, 0.85, 0.7, 1, 0.3, 0); }
    if (b.id === 3 && b.open > 0) this.push(bx, by, R * 0.35, 0.7, 1, 0.6, 1, 1); // the eye stops: hit it
    if (b.id === 5) {
      const m = b.mouth > 0 ? 1 : b.tell > 0 ? 0.4 : 0.1;
      this.push(bx, by + R * 0.2, R * 0.32 * m + 1, 0.04, 0.03, 0.02, 1, 4, 0, 0, 1.5);
      if (b.mouth > 0) this.push(bx, by + R * 0.2, R * 0.5, 0.4, 0.7, 1, 0.5, 0);
    }
    if (b.id === 6 && b.open > 0) { this.push(bx, by, R * 0.5, 0.5, 1, 0.9, 0.7, 0); this.push(bx, by, R * 0.2, 0.7, 1, 1, 1, 1); }
    if (b.id === 7) for (const e of [-1, 1]) this.push(bx + e * R * 0.48, by - R * 0.1, R * (b.open > 0 ? 0.35 : 0.15), 1, b.open > 0 ? 0.95 : 0.4, b.open > 0 ? 0.5 : 0.4, 1, 1);
    if (b.id === 8 && (b.inhale > 0 || b.tell > 0)) this.push(bx, by + R * 0.1, R * (0.6 + 0.2 * Math.sin(time * 18)), 1, 0.5, 0.2, 0.7, 0);
    if (b.id === 4) for (const p of b.parts) {
      if (p.hp <= 0) continue;
      this.push(X(p.x), Y(p.y), s * 0.05, 0.6, 0.85, 1, 0.35, 0);
      this.push(X(p.x), Y(p.y), s * 0.028, 0.75, 0.9, 1, 1, 4, p.x * 9, time * 0.5);
      this.push(X(p.x), Y(p.y), s * 0.04, 0.7, 0.9, 1, 1, 13, p.hp / p.max);
    }
  }

  private drawHazard(w: World, h: Hazard, time: number, X: (x: number) => number, Y: (y: number) => number): void {
    const s = this.pw;
    const blink = 0.55 + 0.45 * Math.sin(time * 18);
    const lane = w.laneLen;
    const red: [number, number, number] = h.look === 3 ? [0.5, 0.75, 1] : h.look === 6 ? [0.6, 0.4, 0.9] : [1, 0.18, 0.15];
    if (h.kind === 'drop') {
      if (h.warn > 0) {
        // a column of red down to the Sower
        const top = w.top, bot = w.sowerY + 0.05, mid = (top + bot) / 2, half = (bot - top) / 2;
        this.push(X(h.x), Y(mid), s * half, red[0], red[1], red[2], 0.12 + 0.12 * blink, 12, 0, 0, h.w / (2 * half));
        this.push(X(h.x), Y(w.sowerY), s * h.w * 0.55, red[0], red[1], red[2], 0.35 * blink, 2);
        return;
      }
      const x = X(h.x), y = Y(h.y), r = s * h.w * 0.62;
      // a streak behind it, and its shadow growing at the Sower's line
      this.push(x, y - r * 1.4, r * 0.9, 1, 0.4, 0.25, 0.3, 0, 0, Math.PI / 2, 2.2);
      const near = Math.max(0, 1 - Math.abs(w.sowerY - h.y) / 0.6);
      this.push(x, Y(w.sowerY), s * h.w * 0.5 * (0.5 + near), 1, 0.2, 0.15, 0.25 + 0.4 * near, 0);
      if (h.look === 1) this.push(x, y, r, 0, 0, 0, 1, 8, h.x * 7, time * 2, 1);
      else if (h.look === 2) { this.push(x, y, r * 1.1, 1, 1, 1, 0, 11, 1); for (const e of [-1, 1]) this.push(x + e * r * 0.4, y + r * 0.3, r * 0.25, 1, 0.6, 0.2, 1, 1); }
      else if (h.look === 3) { this.push(x, y, r * 1.6, 0.6, 0.85, 1, 0.4, 0); this.push(x, y, r * 0.9, 0.85, 0.95, 1, 1, 4, h.x, time); }
      else if (h.look === 4) { this.push(x, y, r * 1.5, 0.4, 0.3, 0.6, 0.4, 0); this.push(x, y, r * 1.2, 1, 1, 1, 0, 11, 7); }
      else if (h.look === 7) { this.push(x, y, r * 1.4, 0.5, 0.45, 0.6, 0.3, 0); this.push(x, y, r * 0.8, 0.55, 0.53, 0.62, 1, 4, h.x, time * 3); }
      else { this.push(x, y, r * 1.8, 1, 0.45, 0.2, 0.5, 0); this.push(x, y, r * 0.8, 1, 0.75, 0.4, 1, 5, h.x, time * 4); }
      return;
    }
    if (h.kind === 'dust') {
      const mid = h.y + h.w / 2;
      this.push(X(h.x), Y(mid), s * h.w / 2, red[0], red[1], red[2], h.warn > 0 ? 0.12 * blink : 0.32, 12, 0, 0, h.gapW / h.w);
      return;
    }
    // band (at the Sower's line) or wall (descending): red everywhere except the gaps
    const y = h.kind === 'band' ? w.sowerY : h.y;
    const thick = h.kind === 'band' ? 0.035 : 0.03;
    const active = h.warn <= 0;
    const col: [number, number, number] = h.look === 5 ? [0.9, 0.35, 0.3] : h.look === 2 ? [0.55, 0.42, 0.3] : [1, 0.42, 0.18];
    const edges = [0.03];
    for (const g of [...h.gaps].sort((a, b) => a - b)) edges.push(g - h.gapW / 2, g + h.gapW / 2);
    edges.push(0.97);
    for (let i = 0; i < edges.length; i += 2) {
      const a = Math.max(0.03, edges[i]), b = Math.min(0.97, edges[i + 1]);
      if (b <= a) continue;
      const cx = (a + b) / 2, half = (b - a) / 2;
      if (!active) this.push(X(cx), Y(y), s * thick, red[0], red[1], red[2], 0.2 + 0.25 * blink, 12, 0, 0, half / thick);
      else {
        this.push(X(cx), Y(y), s * thick, col[0], col[1], col[2], 0.9, 12, 0, 0, half / thick);
        this.push(X(cx), Y(y), s * thick * 2.5, col[0], col[1], col[2], 0.35, 0, 0, 0, half / (thick * 2.5));
      }
    }
    if (h.kind === 'wall' && !active) this.push(X(0.5), Y(w.top + 0.02), s * 0.02, red[0], red[1], red[2], 0.4 * blink, 12, 0, 0, 0.47 / 0.02);
    void lane;
  }

  private bindQuad(p: WebGLProgram): void {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    const loc = gl.getAttribLocation(p, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 8, 0);
    for (let i = 0; i < 8; i++) if (i !== loc) gl.disableVertexAttribArray(i);
  }
}
