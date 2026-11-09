/**
 * RIBOMBA's renderer: WebGL at native resolution with adaptive quality (like BROTO). The sand
 * lane, the canyon walls and the gorge the red river comes down are one shader drawn at a third of
 * the resolution; every soldier, gate, crate, rock, the Bocão and the captains are quads of a single
 * sprite batch, shaped in the fragment shader by their kind. Thousands of soldiers, one draw call.
 */
import type { World, Block, Hazard } from './world';
import { UNIT_R, BOX_H } from './world';
import type { Boss } from './boss';

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

// kinds: 0 glow · 1 hot core · 2 ring · 3 blue soldier · 4 red soldier · 5 crate · 6 gate panel
// 7 cannon parts · 8 rock · 9 captain · 10 flat rect · 11 soft shadow · 12 bomb
const FS_SPRITE = `${HEAD}
uniform float uT;
varying vec2 vUv; varying vec4 vCol; varying vec2 vK;
float box(vec2 p, vec2 b, float r) { vec2 d = abs(p) - b + r; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r; }
float circ(vec2 p, vec2 c, float r) { return length(p - c) - r; }
float fill(float d) { return smoothstep(0.03, -0.03, d); }
void main() {
  float k = vK.x, s = vK.y;
  vec2 q = vUv;
  float r = length(q);
  vec4 o = vec4(0.0);
  if (k < 0.5) {
    float a = exp(-r * r * 4.5) * (1.0 - smoothstep(0.8, 1.0, r));
    o = vec4(vCol.rgb * a * vCol.a, 0.0);
  } else if (k < 1.5) {
    float a = exp(-r * r * 9.0) + 0.35 * exp(-r * r * 2.2);
    a *= 1.0 - smoothstep(0.85, 1.0, r);
    o = vec4(mix(vCol.rgb, vec3(1.0), exp(-r * r * 16.0)) * a * vCol.a, 0.0);
  } else if (k < 2.5) {
    float band = exp(-pow((r - 0.85) / 0.06, 2.0));
    o = vec4(vCol.rgb * band * vCol.a, 0.0);
  } else if (k < 4.5) {
    // a toy soldier from above: shoulders, then the helmet (round for blue, spiked for red)
    bool red = k > 3.5;
    vec3 body = red ? vec3(0.84, 0.2, 0.18) : vec3(0.18, 0.44, 0.88);
    vec3 helm = red ? vec3(0.62, 0.1, 0.1) : vec3(0.12, 0.3, 0.7);
    float sh = box(q - vec2(0.0, red ? -0.12 : 0.12), vec2(0.62, 0.32), 0.3);
    float a = fill(sh);
    vec3 c = body * (0.85 + 0.25 * (-q.x * 0.5 + 0.5));
    float hd = circ(q, vec2(0.0, red ? 0.05 : -0.08), red ? 0.42 : 0.46);
    if (red) { vec2 t = q - vec2(0.0, 0.42); float spike = max(abs(t.x) * 2.6 + t.y - 0.32, -t.y - 0.1); hd = min(hd, spike); }
    float ha = fill(hd);
    float shine = smoothstep(0.35, 0.0, length(q - vec2(-0.12, -0.22)));
    c = mix(c, helm + shine * 0.35, ha);
    vec3 skin = vec3(0.95, 0.79, 0.63);
    // the face peeks out in the direction of the march
    float face = fill(circ(q, vec2(0.0, red ? 0.3 : -0.42), 0.14));
    c = mix(c, skin, face * (1.0 - step(0.5, s)));
    a = max(a, ha);
    o = vec4(c * a, a) * vCol.a;
  } else if (k < 5.5) {
    // a wooden crate (aspect in alpha); s: 0 wood, 1 golden, 2 giant, 3 empty (a trap)
    float ar = vCol.a;
    vec2 p = vec2(q.x * ar, q.y);
    float d = box(p, vec2(ar, 1.0) * 0.96, 0.12);
    if (d > 0.02) discard;
    vec3 wood = s > 0.5 && s < 1.5 ? vec3(1.0, 0.78, 0.25) : s > 1.5 && s < 2.5 ? vec3(0.78, 0.5, 0.22) : s > 2.5 ? vec3(0.5, 0.42, 0.36) : vec3(0.76, 0.52, 0.27);
    float plank = 0.9 + 0.1 * sin(p.y * 9.0 + sin(p.x * 3.0));
    float rim = smoothstep(-0.2, -0.05, d);
    float crs = smoothstep(0.1, 0.04, abs(abs(p.x / ar) - abs(p.y))) * step(abs(p.x), ar - 0.15);
    vec3 c = wood * plank * (1.0 - rim * 0.35);
    c = mix(c, wood * 0.55, crs * 0.6);
    c += vCol.rgb * 0.5;
    float aa = smoothstep(0.02, -0.03, d);
    o = vec4(c * aa, aa);
  } else if (k < 6.5) {
    // a gate: two posts with golden caps and, between them, a panel of coloured glass with a
    // shimmer running across it (aspect in alpha, colour in rgb; s: flash 0..1)
    float ar = vCol.a;
    vec2 p = vec2(q.x * ar, q.y);
    float ex = ar - 0.32;
    // the panel
    float pd = box(p, vec2(ex, 0.78), 0.18);
    float pa = smoothstep(0.03, -0.03, pd);
    float v = q.y * 0.5 + 0.5;
    vec3 base = vCol.rgb;
    vec3 c = mix(base * 1.35 + 0.12, base * 0.62, v);
    float sh = fract((p.x - p.y * 0.6) * 0.35 - uT * 0.6);
    c += smoothstep(0.08, 0.0, abs(sh - 0.5)) * 0.35;
    c += smoothstep(-0.12, -0.02, pd) * 0.35;
    c += (1.0 - smoothstep(0.0, 0.25, v)) * 0.18;
    c += s * 0.4;
    float alpha = pa * 0.86;
    // the posts
    vec2 pp = vec2(abs(p.x) - (ar - 0.17), p.y);
    float post = box(pp, vec2(0.15, 0.98), 0.08);
    float poa = smoothstep(0.03, -0.03, post);
    vec3 pc = vec3(0.32, 0.36, 0.46) * (0.75 + 0.5 * smoothstep(0.12, -0.12, pp.x));
    float cap = smoothstep(0.03, -0.03, box(pp - vec2(0.0, -0.78), vec2(0.17, 0.2), 0.08));
    pc = mix(pc, vec3(1.0, 0.8, 0.3) * (0.8 + 0.4 * smoothstep(0.1, -0.1, pp.x)), cap);
    c = mix(c, pc, poa);
    alpha = max(alpha, poa);
    if (alpha < 0.01) discard;
    o = vec4(c * alpha, alpha);
  } else if (k < 7.5) {
    if (s < 0.5) {
      // the carriage seen from above and behind: a wooden trail with iron bolts, an axle and two
      // spoked wheels with golden rims
      vec2 t = q - vec2(0.0, 0.25);
      float wdt = 0.46 - t.y * 0.12;
      float trail = box(t, vec2(wdt, 0.62), 0.12);
      float ta = fill(trail);
      vec3 wood = vec3(0.6, 0.38, 0.18);
      float grain = 0.85 + 0.12 * sin(t.y * 30.0 + sin(t.x * 9.0) * 2.0);
      vec3 c = wood * grain * (0.75 + 0.45 * smoothstep(0.4, -0.3, t.x));
      c = mix(c, wood * 0.45, smoothstep(-0.1, -0.02, trail));
      float bolts = fill(circ(vec2(abs(t.x), t.y), vec2(wdt - 0.12, -0.35), 0.06)) + fill(circ(vec2(abs(t.x), t.y), vec2(wdt - 0.14, 0.35), 0.06));
      c = mix(c, vec3(0.95, 0.8, 0.35), min(1.0, bolts));
      float a = ta;
      float axle = fill(box(q - vec2(0.0, 0.05), vec2(0.86, 0.07), 0.05));
      c = mix(c, vec3(0.16, 0.14, 0.14), axle * (1.0 - ta * 0.6));
      a = max(a, axle);
      // wheels: ellipses (seen at an angle), spokes, a golden rim and hub
      vec2 wp = vec2(abs(q.x) - 0.8, q.y - 0.05);
      vec2 we = wp / vec2(0.2, 0.52);
      float wr = length(we);
      float wheel = fill((wr - 1.0) * 0.2);
      float rim = smoothstep(0.78, 0.86, wr) * wheel;
      float ang = atan(we.y, we.x);
      float spokes = smoothstep(0.75, 0.95, abs(cos(ang * 4.0))) * step(wr, 0.8);
      float hub = fill((length(we) - 0.28) * 0.2);
      vec3 wc = mix(vec3(0.17, 0.1, 0.05), vec3(0.62, 0.42, 0.2) * (0.8 + 0.3 * smoothstep(0.3, -0.3, we.x)), max(spokes, step(0.8, wr)));
      wc = mix(wc, vec3(0.98, 0.78, 0.25) * (0.8 + 0.3 * smoothstep(0.0, -0.6, we.x)), max(rim, hub));
      c = mix(c, wc, wheel);
      a = max(a, wheel);
      o = vec4(c * a, a);
    } else if (s < 1.5) {
      // a barrel pointing up: a navy cylinder with a sheen, golden bands, a flared muzzle, the bore,
      // and the knob at the back
      float y = q.y;
      float wdt = mix(0.56, 0.78, smoothstep(-0.9, 0.8, y)) + 0.14 * smoothstep(-0.72, -0.86, y);
      float body = max(abs(q.x) - wdt, abs(y - 0.0) - 0.92);
      float knob = circ(q, vec2(0.0, 0.92), 0.22);
      float a = max(fill(body * 1.5), fill(knob));
      float u = q.x / wdt;
      float cyl = sqrt(max(0.0, 1.0 - u * u));
      vec3 navy = vec3(0.12, 0.3, 0.68);
      vec3 c = navy * (0.35 + 0.8 * cyl) + vec3(0.6, 0.75, 1.0) * smoothstep(0.18, 0.0, abs(u + 0.4)) * 0.55;
      float bands = max(max(smoothstep(0.06, 0.0, abs(y + 0.78) - 0.06), smoothstep(0.05, 0.0, abs(y - 0.12) - 0.05)), smoothstep(0.05, 0.0, abs(y - 0.62) - 0.05));
      vec3 gold = vec3(1.0, 0.8, 0.3) * (0.45 + 0.75 * cyl) + vec3(1.0) * smoothstep(0.15, 0.0, abs(u + 0.4)) * 0.3;
      c = mix(c, gold, bands);
      c = mix(c, gold, fill(knob));
      float bore = fill(length((q - vec2(0.0, -0.9)) / vec2(0.42, 0.12)) - 1.0);
      c = mix(c, vec3(0.02, 0.02, 0.05), bore);
      o = vec4(c * a, a);
    } else {
      // twelve barrels in a spinning golden drum, seen from the muzzles
      float a = fill(r - 0.96);
      vec3 c = vec3(1.0, 0.78, 0.28) * (0.55 + 0.5 * smoothstep(0.6, -0.6, q.x + q.y));
      c = mix(c, vec3(0.45, 0.3, 0.08), smoothstep(0.9, 0.96, r));
      float spin = uT * 7.0;
      for (int i = 0; i < 12; i++) {
        float fi = float(i);
        float rr = i < 4 ? 0.27 : 0.66;
        float an = (i < 4 ? fi / 4.0 : (fi - 4.0) / 8.0) * 6.2832 + spin * (i < 4 ? -1.0 : 1.0);
        vec2 cp = vec2(cos(an), sin(an)) * rr;
        float d = length(q - cp);
        c = mix(c, vec3(0.16, 0.42, 0.85) * (0.6 + 0.6 * smoothstep(0.17, 0.0, length(q - cp + vec2(0.05, 0.05)))), fill(d - 0.17));
        c = mix(c, vec3(0.02, 0.02, 0.06), fill(d - 0.09));
      }
      o = vec4(c * a, a);
    }
  } else if (k < 8.5) {
    // a rolling rock
    float d = r - 0.88 - 0.06 * sin(atan(q.y, q.x) * 5.0 + s);
    if (d > 0.02) discard;
    float l = 0.55 + 0.45 * clamp(-q.x * 0.5 - q.y * 0.5 + 0.5, 0.0, 1.0);
    o = vec4(vec3(0.49, 0.47, 0.45) * l, 1.0) * smoothstep(0.02, -0.03, d);
  } else if (k < 9.5) {
    // the captains: s = which (tower: fraction = blocks left / 10); fury in vCol.a; flash in rgb
    float id = floor(s + 0.001);
    float fury = vCol.a;
    vec3 c = vec3(0.0);
    float a = 0.0;
    vec3 RED = vec3(0.8, 0.18, 0.16), GOLD = vec3(0.95, 0.76, 0.24), WHITE = vec3(0.95, 0.93, 0.88), DARK = vec3(0.18, 0.14, 0.14), SKIN = vec3(0.95, 0.79, 0.63);
    if (id < 0.5) { // drum major: a drum seen from the front, two sticks
      float body = box(q - vec2(0.0, 0.15), vec2(0.78, 0.55), 0.08);
      float zig = abs(fract((q.x + 1.0) * 2.5) - 0.5) * 2.0;
      float lace = smoothstep(0.1, 0.0, abs(zig - (q.y + 0.4) / 1.1));
      float rims = step(0.45, abs(q.y - 0.15));
      a = fill(body);
      c = mix(RED, GOLD, lace * 0.9);
      c = mix(c, WHITE, rims);
      float head = fill(length((q - vec2(0.0, -0.42)) / vec2(0.78, 0.18)) - 1.0);
      c = mix(c, vec3(0.96, 0.9, 0.75), head);
      a = max(a, head);
      for (int i = 0; i < 2; i++) {
        float sx = i == 0 ? -1.0 : 1.0;
        float ang = 0.6 * sx + 0.3 * sin(uT * 8.0 + sx);
        vec2 p = q - vec2(sx * 0.45, -0.6);
        p = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * p;
        float st = fill(box(p, vec2(0.05, 0.4), 0.05));
        float tip = fill(circ(p, vec2(0.0, -0.42), 0.1));
        c = mix(c, vec3(0.6, 0.4, 0.2), st); c = mix(c, WHITE, tip);
        a = max(a, max(st, tip));
      }
    } else if (id < 1.5) { // bugler: a red coat, a head, a golden horn
      float coat = box(q - vec2(-0.1, 0.35), vec2(0.45 - (q.y - 0.35) * 0.2, 0.55), 0.1);
      float head = circ(q, vec2(-0.1, -0.38), 0.3);
      float hat = box(q - vec2(-0.1, -0.68), vec2(0.28, 0.14), 0.04);
      vec2 hp = q - vec2(0.42, -0.3);
      float horn = max(abs(hp.y) - (0.08 + max(0.0, hp.x) * 0.55), abs(hp.x - 0.25) - 0.3);
      a = max(max(fill(coat), fill(head)), max(fill(hat), fill(horn)));
      c = RED;
      c = mix(c, WHITE, fill(box(q - vec2(-0.1, 0.35), vec2(0.05, 0.5), 0.02)) * fill(coat));
      c = mix(c, SKIN, fill(head));
      c = mix(c, DARK, fill(hat));
      c = mix(c, GOLD * (0.8 + 0.3 * sin(hp.x * 20.0)), fill(horn));
    } else if (id < 2.5) { // spinning top: a striped diamond
      float d = abs(q.x) * 1.1 + abs(q.y) * 0.95 - 0.92;
      a = fill(d);
      float st = step(0.5, fract(atan(q.y, q.x) / 6.2832 * 6.0 + uT * (2.0 + fury * 2.0)));
      c = mix(RED, WHITE, st) * (0.75 + 0.35 * (1.0 - r));
      c = mix(c, GOLD, fill(circ(q, vec2(0.0, 0.0), 0.12)));
    } else if (id < 3.5) { // tower: up to five blocks stacked, an eye in the lowest
      float left = floor(fract(s) * 10.0 + 0.5);
      for (int i = 0; i < 5; i++) {
        float fi = float(i);
        if (fi >= left) continue;
        vec2 p = q - vec2(sin(uT * 2.0 + fi) * 0.04 * fi, 0.72 - fi * 0.36);
        float ba = fill(box(p, vec2(0.4 - fi * 0.04, 0.17), 0.03));
        vec3 bc = mod(fi, 2.0) < 0.5 ? RED : vec3(0.65, 0.14, 0.13);
        bc *= 0.85 + 0.25 * smoothstep(0.1, -0.2, p.x);
        c = mix(c, bc, ba);
        a = max(a, ba);
      }
      float eye = fill(circ(q, vec2(0.0, 0.72), 0.1));
      c = mix(c, vec3(1.0, 0.9, 0.3), eye * step(0.5, left));
    } else if (id < 4.5) { // war balloon: striped envelope and a basket
      float env = length((q - vec2(0.0, -0.2)) / vec2(0.85, 0.75)) - 1.0;
      float wid = 0.3 + 0.7 * sqrt(max(0.0, 1.0 - pow((q.y + 0.2) / 0.75, 2.0)));
      float st = step(0.5, fract(q.x * 2.2 / wid + 0.25));
      float bk = box(q - vec2(0.0, 0.8), vec2(0.24, 0.14), 0.04);
      float rope = step(abs(abs(q.x) - 0.2 + (q.y - 0.55) * 0.3), 0.02) * step(0.5, q.y) * step(q.y, 0.68);
      a = max(fill(env), max(fill(bk), rope));
      c = mix(RED, WHITE * 0.9, st);
      c *= 0.7 + 0.4 * smoothstep(0.6, -0.6, q.x + q.y * 0.3);
      c = mix(c, vec3(0.55, 0.37, 0.2), max(fill(bk), rope));
    } else if (id < 5.5) { // wind-up tank: tracks, hull, turret, the key on top
      float tr = box(vec2(abs(q.x) - 0.62, q.y - 0.2), vec2(0.22, 0.62), 0.12);
      float hull = box(q - vec2(0.0, 0.2), vec2(0.5, 0.55), 0.08);
      float tur = circ(q, vec2(0.0, 0.15), 0.3);
      float gun = box(q - vec2(0.0, 0.62), vec2(0.07, 0.32), 0.03);
      a = max(max(fill(tr), fill(hull)), max(fill(tur), fill(gun)));
      float links = step(0.5, fract(q.y * 6.0 - uT * 3.0));
      c = RED * 0.9;
      c = mix(c, DARK * (0.8 + 0.4 * links), fill(tr));
      c = mix(c, vec3(0.62, 0.15, 0.14), fill(tur));
      c = mix(c, DARK, fill(gun));
      vec2 kp = q - vec2(0.0, -0.55);
      kp.x /= max(0.15, abs(cos(uT * 3.0)));
      float key = min(box(kp, vec2(0.05, 0.22), 0.03), min(circ(kp, vec2(-0.16, -0.18), 0.12), circ(kp, vec2(0.16, -0.18), 0.12)));
      c = mix(c, GOLD, fill(key));
      a = max(a, fill(key));
    } else if (id < 6.5) { // hobby-horse knight: a horse head on a stick, a lance
      float stick = box(q - vec2(0.0, 0.35), vec2(0.06, 0.6), 0.03);
      float head = length((q - vec2(-0.05, -0.4)) / vec2(0.32, 0.42)) - 1.0;
      float snout = length((q - vec2(-0.32, -0.15)) / vec2(0.2, 0.16)) - 1.0;
      float mane = box(q - vec2(0.18, -0.4), vec2(0.08, 0.36), 0.06);
      float lance = max(abs(q.x - 0.55) - 0.06 * (1.0 - (q.y + 0.9) / 1.8) - 0.02, abs(q.y) - 0.9);
      float rein = abs(length((q - vec2(-0.12, -0.12)) / vec2(0.3, 0.18)) - 1.0) - 0.08;
      a = max(max(fill(stick), fill(head)), max(max(fill(snout), fill(mane)), max(fill(lance), fill(rein))));
      c = vec3(0.6, 0.42, 0.24);
      c = mix(c, WHITE * 0.92, max(fill(head), fill(snout)));
      c = mix(c, RED, fill(mane));
      c = mix(c, vec3(0.75, 0.77, 0.8), fill(lance));
      c = mix(c, DARK, fill(circ(q, vec2(-0.12, -0.5), 0.05)));
      c = mix(c, vec3(0.2, 0.45, 0.9), fill(rein));
    } else { // the Red King: a giant red soldier, a cape, a crown of three points
      float cape = max(abs(q.x) - (0.35 + (q.y + 0.1) * 0.45), abs(q.y - 0.45) - 0.5);
      float body = box(q - vec2(0.0, 0.3), vec2(0.34, 0.45), 0.12);
      float head = circ(q, vec2(0.0, -0.38), 0.26);
      vec2 cp = q - vec2(0.0, -0.72);
      float band = max(abs(cp.y) - 0.08, abs(cp.x) - 0.3);
      float pts = max(abs(fract(cp.x * 1.67 + 0.5) - 0.5) * 0.9 + cp.y + 0.05, max(abs(cp.x) - 0.3, -cp.y - 0.3));
      float crown = min(band, pts);
      a = max(max(fill(cape), fill(body)), max(fill(head), fill(crown)));
      c = vec3(0.5, 0.08, 0.1);
      c = mix(c, RED, fill(body));
      c = mix(c, WHITE, fill(box(q - vec2(0.0, 0.3), vec2(0.34, 0.04), 0.02)) * fill(body));
      c = mix(c, SKIN, fill(head));
      c = mix(c, GOLD, fill(crown));
    }
    if (a < 0.03) discard;
    c *= vCol.rgb;
    c = mix(c, c * vec3(1.5, 0.55, 0.5) + vec3(0.12, 0.0, 0.0), fury * 0.55);
    o = vec4(c * a, a);
  } else if (k < 10.5) {
    vec2 p = abs(q);
    float aa = smoothstep(1.0, 0.92, max(p.x, p.y));
    o = vec4(vCol.rgb * vCol.a * aa, vCol.a * aa);
  } else if (k < 11.5) {
    float a = smoothstep(1.0, 0.2, r) * vCol.a;
    o = vec4(vCol.rgb * a, a);
  } else {
    // a bomb with a burning fuse
    float fuse = smoothstep(0.08, 0.0, abs(q.x - 0.3 - (q.y + 0.8) * 0.3)) * step(-1.0, q.y) * step(q.y, -0.6);
    float a = max(fill(r - 0.8), fuse);
    vec3 c = vec3(0.12) + vec3(0.35) * smoothstep(0.5, 0.0, length(q - vec2(-0.3, -0.3)));
    c = mix(c, vec3(1.0, 0.7, 0.3), fuse);
    o = vec4(c * a, a) * vCol.a;
  }
  gl_FragColor = o;
}`;

const VS_QUAD = `
attribute vec2 aPos;
varying vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

/** The sand lane between rock walls; at the top, the gorge the red river comes down. */
const FS_BG = `${HEAD}
uniform vec2 uRes; uniform float uT; uniform float uOx; uniform float uOy; uniform float uPw; uniform float uTop; uniform float uMouth; uniform float uLook; uniform float uFog; uniform float uWin; uniform float uLine;
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
  vec2 f = vec2((px.x - uOx) / uPw, (px.y - uOy) / uPw);
  vec3 sand = vec3(0.91, 0.79, 0.54), rock = vec3(0.45, 0.47, 0.52);
  if (uLook > 0.5 && uLook < 1.5) { sand = vec3(0.88, 0.68, 0.48); rock = vec3(0.55, 0.36, 0.3); }
  else if (uLook > 1.5 && uLook < 2.5) { sand = vec3(0.82, 0.76, 0.62); rock = vec3(0.42, 0.42, 0.42); }
  else if (uLook > 2.5 && uLook < 3.5) { sand = vec3(0.86, 0.74, 0.56); rock = vec3(0.5, 0.42, 0.38); }
  else if (uLook > 3.5 && uLook < 4.5) { sand = vec3(0.9, 0.83, 0.62); rock = vec3(0.47, 0.5, 0.48); }
  else if (uLook > 4.5 && uLook < 5.5) { sand = vec3(0.74, 0.74, 0.7); rock = vec3(0.4, 0.42, 0.46); }
  else if (uLook > 5.5 && uLook < 6.5) { sand = vec3(0.8, 0.62, 0.45); rock = vec3(0.36, 0.3, 0.3); }
  else if (uLook > 6.5) { sand = vec3(0.93, 0.8, 0.5); rock = vec3(0.4, 0.33, 0.3); }
  float n = fbm(f * 7.0);
  vec3 c = sand * (0.9 + 0.15 * n) + (hash(floor(f * 220.0)) - 0.5) * 0.04;
  c *= 1.0 - 0.05 * smoothstep(0.6, 1.0, noise(vec2(f.x * 30.0, f.y * 3.0)));
  // the side walls: cliff faces with a strip of grass
  float wall = smoothstep(0.035, 0.025, f.x) + smoothstep(0.965, 0.975, f.x);
  float grass = smoothstep(0.03, 0.045, f.x) * smoothstep(0.06, 0.045, f.x) + smoothstep(0.97, 0.955, f.x) * smoothstep(0.94, 0.955, f.x);
  c = mix(c, vec3(0.35, 0.6, 0.3) * (0.8 + 0.4 * noise(f * 90.0)), grass * 0.8);
  vec3 cliff = rock * (0.7 + 0.4 * fbm(f * vec2(10.0, 3.0))) * (0.8 + 0.2 * step(0.5, fract(f.y * 6.0 + noise(f * 4.0))));
  c = mix(c, cliff, clamp(wall, 0.0, 1.0));
  // the gorge above the lane: rock everywhere but a winding channel that follows the river's mouth
  if (f.y < uTop) {
    float k = (uTop - f.y) / uTop;
    float centre = uMouth + sin(f.y * 9.0 + 1.3) * 0.12 * k;
    float hw = 0.17 + 0.05 * (1.0 - k);
    float ch = smoothstep(hw, hw - 0.03, abs(f.x - centre));
    vec3 top = rock * (0.65 + 0.45 * fbm(f * vec2(6.0, 4.0) + 4.0));
    top *= 1.0 - 0.35 * smoothstep(hw + 0.12, hw, abs(f.x - centre)) * (1.0 - ch);
    c = mix(top, sand * 0.85, ch);
    c *= 0.8 + 0.2 * (1.0 - k);
  }
  // the cannon's line
  c = mix(c, vec3(0.55, 0.2, 0.15), smoothstep(0.004, 0.0, abs(f.y - uLine)) * 0.35 * step(0.04, f.x) * step(f.x, 0.96));
  float fog = fbm(f * 3.0 + vec2(uT * 0.1, 0.0));
  c = mix(c, vec3(0.86, 0.88, 0.9), uFog * smoothstep(0.2, 0.8, fog) * 0.85);
  c = mix(c, c * 1.1 + vec3(0.03, 0.05, 0.1), uWin);
  vec2 v = vUv - 0.5;
  c *= 1.0 - dot(v, v) * 0.7;
  gl_FragColor = vec4(c, 1.0);
}`;

const FS_BLIT = `
precision mediump float;
uniform sampler2D uTex; uniform float uFlash; uniform vec3 uFlashCol; uniform float uHurt;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(uTex, vUv).rgb;
  vec2 v = vUv - 0.5;
  c += vec3(0.9, 0.12, 0.1) * smoothstep(0.3, 0.75, length(v)) * uHurt * 0.8;
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

/** Colour of a gate: blue for ×, green for +, gold when big. */
export function gateColor(b: Block): [number, number, number] {
  if (b.kind === 'add') return [0.3, 0.72, 0.4];
  return b.n >= 5 ? [0.98, 0.78, 0.2] : [0.25, 0.55, 0.95];
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
  win = 0;
  danger = false;
  pixelRatio = 1;
  ox = 0;
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

  /** kind: 0 glow dust, 3/4 a soldier knocked flying, 11 smoke */
  burst(x: number, y: number, n: number, col: [number, number, number], speed: number, size: number, life = 0.7, grav = 0, kind = 0): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = speed * (0.3 + Math.random() * 0.7);
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, max: life, size: size * (0.5 + Math.random()), r: col[0], g: col[1], b: col[2], kind, grav });
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
    this.win = 0;
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

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.viewport(0, 0, this.fw, this.fh);
    gl.useProgram(this.bg);
    gl.disable(gl.BLEND);
    this.bindQuad(this.bg);
    const u = (n: string) => gl.getUniformLocation(this.bg, n);
    gl.uniform2f(u('uRes'), this.W, this.H);
    gl.uniform1f(u('uT'), time % 1000);
    gl.uniform1f(u('uOx'), this.ox);
    gl.uniform1f(u('uPw'), this.pw);
    gl.uniform1f(u('uOy'), this.oy);
    gl.uniform1f(u('uTop'), w.top);
    gl.uniform1f(u('uMouth'), w.mouth);
    gl.uniform1f(u('uLook'), w.level.look);
    gl.uniform1f(u('uFog'), Math.min(1, w.fog));
    gl.uniform1f(u('uWin'), this.win);
    gl.uniform1f(u('uLine'), w.bottom);
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
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    this.flash = Math.max(0, this.flash - dt * 2.5);

    this.n = 0;

    // the blocks: gates (a glowing panel) and crates (wood)
    for (const b of w.blocks) {
      if (b.gone) continue;
      const e = b.enter;
      const bx = X(b.cx), by = Y(w.laneY(b.y) - (1 - e) * 0.3);
      if (b.kind === 'box') {
        const h = b.giant ? BOX_H * 1.5 : BOX_H;
        const ar = b.w / h;
        const look = b.golden ? 1 : b.giant ? 2 : b.up ? 0 : 3;
        this.push(bx + s * 0.006, by + s * 0.01, s * h * 0.6, 0, 0, 0, 0.3, 11, 0, 0, ar);
        this.push(bx, by, s * h / 2, b.flash * 0.5, b.flash * 0.4, b.flash * 0.3, ar, 5, look, 0, ar);
        if (b.golden || b.giant) this.push(bx, by, s * b.w * 0.6, 1, 0.8, 0.3, 0.2 + 0.1 * Math.sin(time * 6), 0);
      } else {
        const [r, g, bb] = gateColor(b);
        const hh = 0.034;
        const ar = b.w / (hh * 2);
        this.push(bx, by + s * 0.012, s * hh * 1.1, 0, 0, 0, 0.28, 11, 0, 0, ar * 0.95);
        this.push(bx, by, s * b.w * 0.6, r, g, bb, 0.14 + b.flash * 0.35, 0);
        this.push(bx, by, s * hh, r, g, bb, ar, 6, b.flash, 0, ar);
      }
    }

    // telegraphs and attacks
    let danger = false;
    for (const h of w.hazards) {
      this.drawHazard(w, h, time, X, Y);
      if (h.kind === 'drop' && h.y < w.cannonY && Math.abs(h.x - w.cannon.x) < h.w / 2 + 0.03) danger = true;
      if (h.kind === 'beam' && Math.abs(h.x - w.cannon.x) < h.w / 2 + 0.02) danger = true;
      if ((h.kind === 'band' || h.kind === 'wall') && !h.gaps.some((g) => Math.abs(w.cannon.x - g) < h.gapW / 2)) danger = true;
    }
    this.danger = danger;

    // the red army, then the blue soldiers
    const us = UNIT_R * s * 2.7;
    const R = w.red;
    for (let i = 0; i < R.n; i++) {
      const bob = Math.sin(time * 12 + R.seed[i] * 30) * 0.1;
      this.push(X(R.x[i]), Y(R.y[i]), us, 1, 1, 1, 1, 4, 0, R.vx[i] * 2 + bob);
    }
    const B = w.blue;
    for (let i = 0; i < B.n; i++) {
      const bob = Math.sin(time * 12 + B.seed[i] * 30) * 0.1;
      this.push(X(B.x[i]), Y(B.y[i]), us * (B.hp[i] > 1 ? 1.15 : 1), 1, 1, 1, 1, 3, B.hp[i] > 1 ? 0.2 : 0, B.vx[i] * 1.5 + bob);
    }

    this.drawBoss(w, time, X, Y);

    // particles
    for (const p of this.particles) {
      p.life -= dt;
      p.vy += p.grav * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 1 - dt * 1.8; p.vy *= 1 - dt * 1.2;
      const k = Math.max(0, p.life / p.max);
      if (p.kind === 2) this.push(X(p.x), Y(p.y), s * p.size * (1.6 - k), p.r, p.g, p.b, k, 2);
      else if (p.kind === 3 || p.kind === 4) this.push(X(p.x), Y(p.y), s * p.size, 1, 1, 1, k, p.kind, 1, p.life * 12);
      else if (p.kind === 11) this.push(X(p.x), Y(p.y), s * p.size * (1.4 - k * 0.4), p.r, p.g, p.b, k * 0.6, 11);
      else this.push(X(p.x), Y(p.y), s * p.size * (0.4 + k), p.r, p.g, p.b, k, 0);
    }
    this.particles = this.particles.filter((p) => p.life > 0);

    // the Bocão
    const C = w.cannon;
    const cx = X(C.x), cy = Y(w.cannonY);
    if (danger) {
      const k = 0.5 + 0.5 * Math.sin(time * 24);
      this.push(cx, cy, s * 0.12, 1, 0.15, 0.1, 0.3 + 0.3 * k, 0);
      this.push(cx, cy, s * 0.1, 1, 0.25, 0.2, 0.9, 2);
    }
    const blink = w.inv > 0 && Math.floor(time * 14) % 2 === 0;
    if (!blink) {
      this.push(cx, cy + s * 0.035, s * 0.09, 0, 0, 0, 0.35, 11, 0, 0, 1.3);
      // the carriage first, then the barrels on top of it
      this.push(cx, cy + s * 0.008, s * 0.082, 1, 1, 1, 1, 7, 0);
      const n = w.barrels;
      const rec = C.recoil * s * 0.008;
      if (n >= 12) {
        this.push(cx, cy - s * 0.035 + rec, s * 0.06, 1, 1, 1, 1, 7, 2);
      } else {
        const fan = w.kit.fan ? 0.45 : 0;
        const gap = n > 1 ? 0.032 : 0;
        for (let i = 0; i < n; i++) {
          const off = n > 1 ? i / (n - 1) - 0.5 : 0;
          const a = off * fan;
          this.push(cx + off * s * gap * (n - 1) + Math.sin(a) * s * 0.03, cy - s * 0.04 + rec, s * 0.062, 1, 1, 1, 1, 7, 1, a, n > 2 ? 0.36 : n > 1 ? 0.44 : 0.52);
        }
      }
      if (C.recoil > 0.8 && Math.random() < 0.2) this.burst(C.x, w.cannonY - 0.1, 1, [1, 1, 1], 0.05, 0.012, 0.35, 0, 11);
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

  /** Where the weak point is drawn (field coordinates). */
  static weakSpot(b: Boss): [number, number] {
    const R = b.def.r * 1.05;
    return [b.x + b.weakDx, b.id === 3 ? b.y + R * 0.72 : b.id === 7 ? b.y - R * 0.72 : b.y];
  }

  private drawBoss(w: World, time: number, X: (x: number) => number, Y: (y: number) => number): void {
    const s = this.pw;
    const b: Boss | null = w.boss;
    if (!b || w.done === 'win') return;
    const intro = b.intro > 0 ? Math.min(1, (2.6 - b.intro) / 1.2) : 1;
    const drop = (1 - intro) * 0.25;
    const bx = X(b.x), by = Y(b.y - drop);
    const R = s * b.def.r * 1.05;
    const fury = b.fury ? 0.6 + 0.4 * Math.sin(time * 9) : 0;
    const tellK = b.tell > 0 ? 0.5 + 0.5 * Math.sin(time * 30) : 0;
    this.push(bx, by + R * 0.9, R * 1.1, 0, 0, 0, 0.35, 11, 0, 0, 1.4);
    this.push(bx, by, R * 1.7, 1, 0.3, 0.25, 0.08 + tellK * 0.25 + fury * 0.15, 0);
    const t = 1 + b.flash * 0.6;
    this.push(bx, by, R, t, t, t, fury, 9, b.id === 3 ? 3 + b.blocks / 10 : b.id);
    // the armour plate in the middle (soldiers bounce off it)
    if (b.def.armor > 0) this.push(bx, by + R * 0.2, s * b.def.armor, 0.62, 0.65, 0.7, 0.55, 10, 0, 0, 0.35);
    // the weak point: a target that lights up when it shows
    const open = b.open > 0 || b.always;
    const [wxf, wyf] = Renderer.weakSpot(b);
    const wx = X(wxf), wy = Y(wyf - drop);
    if (open) {
      const k = 0.6 + 0.4 * Math.sin(time * 14);
      this.push(wx, wy, s * b.def.weakR * 1.6, 1, 0.95, 0.5, 0.35 * k, 0);
      this.push(wx, wy, s * b.def.weakR * 1.1, 1, 1, 0.7, 0.9, 2);
      this.push(wx, wy, s * b.def.weakR * 0.5, 1, 1, 0.8, 0.8 * k, 1);
    } else this.push(wx, wy, s * b.def.weakR * 0.9, 0.6, 0.6, 0.6, 0.35, 2);
  }

  private drawHazard(w: World, h: Hazard, time: number, X: (x: number) => number, Y: (y: number) => number): void {
    const s = this.pw;
    const blink = 0.55 + 0.45 * Math.sin(time * 18);
    const red: [number, number, number] = [1, 0.18, 0.15];
    if (h.kind === 'drop' || h.kind === 'beam') {
      const lit = h.kind === 'beam' && h.warn <= 0;
      if (h.warn > 0 || lit) {
        // a red column down to the cannon (or, lit, the beam itself)
        const top = w.top, bot = w.cannonY + 0.05, mid = (top + bot) / 2, half = (bot - top) / 2;
        const col: [number, number, number] = lit ? (h.look === 7 ? [1, 0.85, 0.35] : h.look === 2 ? [1, 0.75, 0.4] : [0.85, 0.9, 1]) : red;
        this.push(X(h.x), Y(mid), s * h.w / 2, col[0], col[1], col[2], lit ? 0.75 : 0.12 + 0.12 * blink, 10, 0, Math.PI / 2, (2 * half) / h.w);
        if (lit) this.push(X(h.x), Y(mid), s * h.w * 1.2, col[0], col[1], col[2], 0.45, 0, 0, Math.PI / 2, (2 * half) / (h.w * 2.4));
        else this.push(X(h.x), Y(w.cannonY), s * h.w * 0.55, red[0], red[1], red[2], 0.35 * blink, 2);
        return;
      }
      if (h.kind === 'beam') return;
      const x = X(h.x), y = Y(h.y), r = s * h.w * 0.55;
      const near = Math.max(0, 1 - Math.abs(w.cannonY - h.y) / 0.6);
      this.push(x, Y(w.cannonY), s * h.w * 0.5 * (0.5 + near), 0, 0, 0, 0.25 + 0.35 * near, 11);
      if (h.look === 1) this.push(x, y, r, 1, 1, 1, 1, 8, h.x * 7, time * 4);
      else if (h.look === 4 || h.look === 5) this.push(x, y, r * 0.8, 1, 1, 1, 1, 12, 0, time * 3);
      else if (h.look === 3) this.push(x, y, r * 0.5, 0.6, 0.05, 0.05, 2.2, 5, 3, 0, 2.2);
      else if (h.look === 8) this.push(x, y, r * 0.75, 1, 1, 1, 0, 9, 2);
      else { this.push(x, y - r * 0.2, r * 0.9, 0.62, 0.42, 0.22, 1, 10, 0, Math.PI / 2, 0.12); this.push(x, y + r * 0.7, r * 0.22, 0.95, 0.93, 0.88, 1, 1); }
      return;
    }
    // band (on the cannon's line) or wall (coming down): red everywhere except the gaps
    const y = h.kind === 'band' ? w.cannonY : h.y;
    const thick = h.kind === 'band' ? 0.035 : 0.03;
    const active = h.warn <= 0;
    const col: [number, number, number] = h.look === 4 ? [0.9, 0.3, 0.25] : h.look === 6 ? [0.6, 0.42, 0.25] : [1, 0.42, 0.18];
    const edges = [0.03];
    for (const g of [...h.gaps].sort((a, b) => a - b)) edges.push(g - h.gapW / 2, g + h.gapW / 2);
    edges.push(0.97);
    for (let i = 0; i < edges.length; i += 2) {
      const a = Math.max(0.03, edges[i]), b = Math.min(0.97, edges[i + 1]);
      if (b <= a) continue;
      const cx = (a + b) / 2, half = (b - a) / 2;
      if (!active) this.push(X(cx), Y(y), s * thick, red[0], red[1], red[2], 0.2 + 0.25 * blink, 10, 0, 0, half / thick);
      else {
        this.push(X(cx), Y(y), s * thick, col[0], col[1], col[2], 0.9, 10, 0, 0, half / thick);
        this.push(X(cx), Y(y), s * thick * 2.5, col[0], col[1], col[2], 0.35, 0, 0, 0, half / (thick * 2.5));
      }
    }
    if (h.kind === 'wall' && !active) this.push(X(0.5), Y(w.top + 0.02), s * 0.02, red[0], red[1], red[2], 0.4 * blink, 10, 0, 0, 0.47 / 0.02);
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
