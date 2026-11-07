/**
 * COMETA's renderer: WebGL at the screen's native resolution (scaled down automatically on slow
 * phones). Two passes: a living nebula (fbm noise in a fragment shader, drawn at quarter
 * resolution and stretched smooth), then every sprite in one batch, each one shaped in the
 * fragment shader (soft glows, the white-hot comet core, lit rocks with craters, black holes
 * with a swirling accretion disc, rings) and blended additively or over, in draw order.
 */
import type { World } from './world';
import { COMET_R, ORB_R } from './world';

const VS_SPRITE = `
attribute vec2 aPos; attribute vec2 aUv; attribute vec4 aCol; attribute vec2 aK;
uniform vec2 uRes;
varying vec2 vUv; varying vec4 vCol; varying vec2 vK;
void main() {
  vUv = aUv; vCol = aCol; vK = aK;
  vec2 c = aPos / uRes * 2.0 - 1.0;
  gl_Position = vec4(c.x, -c.y, 0.0, 1.0);
}`;

const FS_SPRITE = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform float uT;
varying vec2 vUv; varying vec4 vCol; varying vec2 vK;
void main() {
  float k = vK.x, s = vK.y;
  float r = length(vUv);
  vec4 o = vec4(0.0);
  if (k < 0.5) { // soft glow, additive
    float a = exp(-r * r * 4.5) * (1.0 - smoothstep(0.8, 1.0, r));
    o = vec4(vCol.rgb * a * vCol.a, 0.0);
  } else if (k < 1.5) { // white-hot core
    float a = exp(-r * r * 9.0) + 0.35 * exp(-r * r * 2.2);
    a *= 1.0 - smoothstep(0.85, 1.0, r);
    o = vec4(mix(vCol.rgb, vec3(1.0), exp(-r * r * 16.0)) * a * vCol.a, 0.0);
  } else if (k < 2.5) { // rock, lit, over
    float ang = atan(vUv.y, vUv.x);
    float edge = 0.8 + 0.07 * sin(ang * 3.0 + s * 6.0) + 0.05 * sin(ang * 7.0 + s * 13.0) + 0.03 * sin(ang * 13.0 + s * 3.0);
    if (r > edge) discard;
    vec2 q = vUv / edge;
    vec3 n = normalize(vec3(q, sqrt(max(0.0, 1.0 - dot(q, q)))));
    float l = clamp(dot(n, normalize(vec3(-0.45, 0.55, 0.7))), 0.0, 1.0);
    float cr = 1.0;
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      vec2 cc = vec2(sin(s * 9.0 + fi * 2.1), cos(s * 7.0 + fi * 1.7)) * 0.42;
      float rad = 0.12 + 0.1 * fract(s * 5.3 + fi * 0.37);
      float dd = length(q - cc);
      cr *= mix(0.62, 1.0, smoothstep(rad - 0.04, rad + 0.02, dd));
      cr *= 1.0 + 0.25 * smoothstep(rad + 0.06, rad + 0.01, dd) * smoothstep(rad - 0.02, rad + 0.01, dd);
    }
    vec3 base = vCol.rgb * (0.18 + 0.95 * l) * cr;
    base += vec3(0.45, 0.25, 0.8) * pow(1.0 - n.z, 3.0) * 0.9; // nebula rim light
    float aa = 1.0 - smoothstep(edge - 0.04, edge, r);
    o = vec4(base * aa * vCol.a, aa * vCol.a);
  } else if (k < 3.5) { // black hole shadow, over
    float core = smoothstep(0.44, 0.4, r);
    float halo = smoothstep(1.0, 0.35, r) * 0.7;
    o = vec4(0.0, 0.0, 0.0, max(core, halo) * vCol.a);
  } else if (k < 4.5) { // accretion disc, additive
    float ang = atan(vUv.y, vUv.x);
    float band = exp(-pow((r - 0.52) / 0.07, 2.0));
    float sw = 0.55 + 0.45 * sin(ang * 3.0 - uT * 5.0 + r * 14.0);
    float outer = exp(-pow((r - 0.6) / 0.25, 2.0)) * 0.3 * (0.6 + 0.4 * sin(ang * 5.0 + uT * 3.0));
    float hot = exp(-pow((r - 0.46) / 0.025, 2.0)) * 1.4;
    o = vec4((vCol.rgb * (band * sw + outer) + vec3(1.0, 0.9, 0.8) * hot) * vCol.a, 0.0);
  } else if (k < 5.5) { // thin ring, additive
    float band = exp(-pow((r - 0.85) / 0.05, 2.0));
    o = vec4(vCol.rgb * band * vCol.a, 0.0);
  } else { // flat tint over
    o = vec4(vCol.rgb * vCol.a, vCol.a);
  }
  gl_FragColor = o;
}`;

const VS_QUAD = `
attribute vec2 aPos;
varying vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FS_NEBULA = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes; uniform float uT; uniform float uCam; uniform vec3 uA; uniform vec3 uB; uniform vec3 uC;
varying vec2 vUv;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}
void main() {
  vec2 p = vec2(vUv.x * uRes.x / uRes.y, vUv.y) * 1.4;
  p.y += uCam;
  vec2 q = vec2(fbm(p * 1.3 + uT * 0.015), fbm(p * 1.3 + vec2(4.1, 1.3) - uT * 0.012));
  float n = fbm(p * 1.9 + q * 2.2);
  float m = smoothstep(0.3, 0.95, n);
  vec3 col = vec3(0.012, 0.008, 0.03);
  col = mix(col, uA * 1.25, m * 0.95);
  float w = fbm(p * 3.1 + q * 3.0 - uT * 0.01);
  col = mix(col, uB, smoothstep(0.5, 0.95, w) * 0.75);
  col += uC * pow(m, 5.0) * 0.9;
  // dark dust lanes
  col *= 0.55 + 0.45 * smoothstep(0.2, 0.6, fbm(p * 2.6 - q));
  vec2 v = vUv - 0.5;
  col *= 1.0 - dot(v, v) * 1.1;
  gl_FragColor = vec4(col, 1.0);
}`;

const FS_BLIT = `
precision mediump float;
uniform sampler2D uTex; uniform float uFlash; uniform vec3 uFlashCol;
varying vec2 vUv;
void main() { gl_FragColor = vec4(texture2D(uTex, vUv).rgb + uFlashCol * uFlash, 1.0); }`;

/** Nebula palettes, one per sector (every 600 km): deep colour, wisps, hot cores. */
const PALETTES: [number, number, number][][] = [
  [[0.16, 0.05, 0.32], [0.05, 0.28, 0.45], [0.9, 0.45, 0.85]],
  [[0.05, 0.16, 0.34], [0.32, 0.08, 0.36], [0.4, 0.85, 1.0]],
  [[0.3, 0.06, 0.12], [0.36, 0.2, 0.05], [1.0, 0.7, 0.35]],
  [[0.04, 0.22, 0.18], [0.1, 0.1, 0.38], [0.5, 1.0, 0.75]],
  [[0.22, 0.04, 0.3], [0.38, 0.06, 0.12], [1.0, 0.45, 0.6]],
];

interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; r: number; g: number; b: number; kind: number }

const FLOATS = 10; // x y u v r g b a kind seed

function compile(gl: WebGLRenderingContext, vs: string, fs: string): WebGLProgram {
  const mk = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
    return s;
  };
  const p = gl.createProgram()!;
  gl.attachShader(p, mk(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'link');
  return p;
}

export class Renderer {
  readonly gl: WebGLRenderingContext;
  private sprite: WebGLProgram;
  private nebula: WebGLProgram;
  private blit: WebGLProgram;
  private quad: WebGLBuffer;
  private vbo: WebGLBuffer;
  private data = new Float32Array(FLOATS * 6 * 4096);
  private n = 0;
  private fbo: WebGLFramebuffer | null = null;
  private tex: WebGLTexture | null = null;
  private fw = 0;
  private fh = 0;
  private particles: Particle[] = [];
  private trail: { x: number; y: number }[] = [];
  private flash = 0;
  private flashCol: [number, number, number] = [1, 1, 1];
  private shake = 0;
  /** palette blend: current colours ease towards the sector's */
  private pal: number[] = PALETTES[0].flat();
  /** device pixels per CSS pixel actually used (lowered on slow devices) */
  pixelRatio = 1;
  /** playfield: left edge and width in device pixels */
  ox = 0;
  pw = 1;
  W = 1;
  H = 1;

  constructor(readonly canvas: HTMLCanvasElement) {
    const opts: WebGLContextAttributes = { antialias: false, alpha: false, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'high-performance' };
    const gl = (canvas.getContext('webgl2', opts) ?? canvas.getContext('webgl', opts)) as WebGLRenderingContext | null;
    if (!gl) throw new Error('WebGL indisponivel');
    this.gl = gl;
    this.sprite = compile(gl, VS_SPRITE, FS_SPRITE);
    this.nebula = compile(gl, VS_QUAD, FS_NEBULA);
    this.blit = compile(gl, VS_QUAD, FS_BLIT);
    this.quad = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    this.vbo = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, this.data.byteLength, gl.DYNAMIC_DRAW);
  }

  /** Sizes the drawing buffer: CSS size x pixel ratio, playfield width capped for wide screens. */
  resize(cssW: number, cssH: number, ratio: number): void {
    this.pixelRatio = ratio;
    const w = Math.max(1, Math.round(cssW * ratio)), h = Math.max(1, Math.round(cssH * ratio));
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    this.W = w; this.H = h;
    this.pw = Math.min(w, h * 0.62);
    this.ox = (w - this.pw) / 2;
    const fw = Math.max(64, Math.round(w / 4)), fh = Math.max(64, Math.round(h / 4));
    if (fw !== this.fw || fh !== this.fh) this.makeTarget(fw, fh);
  }

  /** Playfield height in playfield widths (the world's H). */
  get fieldH(): number {
    return this.H / this.pw;
  }

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

  // ---------- effects fed by world events ----------

  burst(x: number, y: number, n: number, col: [number, number, number], speed: number, size: number, life = 0.7): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = speed * (0.3 + Math.random() * 0.7);
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, max: life, size: size * (0.5 + Math.random()), r: col[0], g: col[1], b: col[2], kind: 0 });
    }
    if (this.particles.length > 900) this.particles.splice(0, this.particles.length - 900);
  }

  ring(x: number, y: number, col: [number, number, number], size: number): void {
    this.particles.push({ x, y, vx: 0, vy: 0, life: 0.45, max: 0.45, size, r: col[0], g: col[1], b: col[2], kind: 5 });
  }

  hitFlash(col: [number, number, number], amount: number, shake: number): void {
    this.flash = Math.max(this.flash, amount);
    this.flashCol = col;
    this.shake = Math.max(this.shake, shake);
  }

  reset(): void {
    this.particles = [];
    this.trail = [];
    this.flash = 0;
    this.shake = 0;
  }

  // ---------- drawing ----------

  private push(x: number, y: number, half: number, r: number, g: number, b: number, a: number, kind: number, seed = 0, angle = 0): void {
    if (this.n >= 4096) return;
    if (x + half < 0 || x - half > this.W || y + half < 0 || y - half > this.H) return;
    const c = Math.cos(angle) * half, s = Math.sin(angle) * half;
    const d = this.data;
    let o = this.n * 6 * FLOATS;
    const corner = (u: number, v: number) => {
      d[o] = x + u * c - v * s; d[o + 1] = y + u * s + v * c; d[o + 2] = u; d[o + 3] = v;
      d[o + 4] = r; d[o + 5] = g; d[o + 6] = b; d[o + 7] = a; d[o + 8] = kind; d[o + 9] = seed;
      o += FLOATS;
    };
    corner(-1, -1); corner(1, -1); corner(-1, 1); corner(-1, 1); corner(1, -1); corner(1, 1);
    this.n++;
  }

  draw(w: World, time: number, dt: number, playing: boolean): void {
    const gl = this.gl;
    const s = this.pw;
    const shx = this.shake > 0 ? (Math.random() - 0.5) * this.shake * s * 0.03 : 0;
    const shy = this.shake > 0 ? (Math.random() - 0.5) * this.shake * s * 0.03 : 0;
    this.shake = Math.max(0, this.shake - dt * 3);
    const X = (x: number) => this.ox + x * s + shx;
    const Y = (y: number) => this.H - (y - w.camY) * s + shy;

    // palette eases to the sector's colours
    const target = PALETTES[w.sector % PALETTES.length].flat();
    for (let i = 0; i < 9; i++) this.pal[i] += (target[i] - this.pal[i]) * Math.min(1, dt * 0.8);

    // pass 1: nebula at quarter resolution
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.viewport(0, 0, this.fw, this.fh);
    gl.useProgram(this.nebula);
    gl.disable(gl.BLEND);
    this.bindQuad(this.nebula);
    gl.uniform2f(gl.getUniformLocation(this.nebula, 'uRes'), this.fw, this.fh);
    gl.uniform1f(gl.getUniformLocation(this.nebula, 'uT'), time % 1000);
    gl.uniform1f(gl.getUniformLocation(this.nebula, 'uCam'), (w.camY * 0.12) % 500);
    gl.uniform3f(gl.getUniformLocation(this.nebula, 'uA'), this.pal[0], this.pal[1], this.pal[2]);
    gl.uniform3f(gl.getUniformLocation(this.nebula, 'uB'), this.pal[3], this.pal[4], this.pal[5]);
    gl.uniform3f(gl.getUniformLocation(this.nebula, 'uC'), this.pal[6], this.pal[7], this.pal[8]);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // stretched to the screen, with the hit flash
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.W, this.H);
    gl.useProgram(this.blit);
    this.bindQuad(this.blit);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.uniform1i(gl.getUniformLocation(this.blit, 'uTex'), 0);
    gl.uniform1f(gl.getUniformLocation(this.blit, 'uFlash'), this.flash);
    gl.uniform3f(gl.getUniformLocation(this.blit, 'uFlashCol'), this.flashCol[0], this.flashCol[1], this.flashCol[2]);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    this.flash = Math.max(0, this.flash - dt * 2.5);

    // pass 2: sprites
    this.n = 0;
    const px = this.pixelRatio;
    // stars in three parallax layers across the whole screen
    for (let layer = 0; layer < 3; layer++) {
      const par = [0.12, 0.3, 0.6][layer], count = [90, 60, 30][layer];
      const size = [1.1, 1.6, 2.4][layer] * px;
      for (let i = 0; i < count; i++) {
        const hx = fract(Math.sin(i * 12.9898 + layer * 78.233) * 43758.5453);
        const hy = fract(Math.sin(i * 39.3468 + layer * 11.135) * 24634.6345);
        const yy = fract(hy - (w.camY * par) / (this.H / s));
        const tw = 0.6 + 0.4 * Math.sin(time * (1 + hx * 3) + i);
        const x = hx * this.W, y = this.H - yy * this.H;
        this.push(x, y, size * 3, 0.8 + hx * 0.2, 0.85, 1, 0.55 * tw * (0.5 + layer * 0.25), 0);
        if (layer === 2 && i % 6 === 0) this.push(x, y, size * 9, 0.6, 0.7, 1, 0.12 * tw, 0);
      }
    }

    // gates: two beacons and a dotted beam
    for (const g of w.gates) {
      const col: [number, number, number] = g.passed ? [0.4, 1, 0.6] : g.missed ? [0.6, 0.3, 0.4] : [0.45, 0.85, 1];
      const y = Y(g.y);
      const n = Math.max(2, Math.round((g.x2 - g.x1) / 0.025));
      for (let i = 1; i < n; i++) {
        const x = X(g.x1 + ((g.x2 - g.x1) * i) / n);
        this.push(x, y, s * 0.012, col[0], col[1], col[2], 0.35 + 0.25 * Math.sin(time * 8 - i), 0);
      }
      for (const gx of [g.x1, g.x2]) {
        this.push(X(gx), y, s * 0.06, col[0], col[1], col[2], 0.7, 0);
        this.push(X(gx), y, s * 0.022, col[0], col[1], col[2], 1, 1);
        this.push(X(gx), y, s * 0.04, col[0], col[1], col[2], 0.8, 5);
      }
    }

    // black holes: reach ring, shadow, accretion disc
    for (const h of w.holes) {
      const x = X(h.x), y = Y(h.y), size = (h.core / 0.42) * s;
      this.push(x, y, h.reach * s, 0.6, 0.4, 1, 0.18, 5);
      this.push(x, y, size * 2.2, 0, 0, 0, 1, 3);
      this.push(x, y, size * 1.7, 1, 0.55, 0.25, 1, 4, 0, time * 0.3);
      this.push(x, y, size * 1.2, 0.7, 0.4, 1, 0.8, 4, 0, -time * 0.5);
    }

    // rocks
    for (const r of w.rocks) {
      const tint = 0.75 + r.seed * 0.25;
      this.push(X(r.x), Y(r.y), r.r * s * 1.15, 0.62 * tint, 0.54 * tint, 0.58 * tint, 1, 2, r.seed * 10, r.a);
    }

    // light orbs
    for (const o of w.orbs) {
      if (o.taken) continue;
      const p = 0.8 + 0.2 * Math.sin(time * 5 + o.phase);
      this.push(X(o.x), Y(o.y), ORB_R * s * 3.2 * p, 1, 0.8, 0.35, 0.55, 0);
      this.push(X(o.x), Y(o.y), ORB_R * s * 1.1, 1, 0.92, 0.6, 1, 1);
    }

    // the comet: trail, glow, core
    const c = w.comet;
    if (playing) {
      this.trail.unshift({ x: c.x, y: c.y });
      if (this.trail.length > 46) this.trail.length = 46;
      if (Math.random() < 0.7) this.particles.push({ x: c.x + (Math.random() - 0.5) * 0.02, y: c.y - 0.01, vx: (Math.random() - 0.5) * 0.08, vy: -0.15 - Math.random() * 0.2, life: 0.6, max: 0.6, size: 0.008 + Math.random() * 0.01, r: 0.5, g: 0.8, b: 1, kind: 0 });
    }
    const dash = w.dashT > 0;
    const blink = w.inv > 0 && !dash && Math.floor(time * 14) % 2 === 0;
    for (let i = this.trail.length - 1; i >= 1; i--) {
      const p = this.trail[i], k = 1 - i / this.trail.length;
      const ty = p.y; // world points left behind: the trail streams down as the camera climbs
      const rr = dash ? 1 : 0.35 + 0.4 * k, gg = dash ? 0.6 + 0.3 * k : 0.6 + 0.35 * k, bb = dash ? 0.25 : 1;
      this.push(X(p.x), Y(ty), s * (0.012 + 0.03 * k) * (dash ? 1.4 : 1), rr, gg, bb, 0.5 * k, 0);
    }
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 1 - dt * 1.5; p.vy *= 1 - dt * 1.5;
      const k = Math.max(0, p.life / p.max);
      if (p.kind === 5) this.push(X(p.x), Y(p.y), s * p.size * (1.6 - k), p.r, p.g, p.b, k, 5);
      else this.push(X(p.x), Y(p.y), s * p.size * (0.4 + k), p.r, p.g, p.b, k, 0);
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    if (!w.over && !blink) {
      const cx = X(c.x), cy = Y(c.y);
      this.push(cx, cy, s * 0.2, dash ? 1 : 0.35, dash ? 0.6 : 0.65, dash ? 0.3 : 1, dash ? 0.75 : 0.5, 0);
      this.push(cx, cy, s * COMET_R * 2.6, dash ? 1 : 0.7, dash ? 0.85 : 0.9, 1, 1, 1);
      // shield sparks orbit the head, one per remaining point
      for (let i = 0; i < w.shield; i++) {
        const a = time * 3 + (i / Math.max(1, w.shield)) * Math.PI * 2;
        this.push(cx + Math.cos(a) * s * 0.045, cy + Math.sin(a) * s * 0.045, s * 0.012, 0.6, 0.9, 1, 0.9, 1);
      }
    }

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

  private bindQuad(p: WebGLProgram): void {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    const loc = gl.getAttribLocation(p, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 8, 0);
    // the sprite attributes stay disabled while the quad programs draw
    for (let i = 0; i < 8; i++) if (i !== loc) gl.disableVertexAttribArray(i);
  }

  /** Screen position (CSS px) of a world point, for HTML pop-ups. */
  toCss(w: World, x: number, y: number): [number, number] {
    return [(this.ox + x * this.pw) / this.pixelRatio, (this.H - (y - w.camY) * this.pw) / this.pixelRatio];
  }
}

function fract(v: number): number {
  return v - Math.floor(v);
}
