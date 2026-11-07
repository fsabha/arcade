/**
 * LUME's renderer: WebGL at native resolution with adaptive quality, like COMETA's, but the
 * world is dark. Up to 24 point lights (Lume, its tail, loose lights, lanterns) are sent as
 * uniforms and every lit pixel, the water behind and the creatures in front, is shaded by them:
 * what you carry is literally what you can see. Creatures keep a faint bioluminescent rim so they
 * read in the dark.
 */
import type { World } from './world';
import { LUME_R, LIGHT_R, INVULNERABLE } from './world';

const LIGHTS = 24;

const LIGHT_FN = `
uniform vec3 uL[${LIGHTS}];
uniform vec3 uLC[${LIGHTS}];
uniform float uN;
uniform float uAmb;
vec3 lightAt(vec2 p) {
  vec3 acc = vec3(0.18, 0.42, 0.55) * uAmb;
  for (int i = 0; i < ${LIGHTS}; i++) {
    if (float(i) >= uN) break;
    vec3 L = uL[i];
    float d = length(p - L.xy) / L.z;
    acc += uLC[i] * exp(-d * d * 2.4);
  }
  return acc;
}`;

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
uniform float uT; uniform vec2 uRes;
varying vec2 vUv; varying vec4 vCol; varying vec2 vK;
${LIGHT_FN}
void main() {
  float k = vK.x, s = vK.y;
  bool lit = k >= 50.0;
  if (lit) k -= 50.0;
  float r = length(vUv);
  vec4 o = vec4(0.0);
  if (k < 0.5) { // soft glow, additive
    float a = exp(-r * r * 4.5) * (1.0 - smoothstep(0.8, 1.0, r));
    o = vec4(vCol.rgb * a * vCol.a, 0.0);
  } else if (k < 1.5) { // hot core
    float a = exp(-r * r * 9.0) + 0.35 * exp(-r * r * 2.2);
    a *= 1.0 - smoothstep(0.85, 1.0, r);
    o = vec4(mix(vCol.rgb, vec3(1.0, 0.97, 0.9), exp(-r * r * 16.0)) * a * vCol.a, 0.0);
  } else if (k < 2.5) { // debris (a broken stone block), over
    vec2 q = abs(vUv);
    float edge = max(q.x * (0.95 + 0.1 * sin(s * 7.0)), q.y * (1.05 + 0.1 * cos(s * 5.0))) + 0.06 * sin(atan(vUv.y, vUv.x) * 5.0 + s * 9.0);
    if (edge > 0.82) discard;
    float l = 0.55 + 0.45 * clamp(-vUv.y * 0.6 - vUv.x * 0.3 + 0.4, 0.0, 1.0);
    float crack = smoothstep(0.03, 0.0, abs(vUv.x * 0.7 + vUv.y * 0.3 - 0.2 * sin(s * 11.0)));
    vec3 base = vCol.rgb * l * (1.0 - crack * 0.5);
    float aa = 1.0 - smoothstep(0.78, 0.82, edge);
    o = vec4(base * aa, aa * vCol.a);
  } else if (k < 5.5) { // ring, additive
    float band = exp(-pow((r - 0.85) / 0.05, 2.0));
    o = vec4(vCol.rgb * band * vCol.a, 0.0);
  } else if (k < 6.5) { // flat over
    o = vec4(vCol.rgb * vCol.a, vCol.a);
  } else if (k < 9.5) { // jellyfish: dome and waving tentacles, translucent
    float a = 0.0;
    vec2 q = vUv;
    float dome = (q.x / 0.85) * (q.x / 0.85) + ((q.y + 0.1) / 0.75) * ((q.y + 0.1) / 0.75);
    if (q.y < 0.05 && dome < 1.0) a = 0.55 + 0.45 * smoothstep(0.55, 1.0, dome);
    if (q.y > -0.05) {
      for (int i = 0; i < 4; i++) {
        float fi = float(i);
        float x0 = -0.55 + fi * 0.37;
        float wob = sin(q.y * 7.0 - uT * 3.0 + fi * 1.7 + s * 6.0) * 0.1 * (q.y + 0.1);
        a = max(a, smoothstep(0.06, 0.0, abs(q.x - x0 - wob)) * (1.0 - smoothstep(0.6, 0.95, q.y)));
      }
    }
    o = vec4(vCol.rgb * a * vCol.a, a * 0.8 * vCol.a);
  } else if (k < 11.5) { // eel: a wavy body along u
    float wave = sin(vUv.x * 7.0 - uT * 9.0 + s * 6.0) * 0.14 * (0.4 + 0.6 * (vUv.x * 0.5 + 0.5));
    float th = 0.26 * (1.0 - vUv.x * vUv.x);
    float d = abs(vUv.y - wave);
    if (d > th) discard;
    float sh = 0.6 + 0.4 * (1.0 - d / th);
    o = vec4(vCol.rgb * sh, 1.0) * vCol.a;
  } else if (k < 12.5) { // sea mine: spiked ball
    float ang = atan(vUv.y, vUv.x);
    float spikes = 0.62 + 0.3 * pow(max(0.0, cos(ang * 4.0)), 14.0) + 0.3 * pow(max(0.0, cos(ang * 4.0 + 0.785)), 14.0);
    if (r > spikes) discard;
    vec2 q = vUv / 0.62;
    float nz = sqrt(max(0.0, 1.0 - dot(q, q)));
    float l = 0.35 + 0.65 * clamp(dot(vec3(q, nz), normalize(vec3(-0.4, -0.6, 0.7))), 0.0, 1.0);
    o = vec4(vCol.rgb * (r > 0.62 ? 0.6 : l), 1.0) * vCol.a;
  } else { // lantern: a glass cage with a flame inside, additive
    vec2 q = abs(vUv);
    float frame = smoothstep(0.06, 0.0, abs(max(q.x * 1.4, q.y) - 0.7)) + smoothstep(0.04, 0.0, q.x) * step(q.y, 0.7) * 0.5;
    float flame = exp(-(vUv.x * vUv.x * 18.0 + pow(vUv.y - 0.1, 2.0) * 6.0)) * (0.8 + 0.2 * sin(uT * 13.0 + s * 3.0));
    o = vec4(vCol.rgb * (frame * 0.7 + flame * 1.4) * vCol.a, 0.0);
  }
  if (lit) {
    vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
    o.rgb *= lightAt(p);
  }
  gl_FragColor = o;
}`;

const VS_QUAD = `
attribute vec2 aPos;
varying vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FS_WATER = `${HEAD}
uniform vec2 uRes; uniform vec2 uFull; uniform float uT; uniform float uCam; uniform vec3 uDeep; uniform vec3 uShallow; uniform float uDepthK;
varying vec2 vUv;
${LIGHT_FN}
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.1 + 3.7; a *= 0.5; } return v; }
void main() {
  vec2 p = vec2(vUv.x * uRes.x / uRes.y, 1.0 - vUv.y) * 1.6;
  p.y += uCam;
  // murky water with slow currents
  float n = fbm(p * 1.6 + vec2(uT * 0.03, -uT * 0.02));
  vec3 water = mix(uDeep, uShallow, (1.0 - vUv.y * 0.0) * (0.25 + 0.75 * n) * uDepthK);
  // caustics: bright netting that only shows where there is light
  vec2 c = p * 5.0;
  float ca = abs(sin(c.x + fbm(c * 0.5 + uT * 0.4) * 4.0) * sin(c.y * 0.8 + fbm(c * 0.45 - uT * 0.3) * 4.0));
  float caustic = pow(1.0 - ca, 8.0);
  vec2 px = vec2(vUv.x, 1.0 - vUv.y) * uFull;
  vec3 light = lightAt(px);
  vec3 col = water * (0.18 + light * 1.1) + vec3(0.5, 0.8, 0.85) * caustic * (light.g * 0.35 + uDepthK * 0.12);
  col += light * vec3(0.16, 0.09, 0.025); // warm spill of the carried light
  // light shafts from the surface, fading with depth
  float shaft = pow(max(0.0, sin(vUv.x * 9.0 + p.y * 0.4 + sin(uT * 0.2) * 2.0)), 6.0) * vUv.y * uDepthK;
  col += vec3(0.25, 0.45, 0.5) * shaft * 0.35;
  vec2 v = vUv - 0.5;
  col *= 1.0 - dot(v, v) * 1.3;
  gl_FragColor = vec4(col, 1.0);
}`;

const FS_BLIT = `
precision mediump float;
uniform sampler2D uTex; uniform float uFlash; uniform vec3 uFlashCol; uniform float uLow;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(uTex, vUv).rgb;
  vec2 v = vUv - 0.5;
  // low light: the dark closes in from the edges
  c *= 1.0 - smoothstep(0.35 - uLow * 0.25, 0.75 - uLow * 0.3, length(v)) * uLow * 0.9;
  gl_FragColor = vec4(c + uFlashCol * uFlash, 1.0);
}`;

/** Water per sector: deep colour, shallow colour. */
const WATERS: [number, number, number][][] = [
  [[0.02, 0.07, 0.11], [0.1, 0.32, 0.4]],
  [[0.02, 0.08, 0.06], [0.08, 0.3, 0.2]],
  [[0.03, 0.05, 0.1], [0.12, 0.18, 0.32]],
  [[0.05, 0.02, 0.07], [0.2, 0.08, 0.25]],
  [[0.01, 0.01, 0.03], [0.06, 0.06, 0.14]],
];

interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; r: number; g: number; b: number; kind: number }

const FLOATS = 10;

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

export class Renderer {
  readonly gl: WebGLRenderingContext;
  private sprite: WebGLProgram;
  private water: WebGLProgram;
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
  private flash = 0;
  private flashCol: [number, number, number] = [1, 1, 1];
  private shake = 0;
  private water0: number[] = WATERS[0].flat();
  private lights = new Float32Array(LIGHTS * 3);
  private lightCols = new Float32Array(LIGHTS * 3);
  private nLights = 0;
  pixelRatio = 1;
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
    this.water = compile(gl, VS_QUAD, FS_WATER);
    this.blit = compile(gl, VS_QUAD, FS_BLIT);
    this.quad = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    this.vbo = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, this.data.byteLength, gl.DYNAMIC_DRAW);
  }

  resize(cssW: number, cssH: number, ratio: number): void {
    this.pixelRatio = ratio;
    const w = Math.max(1, Math.round(cssW * ratio)), h = Math.max(1, Math.round(cssH * ratio));
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    this.W = w; this.H = h;
    this.pw = Math.min(w, h * 0.62);
    this.ox = (w - this.pw) / 2;
    const fw = Math.max(64, Math.round(w / 3)), fh = Math.max(64, Math.round(h / 3));
    if (fw !== this.fw || fh !== this.fh) this.makeTarget(fw, fh);
  }

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

  burst(x: number, y: number, n: number, col: [number, number, number], speed: number, size: number, life = 0.7): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = speed * (0.3 + Math.random() * 0.7);
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, max: life, size: size * (0.5 + Math.random()), r: col[0], g: col[1], b: col[2], kind: 0 });
    }
    if (this.particles.length > 700) this.particles.splice(0, this.particles.length - 700);
  }

  ring(x: number, y: number, col: [number, number, number], size: number, life = 0.5): void {
    this.particles.push({ x, y, vx: 0, vy: 0, life, max: life, size, r: col[0], g: col[1], b: col[2], kind: 5 });
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
  }

  private push(x: number, y: number, half: number, r: number, g: number, b: number, a: number, kind: number, seed = 0, angle = 0, stretch = 1): void {
    if (this.n >= 4096) return;
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

  private addLight(x: number, y: number, radius: number, r: number, g: number, b: number): void {
    if (this.nLights >= LIGHTS) return;
    const i = this.nLights * 3;
    this.lights[i] = x; this.lights[i + 1] = y; this.lights[i + 2] = Math.max(1, radius);
    this.lightCols[i] = r; this.lightCols[i + 1] = g; this.lightCols[i + 2] = b;
    this.nLights++;
  }

  private setLights(p: WebGLProgram, scale: number): void {
    const gl = this.gl;
    const L = new Float32Array(this.lights);
    for (let i = 0; i < this.nLights * 3; i++) L[i] *= scale;
    gl.uniform3fv(gl.getUniformLocation(p, 'uL'), L);
    gl.uniform3fv(gl.getUniformLocation(p, 'uLC'), this.lightCols);
    gl.uniform1f(gl.getUniformLocation(p, 'uN'), this.nLights);
  }

  draw(w: World, time: number, dt: number, playing: boolean): void {
    const gl = this.gl;
    const s = this.pw;
    const shx = this.shake > 0 ? (Math.random() - 0.5) * this.shake * s * 0.03 : 0;
    const shy = this.shake > 0 ? (Math.random() - 0.5) * this.shake * s * 0.03 : 0;
    this.shake = Math.max(0, this.shake - dt * 3);
    const X = (x: number) => this.ox + x * s + shx;
    const Y = (y: number) => (y - w.camY) * s + shy;
    const l = w.lume;
    const depthK = Math.max(0.05, 1 - w.camY / 60);
    const amb = 0.25 + 0.75 * depthK;

    // lights, most important first
    this.nLights = 0;
    if (!w.over) this.addLight(X(l.x), Y(l.y), w.radius * s, 1.15 * (0.6 + 0.4 * w.energy), 0.82 * (0.6 + 0.4 * w.energy), 0.5);
    for (const ln of w.lanterns) this.addLight(X(ln.x), Y(ln.y), (ln.lit ? 0.42 : 0.12) * s, ln.lit ? 1.1 : 0.15, ln.lit ? 0.75 : 0.35, ln.lit ? 0.4 : 0.35);
    w.tail.forEach((nd, i) => { if (i % 2 === 0) this.addLight(X(nd.x), Y(nd.y), 0.1 * s, 0.45, 0.32, 0.15); });
    for (const p of w.loose) this.addLight(X(p.x), Y(p.y), 0.08 * s, 0.4 * Math.min(1, p.t), 0.3 * Math.min(1, p.t), 0.12);
    const near = [...w.lights].sort((a, b) => Math.abs(a.y - l.y) - Math.abs(b.y - l.y));
    for (const o of near) this.addLight(X(o.x), Y(o.y), 0.07 * s, 0.35, 0.26, 0.1);

    // water, at a third of the resolution
    const target = WATERS[Math.min(w.sector, WATERS.length - 1)].flat();
    for (let i = 0; i < 6; i++) this.water0[i] += (target[i] - this.water0[i]) * Math.min(1, dt * 0.6);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.viewport(0, 0, this.fw, this.fh);
    gl.useProgram(this.water);
    gl.disable(gl.BLEND);
    this.bindQuad(this.water);
    gl.uniform2f(gl.getUniformLocation(this.water, 'uRes'), this.fw, this.fh);
    gl.uniform2f(gl.getUniformLocation(this.water, 'uFull'), this.W, this.H);
    gl.uniform1f(gl.getUniformLocation(this.water, 'uT'), time % 1000);
    gl.uniform1f(gl.getUniformLocation(this.water, 'uCam'), (w.camY * 0.5) % 500);
    gl.uniform3f(gl.getUniformLocation(this.water, 'uDeep'), this.water0[0], this.water0[1], this.water0[2]);
    gl.uniform3f(gl.getUniformLocation(this.water, 'uShallow'), this.water0[3], this.water0[4], this.water0[5]);
    gl.uniform1f(gl.getUniformLocation(this.water, 'uDepthK'), depthK);
    gl.uniform1f(gl.getUniformLocation(this.water, 'uAmb'), amb * 0.5);
    this.setLights(this.water, 1);
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
    const low = w.over ? 0 : Math.max(0, Math.min(1, (0.3 - w.energy) / 0.3));
    gl.uniform1f(gl.getUniformLocation(this.blit, 'uLow'), low * (0.75 + 0.25 * Math.sin(time * 7)));
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    this.flash = Math.max(0, this.flash - dt * 2.5);

    this.n = 0;
    const px = this.pixelRatio;
    // marine snow: only visible where light falls on it
    for (let layer = 0; layer < 2; layer++) {
      const par = [0.5, 1][layer], count = [70, 50][layer];
      for (let i = 0; i < count; i++) {
        const hx = fract(Math.sin(i * 12.9898 + layer * 78.233) * 43758.5453);
        const hy = fract(Math.sin(i * 39.3468 + layer * 11.135) * 24634.6345);
        const yy = fract(hy - (w.camY * par) / (this.H / s) + time * 0.01 * (1 + hx));
        const x = fract(hx + Math.sin(time * 0.3 + i) * 0.01) * this.W, y = yy * this.H;
        this.push(x, y, (1.4 + layer * 1.2) * px * 2, 0.8, 0.9, 1, 0.5, 50);
      }
    }

    // lanterns
    for (const ln of w.lanterns) {
      const x = X(ln.x), y = Y(ln.y);
      const glowA = ln.lit ? 0.75 : 0.25 + 0.1 * Math.sin(time * 2);
      this.push(x, y, s * (ln.lit ? 0.22 : 0.1), ln.lit ? 1 : 0.4, ln.lit ? 0.7 : 0.75, ln.lit ? 0.35 : 0.85, glowA, 0);
      this.push(x, y, s * 0.06, ln.lit ? 1 : 0.5, ln.lit ? 0.8 : 0.85, ln.lit ? 0.45 : 0.9, ln.lit ? 1 : 0.6, 13, 1);
      if (!ln.lit) this.push(x, y, s * (0.075 + 0.01 * Math.sin(time * 3)), 0.5, 0.9, 1, 0.5, 5);
    }

    // debris: broken stone of the drowned city
    for (const d of w.debris) this.push(X(d.x), Y(d.y), d.r * s * 1.2, 0.55, 0.6, 0.62, 1, 52, d.seed * 10, d.a);

    // creatures, with a faint glow of their own so they read in the dark
    for (const c of w.creatures) {
      const x = X(c.x), y = Y(c.y);
      const stun = c.stun > 0;
      if (c.kind === 'jelly') {
        const pulse = 0.7 + 0.3 * Math.sin(c.phase * 2);
        this.push(x, y, c.r * s * 2.4, 0.6, 0.3, 0.9, (stun ? 0.12 : 0.3) * pulse, 0);
        this.push(x, y + c.r * s * 0.5, c.r * s * 1.5, stun ? 0.5 : 0.8, stun ? 0.5 : 0.55, 1, 0.95, 59, c.seed);
        this.push(x, y + c.r * s * 0.5, c.r * s * 1.5, 0.9, 0.5, 1, stun ? 0.12 : 0.3, 9, c.seed);
      } else if (c.kind === 'eel') {
        this.push(x, y, c.r * s * 3, 0.2, 0.9, 0.8, stun ? 0.08 : 0.2, 0);
        const ang = c.dir > 0 ? 0 : Math.PI;
        this.push(x, y, c.r * s * 1.1, 0.3, 0.6, 0.55, 1, 61, c.seed, ang, 2.6);
        for (let i = 0; i < 4; i++) this.push(x - c.dir * (i - 1.5) * c.r * s * 0.6, y + Math.sin(c.phase + i) * c.r * s * 0.12, s * 0.006, 0.4, 1, 0.9, stun ? 0.3 : 0.9, 1);
      } else {
        const blink = Math.sin(c.phase * 2) > 0.3 && !stun;
        this.push(x, y, c.r * s * 1.25, 0.45, 0.42, 0.48, 1, 62, c.seed, c.phase * 0.2);
        this.push(x, y, c.r * s * (blink ? 1.6 : 0.9), 1, 0.15, 0.3, blink ? 0.55 : 0.15, 0);
        this.push(x, y, c.r * s * 0.3, 1, 0.3, 0.4, blink ? 1 : 0.4, 1);
      }
      if (stun) this.push(x, y, c.r * s * 1.8, 0.6, 0.9, 1, 0.4, 5);
    }

    // free lights
    for (const o of w.lights) {
      const p = 0.8 + 0.2 * Math.sin(time * 4 + o.phase);
      this.push(X(o.x), Y(o.y), LIGHT_R * s * 3.2 * p, 1, 0.68, 0.28, 0.55, 0);
      this.push(X(o.x), Y(o.y), LIGHT_R * s * 1.1, 1, 0.82, 0.5, 1, 1);
    }
    // loose pieces of tail, going out
    for (const p of w.loose) {
      const k = Math.min(1, p.t / 1.2), flick = p.t < 1 && Math.floor(time * 10) % 2 === 0 ? 0.4 : 1;
      this.push(X(p.x), Y(p.y), LIGHT_R * s * 2.8, 1, 0.55, 0.25, 0.5 * k * flick, 0);
      this.push(X(p.x), Y(p.y), LIGHT_R * s, 1, 0.75, 0.45, k * flick, 1);
    }
    // the tail, with a thread of light between the beads
    let prev = { x: l.x, y: l.y };
    w.tail.forEach((nd, i) => {
      const k = 1 - i / Math.max(8, w.tail.length + 2);
      const mx = (prev.x + nd.x) / 2, my = (prev.y + nd.y) / 2;
      this.push(X(mx), Y(my), s * 0.01, 1, 0.7, 0.35, 0.5 * k, 0);
      this.push(X(nd.x), Y(nd.y), LIGHT_R * s * 2.6, 1, 0.65, 0.3, 0.45 * k + 0.1, 0);
      this.push(X(nd.x), Y(nd.y), LIGHT_R * s * 0.95, 1, 0.85, 0.55, 0.9, 1);
      prev = nd;
    });

    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 1 - dt * 1.8; p.vy *= 1 - dt * 1.8;
      const k = Math.max(0, p.life / p.max);
      if (p.kind === 5) this.push(X(p.x), Y(p.y), s * p.size * (1.6 - k), p.r, p.g, p.b, k, 5);
      else this.push(X(p.x), Y(p.y), s * p.size * (0.4 + k), p.r, p.g, p.b, k, 0);
    }
    this.particles = this.particles.filter((p) => p.life > 0);

    // Lume itself
    if (!w.over) {
      if (playing && Math.random() < 0.5) this.particles.push({ x: l.x + (Math.random() - 0.5) * 0.02, y: l.y, vx: (Math.random() - 0.5) * 0.05, vy: -0.08 - Math.random() * 0.08, life: 0.7, max: 0.7, size: 0.006, r: 1, g: 0.75, b: 0.4, kind: 0 });
      const blink = w.inv > INVULNERABLE * 0.15 && Math.floor(time * 14) % 2 === 0;
      const e = 0.5 + 0.5 * w.energy;
      if (!blink) {
        this.push(X(l.x), Y(l.y), s * 0.13 * e, 1, 0.7, 0.35, 0.55, 0);
        this.push(X(l.x), Y(l.y), s * LUME_R * 2.6, 1, 0.82, 0.5, 1, 1);
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
    gl.uniform1f(gl.getUniformLocation(this.sprite, 'uAmb'), amb * 0.6);
    this.setLights(this.sprite, 1);
    gl.drawArrays(gl.TRIANGLES, 0, this.n * 6);
  }

  private bindQuad(p: WebGLProgram): void {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    const loc = gl.getAttribLocation(p, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 8, 0);
    for (let i = 0; i < 8; i++) if (i !== loc) gl.disableVertexAttribArray(i);
  }

  toCss(w: World, x: number, y: number): [number, number] {
    return [(this.ox + x * this.pw) / this.pixelRatio, ((y - w.camY) * this.pw) / this.pixelRatio];
  }
}

function fract(v: number): number {
  return v - Math.floor(v);
}
